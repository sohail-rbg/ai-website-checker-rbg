import mongoose from "mongoose";

const DemoRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true },
    website: { type: String, trim: true },
    message: { type: String, required: true, trim: true },
    source: { type: String, default: "book-demo" },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

DemoRequestSchema.index({ createdAt: -1 });

export default mongoose.models.DemoRequest || mongoose.model("DemoRequest", DemoRequestSchema, "DemoRequests");
