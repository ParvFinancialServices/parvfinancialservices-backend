import mongoose from "mongoose";

const loanHistorySchema = new mongoose.Schema({
    loan_provider_bank: String,
    total_loan_amount: String,
    current_emi: String,
    remaining_amount: String,
}, { _id: false });

const goldLoanSchema = new mongoose.Schema(
    {
        folderName: { type: String, required: true },

        loanId: { type: String, unique: true },
        amount: { type: String, required: true },
        loan_amount: { type: String }, // Legacy
        id_of_connector: String,
        name_of_connector: String,

        applicantName: { type: String, required: true },
        applicant_name: { type: String }, // Legacy
        fathers_name: String,
        mothers_name: String,
        phone: { type: String },
        phone_no: String, // Legacy
        alt_phone_no: String,
        pan: String,
        dob: String,

        // Permanent Address
        permanent_building_name: String,
        permanent_street_name: String,
        permanent_landmark: String,
        permanent_city: String,
        permanent_district: String,
        permanent_state: String,
        permanent_pincode: String,

        // Present Address
        present_building_name: String,
        present_street_name: String,
        present_landmark: String,
        present_city: String,
        present_district: String,
        present_state: String,
        present_pincode: String,

        same_as_permanent_address: Boolean,

        // Employment
        saving_account_bank_name: String,
        saving_account_turnover: String,
        loan_start_date: String,
        monthly_emi: String,

        loanHistory: [loanHistorySchema],

        // Documents (Cloudinary URLs)
        aadhar_front: String,
        aadhar_back: String,
        personal_pan_upload: String,
        house_electricity: String,
        other_doc1: String,
        other_doc2: String,
        bank_statement: { type: String, required: true },
        documents: [String],

        loanType: { type: String, default: "Gold" },
        status: {
            type: String,
            enum: [
                "Application Received",
                "In Progress at PARV",
                "Applied to Bank",
                "Pendency",
                "Sanctioned",
                "Disbursed",
                "Rejected",
                // Backward-compatible legacy statuses
                "Pending",
                "Approved"
            ],
            default: "Application Received"
        },
        isDeleted: { type: Boolean, default: false },
        createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdByName: String,
        createdByRole: String
    },
    { timestamps: true }
);

export default mongoose.model("GoldLoan", goldLoanSchema);
