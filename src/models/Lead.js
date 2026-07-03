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
    submissions: [
      {
        submittedAt: { type: Date, default: Date.now },
        email: String,
        website: String,
        overallScore: Number,
        grade: String,
        wantsCall: Boolean,
        topImprovements: [String],
        platformScores: mongoose.Schema.Types.Mixed,
        reportUrl: String,
        emailSent: Boolean,
        emailDelivery: mongoose.Schema.Types.Mixed,
        report: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

LeadSchema.index({ email: 1, website: 1 }, { unique: true });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ wantsCall: 1, createdAt: -1 });

export default mongoose.models.Lead || mongoose.model("Lead", LeadSchema);
