"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingReminderCount = exports.markAsContacted = exports.getReminderLeads = exports.adminGetProfile = exports.importLeadsController = exports.adminExportLeads = exports.adminDailyStats = exports.adminDeleteLead = exports.adminUpdateLead = exports.adminGetLeads = exports.changePasswordLoggedIn = exports.forgotPassword = exports.adminLogin = exports.adminSignup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const json2csv_1 = require("json2csv");
const nodemailer_1 = __importDefault(require("nodemailer"));
const admin_model_1 = __importDefault(require("../models/admin.model"));
const lead_model_1 = __importDefault(require("../models/lead.model"));
const XLSX = __importStar(require("xlsx"));
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const FRONTEND_URL = process.env.FRONTEND_URL;
// ==============================
// ✅ Admin Signup (Only once)
// ==============================
const adminSignup = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        // ✅ Validate name
        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: "Name is required",
            });
        }
        const existingAdmin = await admin_model_1.default.findOne();
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                error: "Admin already exists. Signup disabled."
            });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const admin = new admin_model_1.default({ email, password: hashedPassword, name: name.trim() });
        await admin.save();
        res.status(201).json({ success: true, message: "Admin created successfully" });
    }
    catch (err) {
        console.error("Admin signup error:", err);
        res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.adminSignup = adminSignup;
// ==============================
// ✅ Admin Login
// ==============================
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await admin_model_1.default.findOne({ email });
        if (!admin) {
            return res.status(400).json({ success: false, error: "Invalid credentials" });
        }
        const isMatch = await bcryptjs_1.default.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, error: "Invalid credentials" });
        }
        const token = jsonwebtoken_1.default.sign({ id: admin._id, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
        res.json({ success: true, token, admin: { id: admin._id, email: admin.email } });
    }
    catch (err) {
        console.error("Admin login error:", err);
        res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.adminLogin = adminLogin;
// ==============================
// ✅ Forgot Password
// ==============================
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const admin = await admin_model_1.default.findOne({ email });
        if (!admin)
            return res.status(404).json({ success: false, error: "Admin not found" });
        const token = jsonwebtoken_1.default.sign({ id: admin._id }, JWT_SECRET, { expiresIn: "15m" });
        const resetLink = `${FRONTEND_URL}/reset-password/${token}`;
        const transporter = nodemailer_1.default.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: admin.email,
            subject: "Password Reset",
            html: `<p>Click the link to reset your password (valid 15 mins):</p><a href="${resetLink}">${resetLink}</a>`,
        });
        res.json({ success: true, message: "Reset link sent to email" });
    }
    catch (err) {
        console.error("Forgot password error:", err);
        res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.forgotPassword = forgotPassword;
// ==============================
// ✅ Reset Password
// ==============================
// ✅ Change password after login (self-service)
const changePasswordLoggedIn = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer "))
            return res.status(401).json({ success: false, error: "Unauthorized" });
        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        }
        catch (err) {
            return res.status(401).json({ success: false, error: "Invalid token" });
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword)
            return res.status(400).json({ success: false, error: "Current and new password required" });
        const admin = await admin_model_1.default.findById(decoded.id);
        if (!admin)
            return res.status(404).json({ success: false, error: "Admin not found" });
        const isMatch = await bcryptjs_1.default.compare(currentPassword, admin.password);
        if (!isMatch)
            return res.status(400).json({ success: false, error: "Current password incorrect" });
        admin.password = await bcryptjs_1.default.hash(newPassword, 10);
        await admin.save();
        res.json({ success: true, message: "Password changed successfully" });
    }
    catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.changePasswordLoggedIn = changePasswordLoggedIn;
// ==============================
// ✅ Get All Leads
// ==============================
const adminGetLeads = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const filter = {};
        if (req.query.source) {
            filter.source = req.query.source; // e.g., "facebook"
        }
        const leads = await lead_model_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        const totalLeads = await lead_model_1.default.countDocuments(filter);
        const newLeadsCount = await lead_model_1.default.countDocuments({ status: "new" });
        const contactedCount = await lead_model_1.default.countDocuments({ status: "contacted" });
        const convertedCount = await lead_model_1.default.countDocuments({ status: "converted" });
        res.json({
            success: true,
            leads,
            totalLeads,
            newLeadsCount,
            contactedCount,
            convertedCount,
            page,
            totalPages: Math.ceil(totalLeads / limit),
        });
    }
    catch (err) {
        console.error("Get leads error:", err);
        res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.adminGetLeads = adminGetLeads;
// ==============================
// ✅ Update Lead
// ==============================
const adminUpdateLead = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status)
            return res.status(400).json({ success: false, error: "Status is required" });
        const lead = await lead_model_1.default.findByIdAndUpdate(id, { status }, { new: true });
        if (!lead)
            return res.status(404).json({ success: false, error: "Lead not found" });
        res.json({ success: true, lead });
    }
    catch (err) {
        console.error("Update lead error:", err);
        res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.adminUpdateLead = adminUpdateLead;
// ==============================
// ✅ Delete Lead
// ==============================
const adminDeleteLead = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await lead_model_1.default.findByIdAndDelete(id);
        if (!lead)
            return res.status(404).json({ success: false, error: "Lead not found" });
        res.json({ success: true, message: "Lead deleted successfully" });
    }
    catch (err) {
        console.error("Delete lead error:", err);
        res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.adminDeleteLead = adminDeleteLead;
// ==============================
// ✅ Daily Stats
// ==============================
const adminDailyStats = async (_req, res) => {
    try {
        const stats = await lead_model_1.default.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
        ]);
        res.json({ success: true, stats });
    }
    catch (err) {
        console.error("Daily stats error:", err);
        res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.adminDailyStats = adminDailyStats;
// ==============================
// ✅ Export Leads CSV
// ==============================
const adminExportLeads = async (_req, res) => {
    try {
        // Fetch all leads sorted by newest first
        const leads = await lead_model_1.default.find().sort({ createdAt: -1 });
        if (!leads.length)
            return res.status(404).json({ success: false, error: "No leads found" });
        // Map fields according to your model
        const fields = [
            { label: "Full Name", value: "fullName" },
            { label: "Email", value: "email" },
            { label: "Phone", value: "phone" },
            { label: "Phone Verified", value: "phoneVerified" },
            { label: "Planned Purchase Time", value: "whenAreYouPlanningToPurchase" },
            { label: "Budget", value: "whatIsYourBudget" },
            { label: "Message", value: "message" },
            { label: "Source", value: "source" },
            { label: "Status", value: "status" },
            { label: "Created At", value: (row) => row.createdAt.toISOString() },
        ];
        const parser = new json2csv_1.Parser({ fields });
        const csv = parser.parse(leads);
        // Send CSV file
        res.header("Content-Type", "text/csv");
        res.attachment("leads-export.csv");
        res.send(csv);
    }
    catch (err) {
        console.error("Export leads error:", err);
        res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.adminExportLeads = adminExportLeads;
const importLeadsController = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Please upload a file" });
        }
        const filePath = req.file.path;
        const ext = req.file.originalname.split(".").pop()?.toLowerCase();
        // ------------------------------
        // UTF-16 / NULL BYTE CLEANER
        // ------------------------------
        const cleanUTF16 = (value) => {
            if (value == null)
                return null;
            if (typeof value !== "string")
                return value;
            let str = value.replace(/\u0000/g, ""); // remove null bytes
            str = str.replace(/^"|"$/g, ""); // remove quotes
            str = str.trim();
            return str || null;
        };
        let data = [];
        // Read Excel / CSV
        const workbook = XLSX.readFile(filePath, { cellDates: true });
        const sheetName = workbook.SheetNames[0];
        data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            defval: null,
            raw: true,
        });
        // ⭐ Clean all rows from UTF-16 garbage
        const cleanedData = data.map((row) => {
            const cleanedRow = {};
            for (const [key, val] of Object.entries(row)) {
                cleanedRow[key] = cleanUTF16(val);
            }
            return cleanedRow;
        });
        // ------------------------------
        // SAVE DATA EXACT AS IT IS
        // ------------------------------
        for (const row of cleanedData) {
            await lead_model_1.default.create({
                fullName: row.fullName ||
                    row.name ||
                    row["Full Name"] ||
                    row["full_name"] ||
                    "Unknown User",
                email: row.email && row.email !== "null"
                    ? row.email.toLowerCase().trim()
                    : `noemail_${Date.now()}_${Math.random()}@import.com`,
                phone: row.phone ||
                    row.mobile ||
                    row["Phone Number"] ||
                    row["Mobile Number"] ||
                    null,
                message: row.message || row.Message || null,
                whenAreYouPlanningToPurchase: row.whenAreYouPlanningToPurchase ||
                    row.PurchaseTime ||
                    null,
                whatIsYourBudget: row.whatIsYourBudget ||
                    row.Budget ||
                    null,
                source: "import",
                // ⭐ Save original cleaned row
                rawData: row,
                extraFields: row,
                receivedAt: new Date(),
            });
        }
        return res.json({
            message: "Leads imported successfully",
            total: cleanedData.length,
            sample: cleanedData[0], // preview clean data
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Import failed" });
    }
};
exports.importLeadsController = importLeadsController;
// ==============================
// ✅ Get Admin Profile
// ==============================
// export const adminGetProfile = async (req: Request, res: Response) => {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader?.startsWith("Bearer "))
//       return res.status(401).json({ success: false, error: "Unauthorized" });
//     const token = authHeader.split(" ")[1];
//     let decoded: any;
//     try {
//       decoded = jwt.verify(token, JWT_SECRET);
//     } catch (err) {
//       return res.status(401).json({ success: false, error: "Invalid token" });
//     }
//     const admin = await Admin.findById(decoded.id).select("-password");
//     if (!admin) return res.status(404).json({ success: false, error: "Admin not found" });
//     res.json({ _id: admin._id, email: admin.email || "" });
//   } catch (err) {
//     console.error("Get admin profile error:", err);
//     res.status(500).json({ success: false, error: "Server error" });
//   }
// };
const adminGetProfile = async (req, res) => {
    try {
        const admin = await admin_model_1.default.findOne().select("-password");
        if (!admin) {
            return res.status(404).json({ success: false, error: "Admin not found" });
        }
        res.json({
            _id: admin._id,
            name: admin.name || "",
        });
    }
    catch (err) {
        console.error("Get admin profile error:", err);
        res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.adminGetProfile = adminGetProfile;
// ==============================
// ✅ Get Leads That Need Reminder (Popup)
// ==============================
const getReminderLeads = async (req, res) => {
    try {
        const leads = await lead_model_1.default.find({
            reminderCount: { $gt: 0, $lte: 5 },
            status: { $ne: "closed" }
        }).sort({ lastReminderSent: -1 });
        return res.json({ success: true, leads });
    }
    catch (error) {
        console.error("Get reminder leads error:", error);
        return res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.getReminderLeads = getReminderLeads;
// ==============================
// ✅ Mark Lead as Contacted (Reset Reminder)
// ==============================
const markAsContacted = async (req, res) => {
    try {
        const { id } = req.params;
        await lead_model_1.default.findByIdAndUpdate(id, {
            status: "contacted",
            reminderCount: 0
        });
        return res.json({ success: true, message: "Lead marked as contacted" });
    }
    catch (error) {
        console.error("Mark contacted error:", error);
        return res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.markAsContacted = markAsContacted;
// ==============================
// ✅ Dashboard – Pending Reminder Count
// ==============================
const getPendingReminderCount = async (req, res) => {
    try {
        const count = await lead_model_1.default.countDocuments({
            status: { $ne: "closed" },
            reminderCount: { $gte: 1, $lte: 5 }
        });
        return res.json({ success: true, pendingReminders: count });
    }
    catch (error) {
        console.error("Pending reminder count error:", error);
        return res.status(500).json({ success: false, error: "Server error" });
    }
};
exports.getPendingReminderCount = getPendingReminderCount;
//# sourceMappingURL=admin.controller.js.map