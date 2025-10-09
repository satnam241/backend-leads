// // import mongoose, { Schema, Document } from "mongoose";

// // export interface ILead extends Document {
// //   fullName: string;
// //   email?: string;
// //   phone?: string;
// //   phoneVerified?: boolean;
// //   whenAreYouPlanningToPurchase?: string;
// //   whatIsYourBudget?: string;
// //   message?: string;
// //   source: string;
// //   status: "new" | "contacted" | "converted";
// //   rawData?: any;
// //   createdAt: Date;
// // }

// // const LeadSchema: Schema = new Schema(
// //   {
// //     fullName: { type: String, required: true }, // full_name
// //     email: { type: String }, // email
// //     phone: { type: String }, // phone_number
// //     phoneVerified: { type: Boolean, default: false }, // phone_number_verified
// //     whenAreYouPlanningToPurchase: { type: String }, // when_are_you_planning_to_purchase
// //     whatIsYourBudget: { type: String }, // what_is_your_budget
// //     message: { type: String },

// //     source: { type: String, required: true },
// //     status: {
// //       type: String,
// //       enum: ["new", "contacted", "converted"],
// //       default: "new",
// //     },
// //     rawData: { type: Schema.Types.Mixed },
// //   },
// //   { timestamps: true }
// // );

// // export default mongoose.model<ILead>("Lead", LeadSchema);
// // models/lead.model.ts
// import mongoose, { Schema, Document } from "mongoose";
// import validator from "validator";

// export interface ILead extends Document {
//   fullName: string;
//   email?: string | null;
//   phone?: string | null;
//   phoneVerified?: boolean;
//   whenAreYouPlanningToPurchase?: string | null;
//   whatIsYourBudget?: string | null;
//   message?: string | null;
//   source: string;
//   status: "new" | "contacted" | "converted";
//   rawData?: any;
//   createdAt: Date;
// }

// const LeadSchema: Schema = new Schema(
//   {
//     fullName: { type: String, required: true, trim: true, default: "Unknown User" },
//     email: {
//       type: String,
//       trim: true,
//       lowercase: true,
//       validate: {
//         validator: (v: string) => !v || validator.isEmail(v),
//         message: "Invalid email",
//       },
//       default: null,
//     },
//     phone: { type: String, trim: true, default: null },
//     phoneVerified: { type: Boolean, default: false },
//     whenAreYouPlanningToPurchase: { type: String, default: null },
//     whatIsYourBudget: { type: String, default: null },
//     message: { type: String, default: null },

//     source: { type: String, required: true },
//     status: {
//       type: String,
//       enum: ["new", "contacted", "converted"],
//       default: "new",
//     },
//     rawData: { type: Schema.Types.Mixed },
//   },
//   { timestamps: true }
// );

// // Useful indexes: unique when value exists (sparse)
// LeadSchema.index({ email: 1 }, { unique: true, sparse: true });
// LeadSchema.index({ phone: 1 }, { unique: true, sparse: true });

// export default mongoose.model<ILead>("Lead", LeadSchema);
import mongoose, { Schema, Document } from "mongoose";
import validator from "validator";

export interface ILead extends Document {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  phoneVerified?: boolean;
  whenAreYouPlanningToPurchase?: string | null;
  whatIsYourBudget?: string | null;
  message?: string | null;
  source: string;
  status: "new" | "contacted" | "converted";
  rawData?: any; // will store full original payload
  extraFields?: Record<string, any>; // ✅ dynamic extra form fields
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      default: "Unknown User",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v: string) => !v || validator.isEmail(v),
        message: "Invalid email",
      },
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    whenAreYouPlanningToPurchase: {
      type: String,
      default: null,
    },

    whatIsYourBudget: {
      type: String,
      default: null,
    },

    message: {
      type: String,
      default: null,
    },

    source: {
      type: String,
      required: true,
      default: "facebook",
    },

    status: {
      type: String,
      enum: ["new", "contacted", "converted"],
      default: "new",
    },

    // ✅ dynamic fields from FB form (city, state, projectName, etc.)
    extraFields: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // ✅ store full original payload for audit/debug
    rawData: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// ✅ Allow unique email/phone but only if present
LeadSchema.index({ email: 1 }, { unique: true, sparse: true });
LeadSchema.index({ phone: 1 }, { unique: true, sparse: true });

export default mongoose.model<ILead>("Lead", LeadSchema);
