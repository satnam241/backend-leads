// import express, { Request, Response } from "express";
// import fetch from "node-fetch";
// import Lead from "../models/lead.model";
// import { normalizePhone } from "../services/phone";

// const router = express.Router();

// // ✅ FB Webhook verification
// router.get("/", (req: Request, res: Response) => {
//   const mode = req.query["hub.mode"];
//   const token = req.query["hub.verify_token"];
//   const challenge = req.query["hub.challenge"];

//   if (mode === "subscribe" && token === process.env.FB_VERIFY_TOKEN) {
//     console.log("✅ Facebook Webhook verified");
//     return res.status(200).send(challenge);
//   }
//   return res.sendStatus(403);
// });

// // ✅ FB Lead webhook POST
// router.post("/", async (req: Request, res: Response) => {
//   try {
//     const entries = req.body.entry || [];

//     // Respond 200 immediately to FB
//     res.sendStatus(200);

//     for (const entry of entries) {
//       for (const change of entry.changes || []) {
//         if (change.field !== "leadgen") continue;

//         const leadgenId = change.value.leadgen_id;
//         const url = `https://graph.facebook.com/v23.0/${leadgenId}?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}&fields=field_data,created_time,ad_id,form_id`;

//         let leadData: any;
//         try {
//           const response = await fetch(url);
//           if (!response.ok) {
//             const txt = await response.text();
//             console.error("FB fetch failed:", response.status, txt);
//             continue;
//           }
//           leadData = await response.json();
//         } catch (err) {
//           console.error("FB fetch error:", err);
//           continue;
//         }

//         // Map FB fields
//         const fields: Record<string, any> = {};
//         for (const f of leadData.field_data || []) {
//           fields[f.name] = f.values?.[0] ?? "";
//         }

//         const fullName = fields.full_name || fields.name || "Unknown User";
//         const email = fields.email || null;
//         const rawPhone = fields.phone_number || fields.phone || null;
//         const phone = normalizePhone(rawPhone);
//         const phoneVerified = (fields.phone_number_verified === "true") || false;

//         // Deduplicate by phone first, then email
//         let existing = null;
//         if (phone) existing = await Lead.findOne({ phone });
//         if (!existing && email) existing = await Lead.findOne({ email });

//         if (existing) {
//           if (!existing.phone && phone) existing.phone = phone;
//           if (!existing.email && email) existing.email = email;
//           if (phoneVerified) existing.phoneVerified = true;
//           existing.whenAreYouPlanningToPurchase =
//             existing.whenAreYouPlanningToPurchase || fields.when_are_you_planning_to_purchase || null;
//           existing.whatIsYourBudget =
//             existing.whatIsYourBudget || fields.what_is_your_budget || null;
//           existing.rawData = leadData;
//           await existing.save();
//           console.log("Updated existing lead:", existing._id.toString());
//         } else {
//           await Lead.create({
//             fullName,
//             email,
//             phone,
//             phoneVerified,
//             whenAreYouPlanningToPurchase: fields.when_are_you_planning_to_purchase || null,
//             whatIsYourBudget: fields.what_is_your_budget || null,
//             source: "facebook",
//             rawData: leadData,
//           });
//           console.log("Saved new FB lead:", email || phone);
//         }
//       }
//     }
//   } catch (err) {
//     console.error("❌ FB webhook top-level error:", err);
//   }
// });

// export default router;


import express, { Request, Response } from "express";
import Lead from "../models/lead.model";
import { normalizePhone } from "../services/phone";
import fetchWithRetry from "../services/fetchWithRetry";
import dotenv from "dotenv";
const router = express.Router();
dotenv.config();
// 🔹 Environment Variables
const FB_VERSION = process.env.FB_GRAPH_VERSION || "v20.0";
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;


// 🔹 Safety checks
if (!PAGE_TOKEN) console.log("⚠️ Missing FB_PAGE_ACCESS_TOKEN in .env");
if (!VERIFY_TOKEN) console.log("⚠️ Missing FB_VERIFY_TOKEN in .env");


router.get("/facebook", (req: Request, res: Response) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // 🧠 Debug log to always see incoming params
    console.log("📩 Webhook verification attempt:", { mode, token, challenge });

    // ✅ Case 1 — Facebook verification request
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Facebook webhook verified successfully!");
      return res.status(200).send(challenge);
    }

    // ⚠️ Case 2 — Missing params (like when Postman/Render just pings the route)
    if (!mode && !token && !challenge) {
      return res
        .status(200)
        .send("✅ Facebook Webhook endpoint is live. Please verify using hub params.");
    }

    // ❌ Case 3 — Invalid verify token
    console.warn("❌ Webhook verification failed (invalid verify token)");
    return res
      .status(403)
      .send("❌ Invalid verify token or missing params. Check your .env VERIFY_TOKEN.");
  } catch (err) {
    console.error("❌ Webhook verification error:", err);
    return res.status(500).send("Internal server error during verification");
  }
});


/**
 * ===========================================================
 * ✅ STEP 2 — RECEIVE WEBHOOK EVENTS (POST)
 * ===========================================================
 * Facebook sends POST requests when a new lead is generated.
 * The payload contains leadgen_id, form_id, and page_id.
 */
router.post("/facebook", async (req: Request, res: Response) => {
  try {
    // Always respond immediately to prevent retries
    res.sendStatus(200);

    const entries = req.body?.entry ?? [];
    if (!entries.length) {
      console.warn("⚠️ No 'entry' data in webhook payload");
      return;
    }

    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        if (change?.field !== "leadgen") continue;

        const { leadgen_id: leadgenId, form_id: formId, page_id: pageId } = change.value || {};

        if (!leadgenId) {
          console.warn("⚠️ leadgen_id missing — skipping this event.");
          continue;
        }

        console.log("📥 Incoming lead event:", { leadgenId, formId, pageId });

        // 🧠 Prevent duplicate lead saves
        const existing = await Lead.findOne({ "rawData.id": leadgenId });
        if (existing) {
          console.log("↩️ Duplicate lead ignored:", leadgenId);
          continue;
        }

        // 🧠 Fetch full lead data from Facebook Graph API
        const url = `https://graph.facebook.com/${FB_VERSION}/${leadgenId}?access_token=${PAGE_TOKEN}`;

        let leadData: any;
        try {
          leadData = await fetchWithRetry(url, 3, 800);
          console.log("✅ Lead data fetched:", leadData);
        } catch (err: any) {
          console.error(`❌ Fetch failed for lead ${leadgenId}:`, err.message);
          continue;
        }
        

        if (!leadData?.field_data) {
          console.error("❌ Lead data empty or invalid for:", leadgenId);
          continue;
        }

        // 🧩 Transform field_data → key:value object
        const fields: Record<string, any> = {};
        for (const f of leadData.field_data) {
          const key = (f.name || "").trim().replace(/[^\w]/g, "_").toLowerCase();
          fields[key] = f.values?.[0] ?? "";
        }

        // 📧 & 📞 Extract key data
        const email = fields.email || null;
        const rawPhone = fields.phone_number || fields.phone || null;
        const phone = rawPhone ? normalizePhone(rawPhone) : null;

        // 🧠 Deduplicate based on phone/email
        let existingLead = null;
        if (phone) existingLead = await Lead.findOne({ phone });
        if (!existingLead && email) existingLead = await Lead.findOne({ email });

        if (existingLead) {
          // ♻️ Update existing record
          existingLead.extraFields = { ...existingLead.extraFields, ...fields };
          existingLead.rawData = leadData;
          existingLead.source = "facebook";
          existingLead.formId = formId || existingLead.formId;

          if (!existingLead.phone && phone) existingLead.phone = phone;
          if (!existingLead.email && email) existingLead.email = email;

          await existingLead.save();
          console.log("♻️ Updated existing lead:", existingLead._id);
        } else {
          // 🆕 Create new record
          const newLead = await Lead.create({
            fullName: fields.full_name || fields.name || "Unknown",
            email,
            phone,
            phoneVerified: fields.phone_number_verified === "true",
            source: "facebook",
            formId,
            extraFields: fields,
            rawData: leadData,
            status: "new",
            receivedAt: new Date(),
          });

          console.log("🆕 New Facebook lead saved:", newLead._id);
        }
      }
    }
  } catch (error: any) {
    console.error("❌ Facebook webhook processing error:", error.message || error);
  }
});

export default router;
