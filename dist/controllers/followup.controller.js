"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUpcomingFollowUps = exports.listFollowUps = exports.cancelFollowUp = exports.scheduleFollowUp = void 0;
const lead_model_1 = __importDefault(require("../models/lead.model"));
// Helper to compute next date from recurrence
const computeNextDate = (recurrence, fromDate) => {
    const d = fromDate ? new Date(fromDate) : new Date();
    if (recurrence === "tomorrow") {
        d.setDate(d.getDate() + 1);
    }
    else if (recurrence === "3days") {
        d.setDate(d.getDate() + 3);
    }
    else if (recurrence === "weekly") {
        d.setDate(d.getDate() + 7);
    }
    return d;
};
// Create / Update follow-up for a lead
const scheduleFollowUp = async (req, res) => {
    try {
        const { id } = req.params;
        const { recurrence, date, message, whatsappOptIn, active } = req.body;
        const lead = await lead_model_1.default.findById(id);
        if (!lead)
            return res.status(404).json({ success: false, error: "Lead not found" });
        let followDate = null;
        if (date)
            followDate = new Date(date);
        else if (recurrence)
            followDate = computeNextDate(recurrence);
        lead.followUp = {
            date: followDate,
            recurrence: recurrence || (date ? "once" : null),
            message: message || null,
            whatsappOptIn: !!whatsappOptIn,
            active: active === undefined ? true : !!active
        };
        await lead.save();
        return res.json({ success: true, lead });
    }
    catch (err) {
        console.error("Schedule follow-up error:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.scheduleFollowUp = scheduleFollowUp;
// Cancel follow-up
const cancelFollowUp = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await lead_model_1.default.findById(id);
        if (!lead)
            return res.status(404).json({ success: false, error: "Lead not found" });
        lead.followUp = { date: null, recurrence: null, message: null, whatsappOptIn: false, active: false };
        await lead.save();
        return res.json({ success: true, message: "Follow-up cancelled" });
    }
    catch (err) {
        console.error("Cancel follow-up error:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.cancelFollowUp = cancelFollowUp;
// List follow-ups (optional filter)
const listFollowUps = async (_req, res) => {
    try {
        const followUps = await lead_model_1.default.find({ "followUp.active": true }).sort({ "followUp.date": 1 });
        return res.json({ success: true, followUps });
    }
    catch (err) {
        console.error("List follow-ups error:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.listFollowUps = listFollowUps;
const getUpcomingFollowUps = async (req, res) => {
    try {
        const upcoming = await lead_model_1.default.find({
            "followUp.active": true,
            "followUp.date": { $gte: new Date() } // only future events
        })
            .select("fullName phone followUp")
            .sort({ "followUp.date": 1 });
        return res.json({
            success: true,
            upcoming
        });
    }
    catch (err) {
        console.error("❌ Calendar fetch error:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.getUpcomingFollowUps = getUpcomingFollowUps;
//# sourceMappingURL=followup.controller.js.map