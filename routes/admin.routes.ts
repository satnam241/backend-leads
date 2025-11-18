import { Router } from "express";
import {
  adminSignup,
  adminLogin,
  adminGetLeads,
  adminUpdateLead,
  adminDeleteLead,
  adminDailyStats,
  adminExportLeads,
  forgotPassword,
  changePasswordLoggedIn,
  adminGetProfile,
  importLeadsController,
  getReminderLeads,
  markAsContacted,
  getPendingReminderCount
} from "../controllers/admin.controller";

import { adminAuth } from "../middleware/adminAuth";
import { upload } from "../middleware/upload";

const router = Router();

// Auth
router.post("/signup", adminSignup);
router.post("/login", adminLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", changePasswordLoggedIn);
router.get("/me", adminGetProfile);

// Lead Management
router.get("/leads", adminAuth, adminGetLeads);
router.put("/leads/:id", adminAuth, adminUpdateLead);
router.delete("/leads/:id", adminAuth, adminDeleteLead);

// Import / Export
router.post("/import-leads", upload.single("file"), importLeadsController);
router.get("/leads/export", adminAuth, adminExportLeads);

// Daily Stats
router.get("/stats/daily", adminAuth, adminDailyStats);

// ==============================
// ⭐ REMINDER ROUTES
// ==============================

// 🔔 Popup reminder leads
router.get("/reminders", adminAuth, getReminderLeads);

// 🟩 Mark lead as contacted (reset reminder)
router.put("/reminders/contacted/:id", adminAuth, markAsContacted);

// 📊 Dashboard counter
router.get("/reminders/count", adminAuth, getPendingReminderCount);

export default router;
