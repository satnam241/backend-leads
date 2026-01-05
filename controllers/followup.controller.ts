import { Request, Response } from "express";
import Lead from "../models/lead.model";

// Helper to compute next date from recurrence
const computeNextDate = (recurrence: string, fromDate?: Date): Date => {
  const d = fromDate ? new Date(fromDate) : new Date();
  if (recurrence === "tomorrow") {
    d.setDate(d.getDate() + 1);
  } else if (recurrence === "3days") {
    d.setDate(d.getDate() + 3);
  } else if (recurrence === "weekly") {
    d.setDate(d.getDate() + 7);
  }
  return d;
};

export const scheduleFollowUp = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { recurrence, date, message, whatsappOptIn, active } = req.body;

    const lead = await Lead.findById(id);
    if (!lead)
      return res.status(404).json({ success: false, error: "Lead not found" });

    let followDate: Date | null = null;

    if (date) {
      // Frontend sends YYYY-MM-DD → convert to Date
      followDate = new Date(date);
    } else if (recurrence) {
      followDate = computeNextDate(recurrence);
    }

    lead.followUp = {
      date: followDate,                 // ✅ Date type
      recurrence: recurrence || "once",
      message: message || null,
      whatsappOptIn: !!whatsappOptIn,
      active: active ?? true,
    };

    await lead.save();

    return res.json({ success: true, lead });
  } catch (err) {
    console.error("Schedule follow-up error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// Cancel follow-up
export const cancelFollowUp = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ success: false, error: "Lead not found" });

    lead.followUp = { date: null, recurrence: null, message: null, whatsappOptIn: false, active: false };
    await lead.save();
    return res.json({ success: true, message: "Follow-up cancelled" });
  } catch (err) {
    console.error("Cancel follow-up error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// List follow-ups (optional filter)
export const listFollowUps = async (_req: Request, res: Response) => {
  try {
    const followUps = await Lead.find({ "followUp.active": true }).sort({ "followUp.date": 1 });
    return res.json({ success: true, followUps });
  } catch (err) {
    console.error("List follow-ups error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

export const getUpcomingFollowUps = async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const upcoming = await Lead.find({
      "followUp.active": true,
      "followUp.date": { $gte: today } // string comparison works on YYYY-MM-DD
    })
      .select("fullName phone followUp")
      .sort({ "followUp.date": 1 });

    return res.json({ success: true, upcoming });

  } catch (err) {
    console.error("Calendar fetch error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
