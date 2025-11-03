"use strict";
// // controllers/leadController.ts
// import { Request, Response } from "express";
// import Lead from "../models/lead.model";
// import { sendMessageService } from "../services/messageService";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLeadController = void 0;
const lead_model_1 = __importDefault(require("../models/lead.model"));
const messageService_1 = require("../services/messageService");
/**
 * Extract and normalize fields dynamically from FB or custom form data
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
    // ✅ Handle Facebook Lead Ads `field_data` format
    if (Array.isArray(rawData.field_data)) {
        for (const f of rawData.field_data) {
            const key = (f.name || "").toString().toLowerCase();
            const val = Array.isArray(f.values) && f.values.length ? f.values[0] : undefined;
            if (!val)
                continue;
            if (key.includes("name"))
                extracted.fullName = extracted.fullName || val;
            else if (key.includes("email"))
                extracted.email = extracted.email || val;
            else if (key.includes("phone") || key.includes("mobile"))
                extracted.phone = extracted.phone || val;
            else if (key.includes("message") || key.includes("msg"))
                extracted.message = extracted.message || val;
            else
                extracted.extraFields[key] = val;
        }
    }
    // ✅ Handle other possible keys (non-FB)
    for (const [key, val] of Object.entries(rawData)) {
        const lowerKey = key.toLowerCase();
        if (!val)
            continue;
        if (lowerKey.includes("name"))
            extracted.fullName = val;
        else if (lowerKey.includes("email"))
            extracted.email = val;
        else if (lowerKey.includes("phone") || lowerKey.includes("mobile"))
            extracted.phone = val;
        else if (lowerKey.includes("message"))
            extracted.message = val;
        else if (lowerKey === "source")
            extracted.source = val;
        else
            extracted.extraFields[lowerKey] = val;
    }
    return extracted;
}
const createLeadController = async (req, res) => {
    try {
        const { fullName: bodyFullName, email: bodyEmail, phone: bodyPhone, phoneVerified, whenAreYouPlanningToPurchase, whatIsYourBudget, source: bodySource, rawData, } = req.body;
        const extracted = extractFields(rawData);
        const fullName = bodyFullName || extracted.fullName || null;
        const email = bodyEmail || extracted.email || null;
        const phone = bodyPhone || extracted.phone || null;
        const message = extracted.message || rawData?.message || null;
        const source = bodySource || extracted.source || "Unknown";
        if (!fullName && !email && !phone) {
            console.warn("❌ Missing required fields in incoming lead", req.body);
            return res.status(400).json({
                error: "Lead must include at least one of these: fullName, email, or phone.",
            });
        }
        const existingLead = await lead_model_1.default.findOne({
            $or: [{ email }, { phone }],
        });
        let lead;
        if (existingLead) {
            lead = await lead_model_1.default.findByIdAndUpdate(existingLead._id, {
                $set: {
                    fullName,
                    email,
                    phone,
                    phoneVerified: phoneVerified ?? existingLead.phoneVerified,
                    whenAreYouPlanningToPurchase: whenAreYouPlanningToPurchase || existingLead.whenAreYouPlanningToPurchase,
                    whatIsYourBudget: whatIsYourBudget || existingLead.whatIsYourBudget,
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
            }, { new: true });
            console.log("🔁 Updated existing lead:", lead?._id?.toString());
        }
        else {
            lead = new lead_model_1.default({
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
            console.log("✅ New lead saved:", lead?._id?.toString());
        }
        // ✅ Send auto message (non-blocking)
        (async () => {
            try {
                if (!lead?._id) {
                    console.error("⚠️ Lead not found, cannot send message");
                    return;
                }
                await (0, messageService_1.sendMessageService)(lead._id.toString(), "both");
                console.log("📩 Auto message sent for", lead._id.toString());
            }
            catch (err) {
                console.error("⚠️ Message sending failed:", err);
            }
        })();
        // ✅ Return response
        return res.status(201).json(lead);
    }
    catch (err) {
        console.error("💥 Error in createLeadController:", err);
        return res.status(500).json({ error: "Failed to create lead" });
    }
};
exports.createLeadController = createLeadController;
//# sourceMappingURL=leadController.js.map