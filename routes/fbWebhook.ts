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
import Lead from "../models/lead.model";
import { normalizePhone } from "../services/phone";

dotenv.config();
const router = express.Router();

// ✅ Facebook Webhook Verification (GET)
router.get("/", (req: Request, res: Response) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.FB_VERIFY_TOKEN) {
      console.log("✅ Facebook Webhook verified successfully!");
      return res.status(200).send(challenge);
    } else {
      console.warn("❌ Webhook verification failed!");
      return res.sendStatus(403);
    }
  } catch (error) {
    console.error("❌ Verification error:", error);
    return res.sendStatus(500);
  }
});

// ✅ Facebook Lead Webhook Receiver (POST)
router.post("/", async (req: Request, res: Response) => {
  try {
    const entries = req.body.entry || [];

    // Facebook expects a quick 200 OK to avoid timeout
    res.sendStatus(200);

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        if (change.field !== "leadgen") continue;

        const leadgenId = change.value.leadgen_id;
        const url = `https://graph.facebook.com/v23.0/${leadgenId}?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}&fields=field_data,created_time,ad_id,form_id`;

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

        // 🧩 Map Facebook fields
        const fields: Record<string, any> = {};
        for (const f of leadData.field_data || []) {
          fields[f.name] = f.values?.[0] ?? "";
        }

        const fullName = fields.full_name || fields.name || "Unknown User";
        const email = fields.email || null;
        const rawPhone = fields.phone_number || fields.phone || null;
        const phone = normalizePhone(rawPhone);
        const phoneVerified = (fields.phone_number_verified === "true") || false;

        // 🧩 Try to find existing lead by phone or email
        let existing = null;
        if (phone) existing = await Lead.findOne({ phone });
        if (!existing && email) existing = await Lead.findOne({ email });

        if (existing) {
          if (!existing.phone && phone) existing.phone = phone;
          if (!existing.email && email) existing.email = email;
          if (phoneVerified) existing.phoneVerified = true;
          existing.whenAreYouPlanningToPurchase =
            existing.whenAreYouPlanningToPurchase ||
            fields.when_are_you_planning_to_purchase ||
            null;
          existing.whatIsYourBudget =
            existing.whatIsYourBudget ||
            fields.what_is_your_budget ||
            null;
          existing.rawData = leadData;
          await existing.save();
          console.log("🔁 Updated existing lead:", existing._id.toString());
        } else {
          await Lead.create({
            fullName,
            email,
            phone,
            phoneVerified,
            whenAreYouPlanningToPurchase:
              fields.when_are_you_planning_to_purchase || null,
            whatIsYourBudget:
              fields.what_is_your_budget || null,
            source: "facebook",
            rawData: leadData,
          });
          console.log("🆕 Saved new FB lead:", email || phone);
        }
      }
    }
  } catch (err) {
    console.error("❌ FB webhook top-level error:", err);
  }
});

export default router;
