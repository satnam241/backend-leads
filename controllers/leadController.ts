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

    const lead = new Lead({
      fullName: fullName || "Unknown User",
      email: email || null,
      phone: phone || null,
      phoneVerified: phoneVerified || false,
      whenAreYouPlanningToPurchase: whenAreYouPlanningToPurchase || null,
      whatIsYourBudget: whatIsYourBudget || null,
      message: rawData?.message || null,
      source: source || "Unknown",
      rawData,
    });

    await lead.save();
    console.log("✅ Lead saved:", lead._id.toString());

    // Non-blocking: try to send message, but don't fail lead creation if message fails
    try {
      await sendMessageService(lead._id.toString(), "both");
      console.log("📩 Automatic message sent");
    } catch (err) {
      console.error("❌ Failed to send automatic message:", err);
    }

    res.status(201).json(lead);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create lead" });
  }
};
