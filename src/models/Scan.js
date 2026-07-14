import mongoose from "mongoose";

const ScanSchema = new mongoose.Schema(
  {
    requestedUrl: { type: String, required: true, trim: true, index: true },
    finalUrl: { type: String, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    entityEmail: { type: String, trim: true, lowercase: true, index: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", index: true },
    submission: { type: mongoose.Schema.Types.ObjectId, ref: "Submission", index: true },
    overallScore: { type: Number, min: 0, max: 100 },
    grade: String,
    topRecommendations: [String],
    userAgent: String,
    browser: {
      name: String,
      version: String,
    },
    location: {
      ip: String,
      city: String,
      region: String,
      country: String,
      postal: String,
      latitude: Number,
      longitude: Number,
      timezone: String,
      isp: String,
    },
    report: mongoose.Schema.Types.Mixed,
    scannedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

ScanSchema.index({ scannedAt: -1 });
ScanSchema.index({ overallScore: 1, scannedAt: -1 });

export default mongoose.models.Scan || mongoose.model("Scan", ScanSchema, "Scans");
