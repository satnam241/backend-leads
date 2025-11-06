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
import dotenv from "dotenv";
import fetch from "node-fetch";
import Lead from "../models/lead.model"; // ✅ your existing schema
import { normalizePhone } from "../services/phone"; // optional helper

dotenv.config();
const router = express.Router();

// 🔹 Verify webhook (called by Facebook when setting up)
router.get("/facebook", (req: Request, res: Response) => {
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

// 🔹 Receive real-time lead data
router.post("/facebook", async (req: Request, res: Response) => {
  try {
    const entries = req.body.entry || [];

    // 🟢 Facebook expects a quick 200 OK response
    res.sendStatus(200);

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        if (change.field !== "leadgen") continue;

        const leadgenId = change.value.leadgen_id;
        const form_id = change.value.form_id;
        const page_id = change.value.page_id;

        console.log("📩 Received FB Lead:", { leadgenId, form_id, page_id });

        // 🔗 Fetch complete lead data from Graph API
        const url = `https://graph.facebook.com/v20.0/${leadgenId}?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`;

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

        // 🔹 Convert field_data array → object
        const fields: Record<string, any> = {};
        for (const f of leadData.field_data || []) {
          fields[f.name] = f.values?.[0] ?? "";
        }

        // ✅ Extract key info
        const fullName =
          fields.full_name || fields.name || fields.first_name || "Unknown User";
        const email = fields.email || null;
        const rawPhone = fields.phone_number || fields.phone || null;
        const phone = normalizePhone ? normalizePhone(rawPhone) : rawPhone;
        const phoneVerified =
          fields.phone_number_verified === "true" ? true : false;

        const whenAreYouPlanningToPurchase =
          fields.when_are_you_planning_to_purchase || null;
        const whatIsYourBudget = fields.what_is_your_budget || null;
        const message = fields.message || null;

        // 🎯 Deduplication check (based on phone/email)
        let existingLead = null;
        if (phone) existingLead = await Lead.findOne({ phone });
        if (!existingLead && email) existingLead = await Lead.findOne({ email });

        if (existingLead) {
          // 🔁 Update missing or new fields
          if (!existingLead.phone && phone) existingLead.phone = phone;
          if (!existingLead.email && email) existingLead.email = email;
          if (phoneVerified) existingLead.phoneVerified = true;

          existingLead.extraFields = {
            ...existingLead.extraFields,
            ...fields,
          };

          existingLead.rawData = leadData;
          existingLead.whenAreYouPlanningToPurchase =
            whenAreYouPlanningToPurchase || existingLead.whenAreYouPlanningToPurchase;
          existingLead.whatIsYourBudget =
            whatIsYourBudget || existingLead.whatIsYourBudget;
          existingLead.message = message || existingLead.message;

          await existingLead.save();
          console.log("♻️ Updated existing lead:", existingLead._id);
        } else {
          // 🆕 Create new lead
          await Lead.create({
            fullName,
            email,
            phone,
            phoneVerified,
            whenAreYouPlanningToPurchase,
            whatIsYourBudget,
            message,
            source: "facebook",
            extraFields: fields,
            rawData: leadData,
          });

          console.log("🆕 New Facebook lead saved:", email || phone);
        }
      }
    }
  } catch (err) {
    console.error("❌ FB webhook main error:", err);
  }
});

export default router;
