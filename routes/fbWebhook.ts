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
import fetch from "node-fetch";
import dotenv from "dotenv";
import Lead from "../models/lead.model"; // 🧩 Mongoose model for leads
import { normalizePhone } from "../services/phone";

dotenv.config();
const router = express.Router();

/**
 * ✅ Facebook Webhook Verification Route
 * Called once when you connect the webhook URL in FB App dashboard
 */
router.get("/", (req: Request, res: Response) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.FB_VERIFY_TOKEN) {
      console.log("✅ Facebook Webhook verified successfully!");
      return res.status(200).send(challenge);
    } else {
      console.warn("❌ Webhook verification failed — invalid token.");
      return res.sendStatus(403);
    }
  } catch (error) {
    console.error("❌ Verification error:", error);
    return res.sendStatus(500);
  }
});

/**
 * ✅ Facebook Lead Webhook Receiver
 * This route automatically receives real-time leads from Facebook Lead Forms
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const entries = req.body.entry || [];

    // 🟢 Facebook expects quick ACK (200 OK) to prevent retry
    res.sendStatus(200);

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        if (change.field !== "leadgen") continue;

        const leadgenId = change.value.leadgen_id;

        // 🔗 Fetch full lead data from Facebook Graph API
        const url = `https://graph.facebook.com/v23.0/${leadgenId}?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}&fields=field_data,created_time,ad_id,form_id,ad_name,adset_name,campaign_name,platform`;

        let leadData: any;
        try {
          const response = await fetch(url);
          if (!response.ok) {
            const txt = await response.text();
            console.error("⚠️ FB fetch failed:", response.status, txt);
            continue;
          }
          leadData = await response.json();
        } catch (err) {
          console.error("⚠️ FB fetch network error:", err);
          continue;
        }

        // 🧩 Convert FB field_data array → key:value object
        const fields: Record<string, any> = {};
        for (const f of leadData.field_data || []) {
          fields[f.name] = f.values?.[0] ?? "";
        }

        // ✅ Extract important info (fallbacks included)
        const fullName = fields.full_name || fields.name || "Unknown User";
        const email = fields.email || null;
        const rawPhone = fields.phone_number || fields.phone || null;
        const phone = normalizePhone(rawPhone);
        const phoneVerified =
          fields.phone_number_verified === "true" ? true : false;

        // 🎯 Check if lead already exists (deduplication)
        let existing = null;
        if (phone) existing = await Lead.findOne({ phone });
        if (!existing && email) existing = await Lead.findOne({ email });

        if (existing) {
          // 🔁 Update existing lead with missing or new info
          if (!existing.phone && phone) existing.phone = phone;
          if (!existing.email && email) existing.email = email;
          if (phoneVerified) existing.phoneVerified = true;

          // Update extra fields dynamically
          existing.extraFields = {
            ...existing.extraFields,
            ...fields,
          };

          existing.rawData = leadData;
          await existing.save();
          console.log("📩 Updated existing lead:", String((existing as any)._id));

        } else {
          // 🆕 Save new lead in DB
          await Lead.create({
            fullName,
            email,
            phone,
            phoneVerified,
            source: "facebook",
            extraFields: fields, // 🧩 Save all dynamic form fields
            rawData: leadData, // Raw FB payload for reference
          });

          console.log("🆕 New Facebook lead saved:", email || phone);
        }
      }
    }
  } catch (err) {
    console.error("❌ FB webhook top-level error:", err);
  }
});

export default router;
