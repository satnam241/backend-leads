import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Parser } from "json2csv";
import nodemailer from "nodemailer";
import Admin from "../models/admin.model";
import Lead from "../models/lead.model";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const FRONTEND_URL = process.env.FRONTEND_URL;

// ==============================
// ✅ Admin Signup (Only once)
// ==============================


export const adminSignup = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // ✅ Validate name
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Name is required",
      });
    }

    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: "Admin already exists. Signup disabled."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({ email, password: hashedPassword, name: name.trim() });
    await admin.save();

    res.status(201).json({ success: true, message: "Admin created successfully" });
  } catch (err) {
    console.error("Admin signup error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};


// ==============================
// ✅ Admin Login
// ==============================
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(400).json({ success: false, error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: admin._id, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });

    res.json({ success: true, token, admin: { id: admin._id, email: admin.email } });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// ==============================
// ✅ Forgot Password
// ==============================
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ success: false, error: "Admin not found" });

    const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: "15m" });
    const resetLink = `${FRONTEND_URL}/reset-password/${token}`;

    const transporter = nodemailer.createTransport({
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
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// ==============================
// ✅ Reset Password
// ==============================
// ✅ Change password after login (self-service)
export const changePasswordLoggedIn = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) 
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    let decoded: any;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, error: "Current and new password required" });

    const admin = await Admin.findById(decoded.id);
    if (!admin) return res.status(404).json({ success: false, error: "Admin not found" });

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) return res.status(400).json({ success: false, error: "Current password incorrect" });

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};


// ==============================
// ✅ Get All Leads
// ==============================
export const adminGetLeads = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const filter: any = {};
    if (req.query.source) {
      filter.source = req.query.source; // e.g., "facebook"
    }
    const leads = await Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalLeads = await Lead.countDocuments(filter);
    const newLeadsCount = await Lead.countDocuments({ status: "new" });
    const contactedCount = await Lead.countDocuments({ status: "contacted" });
    const convertedCount = await Lead.countDocuments({ status: "converted" });

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
  } catch (err) {
    console.error("Get leads error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};



// ==============================
// ✅ Update Lead
// ==============================
export const adminUpdateLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ success: false, error: "Status is required" });

    const lead = await Lead.findByIdAndUpdate(id, { status }, { new: true });
    if (!lead) return res.status(404).json({ success: false, error: "Lead not found" });

    res.json({ success: true, lead });
  } catch (err) {
    console.error("Update lead error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// ==============================
// ✅ Delete Lead
// ==============================
export const adminDeleteLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findByIdAndDelete(id);

    if (!lead) return res.status(404).json({ success: false, error: "Lead not found" });

    res.json({ success: true, message: "Lead deleted successfully" });
  } catch (err) {
    console.error("Delete lead error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// ==============================
// ✅ Daily Stats
// ==============================
export const adminDailyStats = async (_req: Request, res: Response) => {
  try {
    const stats = await Lead.aggregate([
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
  } catch (err) {
    console.error("Daily stats error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// ==============================
// ✅ Export Leads CSV
// ==============================
export const adminExportLeads = async (_req: Request, res: Response) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });

    if (!leads.length) return res.status(404).json({ success: false, error: "No leads found" });

    const fields = ["name", "email", "phone", "status", "message", "createdAt"];
    const parser = new Parser({ fields });
    const csv = parser.parse(leads);

    res.header("Content-Type", "text/csv");
    res.attachment("leads-export.csv");
    res.send(csv);
  } catch (err) {
    console.error("Export leads error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

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
export const adminGetProfile = async (req: Request, res: Response) => {
  try {
    const admin = await Admin.findOne().select("-password");

    if (!admin) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }

    
    res.json({
      _id: admin._id,
      name: admin.name || "",
    });
  } catch (err) {
    console.error("Get admin profile error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
