import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    date: {
      type: String, // Stored as YYYY-MM-DD
      required: [true, "Date is required"],
    },
    monthYear: {
      type: String, // Stored as YYYY-MM
      required: [true, "Month and Year is required"],
    },
    leadName: {
      type: String,
      required: [true, "Lead Name is required"],
      trim: true,
      minlength: [3, "Lead Name must be at least 3 characters"],
    },
    profession: {
      type: String,
      required: [true, "Profession is required"],
    },
    contactNo: {
      type: String,
      required: [true, "Contact No is required"],
      match: [/^[6-9]\d{9}$/, "Contact No must be a valid 10-digit number"],
    },
    whatsappNo: {
      type: String,
      required: [true, "WhatsApp No is required"],
      match: [/^[6-9]\d{9}$/, "WhatsApp No must be a valid 10-digit number"],
    },
    email: {
      type: String,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"],
    },
    leadSource: {
      type: String,
      required: [true, "Lead Source is required"],
    },
    loanProduct: {
      type: String,
      required: [true, "Loan Product is required"],
    },
    leadStatus: {
      type: String,
      required: [true, "Lead Status is required"],
    },
    callingDate: {
      type: String, // Stored as YYYY-MM-DD
      required: [true, "Calling Date is required"],
    },
    followupDate: {
      type: String, // Stored as YYYY-MM-DD
      required: [true, "Next Follow-up Date is required"],
    },
    state: {
      type: String,
      required: [true, "State is required"],
    },
    city: {
      type: String,
      required: [true, "Town/City is required"],
    },
    pincode: {
      type: String,
      required: [true, "Pincode is required"],
      match: [/^\d{6}$/, "Pincode must be exactly 6 digits"],
    },
    remarks: [
      {
        text: { type: String, required: true },
        createdBy: { type: String },
        userId: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdByName: {
      type: String,
    },
    createdByRole: {
      type: String,
    },
    dsa_username: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;
