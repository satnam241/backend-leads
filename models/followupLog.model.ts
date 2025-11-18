import mongoose, { Schema, Document } from "mongoose";

export interface IFollowUpLog extends Document {
  leadId: string;
  message: string;
  type: "email" | "whatsapp" | "both";
  date: Date;
  status: "sent" | "failed";
}

const FollowUpLogSchema = new Schema<IFollowUpLog>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["email", "whatsapp", "both"], required: true },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ["sent", "failed"], default: "sent" }
  },
  { timestamps: true }
);

export default mongoose.model<IFollowUpLog>("FollowUpLog", FollowUpLogSchema);
