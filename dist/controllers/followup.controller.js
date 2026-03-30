"use strict";
// controllers/followUpController.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUpcomingFollowUps = exports.listFollowUps = exports.cancelFollowUp = exports.scheduleFollowUp = void 0;
const lead_model_1 = __importDefault(require("../models/lead.model"));
// 🔥 Better recurrence handling
const computeNextDate = (recurrence, from) => {
    const base = from ? new Date(from) : new Date();
    switch (recurrence) {
        case "tomorrow":
            base.setDate(base.getDate() + 1);
            break;
        case "3days":
            base.setDate(base.getDate() + 3);
            break;
        case "weekly":
            base.setDate(base.getDate() + 7);
            break;
        default:
            break;
    }
    return base;
};
// ✅ Schedule Follow-up
const scheduleFollowUp = async (req, res) => {
    try {
        const { id } = req.params;
        const { recurrence, date, message, whatsappOptIn } = req.body;
        const lead = await lead_model_1.default.findById(id);
        if (!lead) {
            return res.status(404).json({ success: false, error: "Lead not found" });
        }
        // ✅ Validate
        if (!date && !recurrence) {
            return res.status(400).json({
                success: false,
                error: "Either date or recurrence is required",
            });
        }
        let followDate;
        if (date) {
            followDate = new Date(date);
        }
        else {
            followDate = computeNextDate(recurrence);
        }
        // ✅ Update lead
        lead.followUp = {
            date: followDate,
            recurrence: recurrence || "once",
            message: message || null,
            whatsappOptIn: !!whatsappOptIn,
            active: true,
        };
        await lead.save();
        return res.json({
            success: true,
            message: "Follow-up scheduled successfully",
            data: lead.followUp,
        });
    }
    catch (err) {
        console.error("Schedule follow-up error:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.scheduleFollowUp = scheduleFollowUp;
// ✅ Cancel Follow-up
const cancelFollowUp = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await lead_model_1.default.findById(id);
        if (!lead) {
            return res.status(404).json({ success: false, error: "Lead not found" });
        }
        lead.followUp = {
            date: null,
            recurrence: null,
            message: null,
            whatsappOptIn: false,
            active: false,
        };
        await lead.save();
        return res.json({
            success: true,
            message: "Follow-up cancelled",
        });
    }
    catch (err) {
        console.error("Cancel follow-up error:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.cancelFollowUp = cancelFollowUp;
// ✅ List All Active Follow-ups
const listFollowUps = async (_req, res) => {
    try {
        const followUps = await lead_model_1.default.find({
            "followUp.active": true,
            "followUp.date": { $ne: null },
        })
            .select("fullName phone email followUp")
            .sort({ "followUp.date": 1 });
        return res.json({ success: true, data: followUps });
    }
    catch (err) {
        console.error("List follow-ups error:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.listFollowUps = listFollowUps;
// ✅ Upcoming Follow-ups (FIXED DATE LOGIC)
const getUpcomingFollowUps = async (_req, res) => {
    try {
        const now = new Date();
        const upcoming = await lead_model_1.default.find({
            "followUp.active": true,
            "followUp.date": { $gte: now },
        })
            .select("fullName phone email followUp")
            .sort({ "followUp.date": 1 });
        return res.json({ success: true, data: upcoming });
    }
    catch (err) {
        console.error("Upcoming follow-ups error:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.getUpcomingFollowUps = getUpcomingFollowUps;
//# sourceMappingURL=followup.controller.js.map