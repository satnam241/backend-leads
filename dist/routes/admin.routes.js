"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const adminAuth_1 = require("../middleware/adminAuth");
const router = (0, express_1.Router)();
// Auth
router.post("/signup", admin_controller_1.adminSignup);
router.post("/login", admin_controller_1.adminLogin);
router.post("/forgot-password", admin_controller_1.forgotPassword);
router.post("/reset-password", admin_controller_1.changePasswordLoggedIn);
router.get("/me", admin_controller_1.adminGetProfile);
// Lead management (Protected)
router.get("/leads", adminAuth_1.adminAuth, admin_controller_1.adminGetLeads);
router.put("/leads/:id", adminAuth_1.adminAuth, admin_controller_1.adminUpdateLead);
router.delete("/leads/:id", adminAuth_1.adminAuth, admin_controller_1.adminDeleteLead);
// Stats + Export
router.get("/stats/daily", adminAuth_1.adminAuth, admin_controller_1.adminDailyStats);
router.get("/leads/export", adminAuth_1.adminAuth, admin_controller_1.adminExportLeads);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map