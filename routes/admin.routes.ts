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
} from "../controllers/admin.controller";
import { adminAuth } from "../middleware/adminAuth";
import { authenticateJWT } from "../middleware/auth"; 

const router = Router();

// Auth
router.post("/signup", adminSignup);
router.post("/login", adminLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", changePasswordLoggedIn);
router.get("/me", adminGetProfile);
// Lead management (Protected)
router.get("/leads", adminAuth, adminGetLeads);
router.put("/leads/:id", adminAuth, adminUpdateLead);
router.delete("/leads/:id", adminAuth, adminDeleteLead);

// Stats + Export
router.get("/stats/daily", adminAuth, adminDailyStats);
router.get("/leads/export", adminAuth, adminExportLeads);

export default router;
