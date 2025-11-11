import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./database/DB";   
import fbWebhook from "./routes/fbWebhook";
import twilioWebhook from "./routes/whatsappWebhook";   
import leadsRoute from "./routes/leads.route";
import AdminRoute from "./routes/admin.routes";
import messageRoutes from "./routes/message.routes";
import debugRoute from "./routes/debug.route";
import activityRoutes from "./routes/activity.routes";

dotenv.config();
connectDB();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.send("🚀 Facebook Webhook API Live!");
});


app.use("/api/webhook", fbWebhook);             
app.use("/api/webhook/twilio", twilioWebhook);
app.use("/api/leads", leadsRoute);
app.use("/api/admin", AdminRoute);
app.use("/api/messages", messageRoutes);
app.use("/api/debug", debugRoute);
app.use("/api/activity", activityRoutes);

const PORT = process.env.PORT || 4520;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));