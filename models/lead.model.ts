import mongoose, { Schema, Document } from "mongoose";

export interface ILead extends Document {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneVerified?: boolean;
  whenAreYouPlanningToPurchase?: string | null;
  whatIsYourBudget?: string | null;
  message?: string | null;
  source?: string | null;
  status?: "new" | "contacted" | "converted";
  rawData?: any;
  createdAt: Date;
}

const LeadSchema: Schema = new Schema(
  {
    fullName: { type: String, trim: true, default: null },
    email: { type: String, trim: true, lowercase: true, default: null },
    phone: { type: String, trim: true, default: null },
    phoneVerified: { type: Boolean, default: false },
    whenAreYouPlanningToPurchase: { type: String, default: null },
    whatIsYourBudget: { type: String, default: null },
    message: { type: String, default: null },
    source: { type: String, default: null },
    status: {
      type: String,
      enum: ["new", "contacted", "converted"],
      default: "new",
    },
    rawData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Removed unique indexes

export default mongoose.model<ILead>("Lead", LeadSchema);

