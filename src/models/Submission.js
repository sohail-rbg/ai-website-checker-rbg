import mongoose from "mongoose";

const SubmissionSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    website: { type: String, required: true, trim: true, index: true },
    overallScore: { type: Number, required: true, min: 0, max: 100 },
    grade: String,
    wantsCall: { type: Boolean, default: false },
    topImprovements: [String],
    platformScores: mongoose.Schema.Types.Mixed,
    reportUrl: String,
    emailSent: { type: Boolean, default: false },
    emailDelivery: mongoose.Schema.Types.Mixed,
    report: mongoose.Schema.Types.Mixed,
    submittedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

SubmissionSchema.index({ lead: 1, submittedAt: -1 });
SubmissionSchema.index({ email: 1, website: 1, submittedAt: -1 });

export default mongoose.models.Submission || mongoose.model("Submission", SubmissionSchema, "Submissions");
