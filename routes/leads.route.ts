import express from "express";
import { createLeadController } from "../controllers/leadController";

const router = express.Router();


router.post("/routes", createLeadController);

export default router;

