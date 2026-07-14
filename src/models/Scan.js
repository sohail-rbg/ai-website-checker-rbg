import mongoose from "mongoose";

const ScanSchema = new mongoose.Schema(
  {
    requestedUrl: { type: String, required: true, trim: true, index: true },
    finalUrl: { type: String, trim: true, index: true },
    overallScore: { type: Number, min: 0, max: 100 },
    grade: String,
    topRecommendations: [String],
    userAgent: String,
    report: mongoose.Schema.Types.Mixed,
    scannedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

ScanSchema.index({ scannedAt: -1 });
ScanSchema.index({ overallScore: 1, scannedAt: -1 });

export default mongoose.models.Scan || mongoose.model("Scan", ScanSchema, "Scans");
