import mongoose from "mongoose";

const LoanEnquirySchema = new mongoose.Schema({
  DSAName: { type: String, default: "" },
  DSAID: { type: String, default: "" },
  loanProduct: { type: String, default: "" },
  loanAmount: { type: String, default: "" },
  profession: { type: String, default: "" },
  fullName: { type: String, default: "" },
  phone: { type: String, default: "" },
  whatsappNo: { type: String, default: "" },
  email: { type: String, default: "" },
  address: { type: String, default: "" },
  city: { type: String, default: "" },
  pincode: { type: String, default: "" },
  source: { type: String, default: "" },
  documents: [{
    name: String,
    url: String,
    type: String
  }],

  createdAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
});

export default mongoose.model("LoanEnquiry", LoanEnquirySchema);

