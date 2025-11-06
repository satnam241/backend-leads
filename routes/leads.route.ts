import express from "express";
import {
  createLeadController,
  updateLeadController,
  deleteLeadController,
  getLeadsController,
} from "../controllers/leadController";

const router = express.Router();

router.post("/leads", createLeadController);
router.get("/leads", getLeadsController);
router.put("/leads/:id", updateLeadController);
router.delete("/leads/:id", deleteLeadController);

export default router;
