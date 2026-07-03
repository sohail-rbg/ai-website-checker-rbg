import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    website: { type: String, required: true, trim: true },
    overallScore: { type: Number, required: true, min: 0, max: 100 },
    wantsCall: { type: Boolean, default: false },
    submissionCount: { type: Number, default: 0 },
    lastSubmittedAt: { type: Date, default: Date.now },
    reportUrl: String,
    emailSent: { type: Boolean, default: false },
    emailDelivery: {
      userSent: { type: Boolean, default: false },
      adminSent: { type: Boolean, default: false },
      error: String,
      lastAttemptAt: Date,
    },
    summary: {
      grade: String,
      topImprovements: [String],
      platformScores: mongoose.Schema.Types.Mixed,
    },
    report: mongoose.Schema.Types.Mixed,
    latestSubmission: { type: mongoose.Schema.Types.ObjectId, ref: "Submission" },
  },
  { timestamps: true }
);

LeadSchema.index({ email: 1, website: 1 }, { unique: true });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ lastSubmittedAt: -1 });
LeadSchema.index({ wantsCall: 1, createdAt: -1 });

export default mongoose.models.Lead || mongoose.model("Lead", LeadSchema, "Leads");
