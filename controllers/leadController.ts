import { Request, Response } from "express";
import Lead from "../models/lead.model";
import { sendMessageService } from "../services/messageService";

/**
 * -----------------------------------------
 * 🔍 Utility: Extract fields from any rawData
 * -----------------------------------------
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

  // Handle FB field_data format
  if (Array.isArray(rawData.field_data)) {
    for (const f of rawData.field_data) {
      const key = (f.name || "").toLowerCase();
      const val =
        Array.isArray(f.values) && f.values.length ? f.values[0] : undefined;
      if (!val) continue;

      if (key.includes("name")) extracted.fullName = extracted.fullName || val;
      else if (key.includes("email")) extracted.email = extracted.email || val;
      else if (key.includes("phone") || key.includes("mobile"))
        extracted.phone = extracted.phone || val;
      else if (key.includes("message")) extracted.message = extracted.message || val;
      else extracted.extraFields[key] = val;
    }
  }

  // Handle custom JSON format
  for (const [key, val] of Object.entries(rawData)) {
    const k = key.toLowerCase();
    if (!val) continue;

    if (k.includes("name")) extracted.fullName = extracted.fullName || val;
    else if (k.includes("email")) extracted.email = extracted.email || val;
    else if (k.includes("phone") || k.includes("mobile"))
      extracted.phone = extracted.phone || val;
    else if (k.includes("message")) extracted.message = extracted.message || val;
    else if (k === "source") extracted.source = val;
    else extracted.extraFields[k] = val;
  }

  return extracted;
}

/**
 * -----------------------------------------
 * 🟢 Create Lead (FB + Manual + Import)
 * -----------------------------------------
 */
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

    const extracted = extractFields(rawData || {});
    const fullName = bodyFullName || extracted.fullName || "Unknown User";
    const email = bodyEmail || extracted.email || null;
    const phone = bodyPhone || extracted.phone || null;
    const message = extracted.message || rawData?.message || null;
    const source = bodySource || extracted.source || "import";

    if (!fullName && !email && !phone) {
      return res.status(400).json({
        error: "Lead must include at least one of: fullName, email, or phone.",
      });
    }

    // Check duplicate entry
    const existingLead = await Lead.findOne({
      $or: [{ email }, { phone }],
    });

    let lead;

    if (existingLead) {
      // Update existing lead
      lead = await Lead.findByIdAndUpdate(
        existingLead._id,
        {
          $set: {
            fullName,
            email,
            phone,
            phoneVerified: phoneVerified ?? existingLead.phoneVerified,
            whenAreYouPlanningToPurchase,
            whatIsYourBudget,
            message,
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

      console.log("🔁 Updated existing lead:", lead._id.toString());
    } else {
      // Create new lead
      lead = new Lead({
        fullName,
        email,
        phone,
        phoneVerified: phoneVerified || false,
        whenAreYouPlanningToPurchase,
        whatIsYourBudget,
        message,
        source,
        rawData: {
          ...rawData,
          extraFields: extracted.extraFields,
        },
      });

      await lead.save();
      console.log("✅ New lead saved:", lead._id.toString());
    }

    // Auto message send
    (async () => {
      try {
        if (lead?._id) {
          await sendMessageService(lead._id.toString(), "both");
          console.log("📩 Message sent for", lead._id.toString());
        }
      } catch (err) {
        console.error("⚠️ Auto message failed:", err);
      }
    })();

    res.status(201).json(lead);
  } catch (err) {
    console.error("💥 Error createLeadController:", err);
    res.status(500).json({ error: "Failed to create lead" });
  }
};

/**
 * -----------------------------------------
 * 🟡 Update Lead
 * -----------------------------------------
 */
export const updateLeadController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingLead = await Lead.findById(id);
    if (!existingLead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      id,
      {
        $set: {
          ...updates,
          rawData: updates.rawData
          ? {
              ...existingLead.rawData,
              ...updates.rawData,
              extraFields: {
                ...existingLead.rawData?.extraFields,
                ...updates.rawData?.extraFields,
              },
            }
          : existingLead.rawData,
        
        },
      },
      { new: true }
    );

    console.log("📝 Lead updated:", updatedLead._id.toString());
    res.status(200).json(updatedLead);
  } catch (err) {
    console.error("💥 Error updateLeadController:", err);
    res.status(500).json({ error: "Failed to update lead" });
  }
};

/**
 * -----------------------------------------
 * 🔴 Delete Lead
 * -----------------------------------------
 */
export const deleteLeadController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findByIdAndDelete(id);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    console.log("🗑️ Lead deleted:", lead._id.toString());
    res.status(200).json({ message: "Lead deleted successfully" });
  } catch (err) {
    console.error("💥 Error deleteLeadController:", err);
    res.status(500).json({ error: "Failed to delete lead" });
  }
};


 export const getLeadsController = async (req: Request, res: Response) => {
  try {
    const { id, email, phone, source } = req.query;

    // Single lead by ID
    if (id) {
      const lead = await Lead.findById(id).lean();
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      return res.status(200).json(lead);
    }

    const filters: any = {};

    if (email && email !== "null" && email !== "")
      filters.email = String(email).trim().toLowerCase();

    if (phone && phone !== "null" && phone !== "")
      filters.phone = String(phone).trim();

    if (source && source !== "null" && source !== "")
      filters.source = source;

    const leads = await Lead.find(filters)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(leads);

  } catch (err) {
    console.error("💥 Error in getLeadsController:", err);
    return res.status(500).json({ error: "Failed to fetch leads" });
  }
};
