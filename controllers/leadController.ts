// // controllers/leadController.ts
// import { Request, Response } from "express";
// import Lead from "../models/lead.model";
// import { sendMessageService } from "../services/messageService";

// exexport const createLeadController = async (req: Request, res: Response) => {
//   try {
//     const {
//       fullName,
//       email,
//       phone,
//       phoneVerified,
//       whenAreYouPlanningToPurchase,
//       whatIsYourBudget,
//       source,
//       rawData,
//     } = req.body;

//     const lead = new Lead({
//       fullName: fullName || "Unknown User",
//       email: email || null,
//       phone: phone || "N/A",
//       phoneVerified: phoneVerified || false,
//       whenAreYouPlanningToPurchase: whenAreYouPlanningToPurchase || null,
//       whatIsYourBudget: whatIsYourBudget || null,
//       message: rawData?.message || null,
//       source: source || "Unknown",
//       rawData,
//     });

//     await lead.save();
//     console.log("✅ Lead saved:", lead.phone);

//     // Automatic message
//     try {
//       await sendMessageService(lead._id, "both");
//       console.log("📩 Automatic message sent");
//     } catch (err) {
//       console.error("❌ Failed to send automatic message:", err);
//     }

//     res.status(201).json(lead);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to create lead" });
//   }
// };
// controllers/leadController.ts


import { Request, Response } from "express";
import Lead from "../models/lead.model";
import { sendMessageService } from "../services/messageService";

/**
 * Extract and normalize fields dynamically from FB or custom form data
 */
function extractFields(rawData: any) {
  const extracted: Record<string, any> = {
    fullName: null,
    email: null,
    phone: null,
    message: null,
    source: "facebook",
    extraFields: {},
  };

  if (!rawData) return extracted;

  // ✅ Handle Facebook Lead Ads `field_data` format
  if (Array.isArray(rawData.field_data)) {
    for (const f of rawData.field_data) {
      const key = (f.name || "").toString().toLowerCase();
      const val =
        Array.isArray(f.values) && f.values.length ? f.values[0] : undefined;
      if (!val) continue;

      if (key.includes("name")) extracted.fullName = extracted.fullName || val;
      else if (key.includes("email")) extracted.email = extracted.email || val;
      else if (key.includes("phone") || key.includes("mobile"))
        extracted.phone = extracted.phone || val;
      else if (key.includes("message") || key.includes("msg"))
        extracted.message = extracted.message || val;
      else extracted.extraFields[key] = val; 
    }
  }

  // ✅ Handle other possible keys (non-FB)
  for (const [key, val] of Object.entries(rawData)) {
    const lowerKey = key.toLowerCase();
    if (!val) continue;

    if (lowerKey.includes("name")) extracted.fullName = val;
    else if (lowerKey.includes("email")) extracted.email = val;
    else if (lowerKey.includes("phone") || lowerKey.includes("mobile"))
      extracted.phone = val;
    else if (lowerKey.includes("message")) extracted.message = val;
    else if (lowerKey === "source") extracted.source = val;
    else extracted.extraFields[lowerKey] = val;
  }

  return extracted;
}

export const createLeadController = async (req: Request, res: Response) => {
  try {
    const {
      fullName: bodyFullName,
      email: bodyEmail,
      phone: bodyPhone,
      phoneVerified,
      whenAreYouPlanningToPurchase,
      whatIsYourBudget,
      source: bodySource,
      rawData,
    } = req.body;

    const extracted = extractFields(rawData);
    const fullName = bodyFullName || extracted.fullName || null;
    const email = bodyEmail || extracted.email || null;
    const phone = bodyPhone || extracted.phone || null;
    const message = extracted.message || rawData?.message || null;
    const source = bodySource || extracted.source || "Unknown";


    if (!fullName && !email && !phone) {
      console.warn("❌ Missing required fields in incoming lead", req.body);
      return res.status(400).json({
        error:
          "Lead must include at least one of these: fullName, email, or phone.",
      });
    }

    const existingLead = await Lead.findOne({
      $or: [{ email }, { phone }],
    });

    let lead;
    if (existingLead) {
      lead = await Lead.findByIdAndUpdate(
        existingLead._id,
        {
          $set: {
            fullName,
            email,
            phone,
            phoneVerified: phoneVerified ?? existingLead.phoneVerified,
            whenAreYouPlanningToPurchase:
              whenAreYouPlanningToPurchase || existingLead.whenAreYouPlanningToPurchase,
            whatIsYourBudget:
              whatIsYourBudget || existingLead.whatIsYourBudget,
            message: message || existingLead.message,
            source,
            rawData: {
              ...existingLead.rawData,
              ...rawData,
              extraFields: {
                ...existingLead.rawData?.extraFields,
                ...extracted.extraFields,
              },
            },
          },
        },
        { new: true }
      );
      console.log("🔁 Updated existing lead:", lead?._id?.toString()
      );
    } else {
      lead = new Lead({
        fullName: fullName || "Unknown User",
        email: email || null,
        phone: phone || null,
        phoneVerified: phoneVerified || false,
        whenAreYouPlanningToPurchase: whenAreYouPlanningToPurchase || null,
        whatIsYourBudget: whatIsYourBudget || null,
        message,
        source,
        rawData: { ...rawData, extraFields: extracted.extraFields },
      });
      await lead.save();
      console.log("✅ New lead saved:", lead?._id?.toString()
      );
    }

    // ✅ Send auto message (non-blocking)
    (async () => {
      try {
        if (!lead?._id) {
          console.error("⚠️ Lead not found, cannot send message");
          return;
        }

        await sendMessageService((lead._id as any).toString(), "both");
        console.log("📩 Auto message sent for", lead._id.toString());
      } catch (err) {
        console.error("⚠️ Message sending failed:", err);
      }
    })();

    // ✅ Return response
    return res.status(201).json(lead);
  } catch (err) {
    console.error("💥 Error in createLeadController:", err);
    return res.status(500).json({ error: "Failed to create lead" });
  }
};

export const updateLeadController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({ error: "Lead ID is required" });
    }

    const existingLead = await Lead.findById(id);
    if (!existingLead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // ✅ Merge updates (safely preserve nested fields)
    const updatedLead = await Lead.findByIdAndUpdate(
      id,
      {
        $set: {
          ...updates,
          rawData: {
            ...existingLead.rawData,
            ...updates.rawData,
            extraFields: {
              ...existingLead.rawData?.extraFields,
              ...updates.rawData?.extraFields,
            },
          },
        },
      },
      { new: true }
    );

    console.log("📝 Lead updated:", updatedLead?._id?.toString());
    return res.status(200).json(updatedLead);
  } catch (err) {
    console.error("💥 Error in updateLeadController:", err);
    return res.status(500).json({ error: "Failed to update lead" });
  }
};

/**
 * ❌ Delete lead by ID
 */
export const deleteLeadController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Lead ID is required" });
    }

    const lead = await Lead.findByIdAndDelete(id);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    console.log("🗑️ Lead deleted:", lead?._id?.toString());
    return res.status(200).json({ message: "Lead deleted successfully" });
  } catch (err) {
    console.error("💥 Error in deleteLeadController:", err);
    return res.status(500).json({ error: "Failed to delete lead" });
  }
};

/**
 * 📋 Get all leads or a single lead by ID / Query
 */
export const getLeadsController = async (req: Request, res: Response) => {
  try {
    const { id, email, phone, source } = req.query;

    // ✅ Fetch single lead by ID if provided
    if (id) {
      const lead = await Lead.findById(id);
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      return res.status(200).json(lead);
    }

    // ✅ Apply filters dynamically
    const filters: Record<string, any> = {};
    if (email) filters.email = email;
    if (phone) filters.phone = phone;
    if (source) filters.source = source;

    const leads = await Lead.find(filters).sort({ createdAt: -1 });
    console.log(`📦 Fetched ${leads.length} leads`);

    return res.status(200).json(leads);
  } catch (err) {
    console.error("💥 Error in getLeadsController:", err);
    return res.status(500).json({ error: "Failed to fetch leads" });
  }
};
