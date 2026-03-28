// cron-jobs/followUpWorker.ts

import cron from "node-cron";
import Lead from "../models/lead.model";
import { sendMessageToLead } from "../services/messageService";

// ✅ NAMED EXPORT (IMPORTANT)
export const startFollowUpJob = () => {
  console.log("⏰ Follow-up job started...");

  // run every 1 minute
  cron.schedule("*/10 * * * * *", async () => {
    console.log("Checking follow-ups...");

    const now = new Date();

    const leads = await Lead.find({
      "followUp.active": true,
      "followUp.date": { $lte: now },
    });

    for (const lead of leads) {
      try {
        console.log("Sending follow-up to:", lead.fullName);

        await sendMessageToLead({
          leadId: lead._id.toString(),
          messageType: "both",
          customMessage: lead.followUp?.message || undefined,
        });

        // ✅ mark completed
        lead.followUp.active = false;
        await lead.save();

      } catch (err) {
        console.error("Follow-up failed:", err);
      }
    }
  });
};