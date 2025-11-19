"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const followup_controller_1 = require("../controllers/followup.controller");
const adminAuth_1 = require("../middleware/adminAuth");
const router = (0, express_1.Router)();
router.post("/leads/:id/followup", adminAuth_1.adminAuth, followup_controller_1.scheduleFollowUp); // body: { recurrence, date, message, whatsappOptIn, active }
router.delete("/leads/:id/followup", adminAuth_1.adminAuth, followup_controller_1.cancelFollowUp);
router.get("/followups", adminAuth_1.adminAuth, followup_controller_1.listFollowUps);
// Calendar – Upcoming Follow-ups
router.get("/followups/upcoming", adminAuth_1.adminAuth, followup_controller_1.getUpcomingFollowUps);
exports.default = router;
//# sourceMappingURL=followup.routes.js.map