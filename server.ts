import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./database/DB";   

// Routes
import fbWebhook from "./routes/fbWebhook";
import twilioWebhook from "./routes/whatsappWebhook";   
import leadsRoute from "./routes/leads.route";
import AdminRoute from "./routes/admin.routes";
import messageRoutes from "./routes/message.routes";
dotenv.config();
connectDB();

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use(cors({
  origin: true,
  credentials: true,                    
}));

app.get("/", (_req, res) => {
  res.send("Backend is running ✅");
});

app.use("/api/webhook/facebook", fbWebhook);
app.use("/api/webhook/twilio", twilioWebhook);
app.use("/api/leads", leadsRoute);
app.use("/api/admin", AdminRoute);
app.use("/api/leads", messageRoutes);


const PORT = process.env.PORT || 4520;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
