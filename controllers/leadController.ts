import { Request, Response } from "express";
import Lead from "../models/lead.model";
import { sendMessageService } from "../services/messageService";

export const createLeadController = async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      email,
      phone,
      phoneVerified,
      whenAreYouPlanningToPurchase,
      whatIsYourBudget,
      source,
      rawData,
    } = req.body;

    // Prevent saving completely blank leads
    if (!fullName && !email && !phone) {
      return res.status(400).json({
        error: "At least one of fullName, email, or phone is required",
      });
    }

    const lead = new Lead({
      fullName,
      email,
      phone,
      phoneVerified,
      whenAreYouPlanningToPurchase,
      whatIsYourBudget,
      message: rawData?.message,
      source,
      rawData,
    });

    await lead.save();
    console.log("✅ Lead saved:", lead._id.toString());

    try {
      await sendMessageService(lead._id.toString(), "both");
      console.log("📩 Automatic message sent");
    } catch (err) {
      console.error("❌ Failed to send automatic message:", err);
    }

    res.status(201).json(lead);
  } catch (err) {
    console.error("❌ Error saving lead:", err);
    res.status(500).json({ error: "Failed to create lead" });
  }
};

