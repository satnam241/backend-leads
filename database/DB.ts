import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URI||"mongodb+srv://sharesampatti_db_user:gisT4ZAeM4SJ0IDs@cluster1.fexcuo8.mongodb.net/?appName=Cluster1"
    await mongoose.connect(mongoURI);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};
