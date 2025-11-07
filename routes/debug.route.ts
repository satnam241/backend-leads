import express, { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

router.get("/env-check", (req: Request, res: Response) => {
  const fbToken = process.env.FB_VERIFY_TOKEN;
  res.json({
    success: true,
    FB_VERIFY_TOKEN: fbToken ? fbToken : "❌ Not Loaded",
    note: "Compare this with your Facebook Verify Token — they must match exactly."
  });
});

export default router;
