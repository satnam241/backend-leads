import { Router } from "express";
import { scheduleFollowUp, cancelFollowUp, listFollowUps,getUpcomingFollowUps } from "../controllers/followup.controller";
import { adminAuth } from "../middleware/adminAuth";

const router = Router();

router.post("/leads/:id/followup", adminAuth, scheduleFollowUp);   // body: { recurrence, date, message, whatsappOptIn, active }
router.delete("/leads/:id/followup", adminAuth, cancelFollowUp);
router.get("/followups", adminAuth, listFollowUps);
// Calendar – Upcoming Follow-ups
router.get("/followups/upcoming", adminAuth, getUpcomingFollowUps);

export default router;
