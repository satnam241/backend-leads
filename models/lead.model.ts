
import mongoose, { Schema, Document } from "mongoose";

export interface ILead extends Document {
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  phoneVerified?: boolean;
  source?: string;
  formId?: string | null;
  whenAreYouPlanningToPurchase?: string | null;
  whatIsYourBudget?: string | null;
  message?: string | null;
  extraFields?: Record<string, any>;
  rawData?: any;
  receivedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;

  // reminder fields
  reminderCount?: number;
  lastReminderSent?: Date | null;
  status?: string; // new | contacted | closed

  // 🆕 follow-up scheduling fields
  followUp?: {
    date?: Date | null;            // exact next follow-up date/time
    recurrence?: string | null;    // "once" | "tomorrow" | "3days" | "weekly"
    message?: string | null;       // custom follow-up message
    whatsappOptIn?: boolean;       // whether to send whatsapp
    active?: boolean;              // is follow-up active
  };
}
const LeadSchema = new Schema<ILead>(
  {
    fullName: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true, index: true },
    phoneVerified: { type: Boolean, default: false },
    source: { type: String, default: "facebook" },
    formId: { type: String },

    whenAreYouPlanningToPurchase: { type: String, default: null },
    whatIsYourBudget: { type: String, default: null },
    message: { type: String, default: null },

    extraFields: { type: Schema.Types.Mixed, default: {} },   // ⭐ dynamic fields
    rawData: { type: Schema.Types.Mixed, default: {} },        // ⭐ full original row

    receivedAt: { type: Date },

    reminderCount: { type: Number, default: 0 },
    lastReminderSent: { type: Date, default: null },
    status: { type: String, default: "new" },

    followUp: {
      date: { type: Date, default: null },
      recurrence: { type: String, default: null },
      message: { type: String, default: null },
      whatsappOptIn: { type: Boolean, default: false },
      active: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export default mongoose.model<ILead>("Lead", LeadSchema);
