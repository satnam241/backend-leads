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

const router = express.Router();
const FB_VERSION = process.env.FB_GRAPH_VERSION || "v23.0";
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;

if (!PAGE_TOKEN) {
  console.warn("⚠️ Warning: FB_PAGE_ACCESS_TOKEN not set in env.");
}

router.get("/facebook", (req: Request, res: Response) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (!mode && !token) {
      // Facebook sometimes calls with empty body
      return res.sendStatus(200);
    }

    if (mode === "subscribe" && token?.toString().trim() === VERIFY_TOKEN?.trim()) {
      console.log("✅ Webhook verified");
      return res.status(200).send(challenge);
    } else {
      console.warn("❌ Webhook verification failed");
      return res.sendStatus(403);
    }
  } catch (err) {
    console.error("❌ Verification error:", err);
    return res.sendStatus(500);
  }
});

router.post("/facebook", async (req: Request, res: Response) => {
  try {
    const entries = req.body?.entry ?? [];

    // Respond immediately as FB expects quick 200
    res.sendStatus(200);

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== "leadgen") continue;

        const leadgenId = change.value?.leadgen_id;
        const formId = change.value?.form_id;
        const pageId = change.value?.page_id;

        if (!leadgenId) {
          console.warn("⚠️ Missing leadgen_id in change.value, skipping");
          continue;
        }

        console.log("📩 New lead event:", { leadgenId, formId, pageId });

        // Avoid duplicate processing if already stored with same leadgenId
        const existingByLeadgen = await Lead.findOne({ "rawData.id": leadgenId }).lean();
        if (existingByLeadgen) {
          console.log("↩️ Duplicate leadgen_id detected, skipping:", leadgenId);
          continue;
        }

        // Fetch lead details from Graph API
        const url = `https://graph.facebook.com/${FB_VERSION}/${leadgenId}?access_token=${PAGE_TOKEN}`;

        const leadData = await fetchWithRetry(url, 3, 500);
        if (!leadData) {
          console.error("❌ Could not fetch lead data for", leadgenId);
          continue;
        }

        // Normalize field_data into key:value
        const rawFields: Record<string, any> = {};
        for (const f of leadData.field_data || []) {
          const safeKey = (f.name || "field")
            .toString()
            .trim()
            .replace(/[^\w]/g, "_")
            .toLowerCase();
          rawFields[safeKey] = f.values?.[0] ?? "";
        }

        const email = rawFields.email || null;
        const rawPhone = rawFields.phone_number || rawFields.phone || null;
        const phone = rawPhone ? normalizePhone(rawPhone) : null;

        // Deduplication by phone/email
        let existingLead = null;
        if (phone) existingLead = await Lead.findOne({ phone });
        if (!existingLead && email) existingLead = await Lead.findOne({ email });

        if (existingLead) {
          // Update existing
          existingLead.extraFields = { ...existingLead.extraFields, ...rawFields };
          existingLead.rawData = leadData;
          existingLead.source = "facebook";
          existingLead.formId = formId || existingLead.formId;
          if (!existingLead.phone && phone) existingLead.phone = phone;
          if (!existingLead.email && email) existingLead.email = email;

          await existingLead.save();
          console.log("♻️ Updated existing lead:", existingLead._id);
        } else {
          // Create new lead
          const leadDoc = await Lead.create({
            fullName: rawFields.name || rawFields.full_name || "Unknown",
            email,
            phone,
            phoneVerified: rawFields.phone_number_verified === "true",
            source: "facebook",
            formId,
            extraFields: rawFields,
            rawData: leadData,
            receivedAt: new Date()
          });
          console.log("🆕 New lead saved:", leadDoc._id);
        }
      }
    }
  } catch (err) {
    console.error("❌ FB webhook processing error:", err);
  }
});

export default router;

