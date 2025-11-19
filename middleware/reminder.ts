import cron from "node-cron";
import Lead from "../models/lead.model";
import { sendMessageService } from "../services/messageService";

// ⏱️ Run every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  try {
    console.log("⏱️ Running follow-up cron...");

    const now = new Date();

    // 1️⃣ Find leads whose follow-up date is due
    const dueLeads = await Lead.find({
      "followUp.active": true,
      "followUp.date": { $lte: now }
    });

    for (const lead of dueLeads) {

      // 🔥 FIXED: lead._id always string
      const leadId = String((lead as any)._id);

      console.log("🔔 Follow-up due for lead:", leadId);

      // 2️⃣ Auto send BOTH: WhatsApp + Email + Brochure
      try {
        await sendMessageService(
          leadId, // FIXED ✔ (was lead._id)
          "both",
          lead.followUp?.message || undefined  // custom follow-up message
        );
        console.log(`📩 Auto follow-up sent to lead ${leadId}`);
      } catch (err) {
        console.error(`❌ Error sending auto message to ${leadId}:`, err);
      }

      // 3️⃣ Recurrence logic (tomorrow / 3days / weekly)
      const recurrence = lead.followUp?.recurrence;

      if (recurrence && recurrence !== "once") {

        const nextDate = (() => {
          const cur = new Date(lead.followUp!.date || now);

          if (recurrence === "tomorrow") cur.setDate(cur.getDate() + 1);
          else if (recurrence === "3days") cur.setDate(cur.getDate() + 3);
          else if (recurrence === "weekly") cur.setDate(cur.getDate() + 7);
          else cur.setDate(cur.getDate() + 1); // default fallback

          return cur;
        })();

        lead.followUp!.date = nextDate;

        console.log(`🔁 Next follow-up scheduled for ${nextDate} (Lead: ${leadId})`);

      } else {
        // If once or no recurrence → disable future follow-ups
        lead.followUp = {
          ...lead.followUp,
          active: false,
          date: null,
          recurrence: null,
          message: lead.followUp?.message || null
        };

        console.log(`🛑 Follow-up disabled for Lead: ${leadId}`);
      }

      // 4️⃣ Save updated lead
      await lead.save();
    }

  } catch (err) {
    console.error("❌ Follow-up cron failed:", err);
  }
});
