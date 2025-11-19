"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeadsController = exports.deleteLeadController = exports.updateLeadController = exports.createLeadController = void 0;
const lead_model_1 = __importDefault(require("../models/lead.model"));
const messageService_1 = require("../services/messageService");
/**
 * -----------------------------------------
 * 🔍 Utility: Extract fields from any rawData
 * -----------------------------------------
 */
function extractFields(rawData) {
    const extracted = {
        fullName: null,
        email: null,
        phone: null,
        message: null,
        source: "facebook",
        extraFields: {},
    };
    if (!rawData)
        return extracted;
    // Handle FB field_data format
    if (Array.isArray(rawData.field_data)) {
        for (const f of rawData.field_data) {
            const key = (f.name || "").toLowerCase();
            const val = Array.isArray(f.values) && f.values.length ? f.values[0] : undefined;
            if (!val)
                continue;
            if (key.includes("name"))
                extracted.fullName = extracted.fullName || val;
            else if (key.includes("email"))
                extracted.email = extracted.email || val;
            else if (key.includes("phone") || key.includes("mobile"))
                extracted.phone = extracted.phone || val;
            else if (key.includes("message"))
                extracted.message = extracted.message || val;
            else
                extracted.extraFields[key] = val;
        }
    }
    // Handle custom JSON format
    for (const [key, val] of Object.entries(rawData)) {
        const k = key.toLowerCase();
        if (!val)
            continue;
        if (k.includes("name"))
            extracted.fullName = extracted.fullName || val;
        else if (k.includes("email"))
            extracted.email = extracted.email || val;
        else if (k.includes("phone") || k.includes("mobile"))
            extracted.phone = extracted.phone || val;
        else if (k.includes("message"))
            extracted.message = extracted.message || val;
        else if (k === "source")
            extracted.source = val;
        else
            extracted.extraFields[k] = val;
    }
    return extracted;
}
/**
 * -----------------------------------------
 * 🟢 Create Lead (FB + Manual + Import)
 * -----------------------------------------
 */
const createLeadController = async (req, res) => {
    try {
        const { fullName: bodyFullName, email: bodyEmail, phone: bodyPhone, phoneVerified, whenAreYouPlanningToPurchase, whatIsYourBudget, source: bodySource, rawData, } = req.body;
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
        const existingLead = await lead_model_1.default.findOne({
            $or: [{ email }, { phone }],
        });
        let lead;
        if (existingLead) {
            // Update existing lead
            lead = await lead_model_1.default.findByIdAndUpdate(existingLead._id, {
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
            }, { new: true });
            if (lead && lead._id) {
                console.log("Updated:", String(lead._id));
            }
        }
        else {
            // Create new lead
            lead = new lead_model_1.default({
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
            if (lead && lead._id) {
                console.log("Updated:", String(lead._id));
            }
        }
        // Auto message send
        (async () => {
            try {
                if (lead?._id) {
                    await (0, messageService_1.sendMessageService)(lead._id.toString(), "both");
                    if (lead && lead._id) {
                        console.log("Updated:", String(lead._id));
                    }
                }
            }
            catch (err) {
                console.error("⚠️ Auto message failed:", err);
            }
        })();
        res.status(201).json(lead);
    }
    catch (err) {
        console.error("💥 Error createLeadController:", err);
        res.status(500).json({ error: "Failed to create lead" });
    }
};
exports.createLeadController = createLeadController;
/**
 * -----------------------------------------
 * 🟡 Update Lead
 * -----------------------------------------
 */
const updateLeadController = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const existingLead = await lead_model_1.default.findById(id);
        if (!existingLead) {
            return res.status(404).json({ error: "Lead not found" });
        }
        const updatedLead = await lead_model_1.default.findByIdAndUpdate(id, {
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
        }, { new: true });
        if (updatedLead && updatedLead._id) {
            console.log("✅ Lead updated:", String(updatedLead._id));
        }
        else {
            console.log("✅ Lead updated: (no id available)");
        }
        res.status(200).json(updatedLead);
    }
    catch (err) {
        console.error("💥 Error updateLeadController:", err);
        res.status(500).json({ error: "Failed to update lead" });
    }
};
exports.updateLeadController = updateLeadController;
/**
 * -----------------------------------------
 * 🔴 Delete Lead
 * -----------------------------------------
 */
const deleteLeadController = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await lead_model_1.default.findByIdAndDelete(id);
        if (!lead) {
            return res.status(404).json({ error: "Lead not found" });
        }
        if (lead && lead._id) {
            console.log("Updated:", String(lead._id));
        }
        res.status(200).json({ message: "Lead deleted successfully" });
    }
    catch (err) {
        console.error("💥 Error deleteLeadController:", err);
        res.status(500).json({ error: "Failed to delete lead" });
    }
};
exports.deleteLeadController = deleteLeadController;
const getLeadsController = async (req, res) => {
    try {
        const { id, email, phone, source, followupFilter } = req.query;
        // 1) Fetch Single Lead by ID
        if (id) {
            const lead = await lead_model_1.default.findById(id).lean();
            if (!lead)
                return res.status(404).json({ error: "Lead not found" });
            return res.status(200).json(lead);
        }
        // 2) Base Filters
        const filters = {};
        if (email && email !== "null" && email !== "")
            filters.email = String(email).trim().toLowerCase();
        if (phone && phone !== "null" && phone !== "")
            filters.phone = String(phone).trim();
        if (source && source !== "null" && source !== "")
            filters.source = source;
        // base filters already written above...
        // FOLLOW-UP FILTERS
        if (followupFilter) {
            const now = new Date();
            if (followupFilter === "today") {
                const start = new Date();
                start.setHours(0, 0, 0, 0);
                const end = new Date();
                end.setHours(23, 59, 59, 999);
                filters["followUp.date"] = { $gte: start, $lte: end };
                filters["followUp.active"] = true;
            }
            if (followupFilter === "missed") {
                filters["followUp.date"] = { $lt: now }; // already passed
                filters["followUp.active"] = true;
            }
            if (followupFilter === "week") {
                const start = new Date();
                start.setDate(start.getDate() - start.getDay()); // start of week (Sunday)
                const end = new Date();
                end.setDate(end.getDate() + (6 - end.getDay())); // end of week (Saturday)
                end.setHours(23, 59, 59, 999);
                filters["followUp.date"] = { $gte: start, $lte: end };
                filters["followUp.active"] = true;
            }
            if (followupFilter === "next24") {
                const next24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                filters["followUp.date"] = { $gte: now, $lte: next24 };
                filters["followUp.active"] = true;
            }
        }
        // 4) Fetch Leads
        const leads = await lead_model_1.default.find(filters)
            .sort({ createdAt: -1 })
            .lean();
        return res.status(200).json(leads);
    }
    catch (err) {
        console.error("💥 Error in getLeadsController:", err);
        return res.status(500).json({ error: "Failed to fetch leads" });
    }
};
exports.getLeadsController = getLeadsController;
//# sourceMappingURL=leadController.js.map