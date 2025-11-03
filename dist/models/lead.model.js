"use strict";
// // import mongoose, { Schema, Document } from "mongoose";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const mongoose_1 = __importStar(require("mongoose"));
const validator_1 = __importDefault(require("validator"));
const LeadSchema = new mongoose_1.Schema({
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
            validator: (v) => !v || validator_1.default.isEmail(v),
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
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
    // ✅ store full original payload for audit/debug
    rawData: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
}, { timestamps: true });
// ✅ Allow unique email/phone but only if present
LeadSchema.index({ email: 1 }, { unique: true, sparse: true });
LeadSchema.index({ phone: 1 }, { unique: true, sparse: true });
exports.default = mongoose_1.default.model("Lead", LeadSchema);
//# sourceMappingURL=lead.model.js.map