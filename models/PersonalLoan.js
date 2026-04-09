import mongoose from "mongoose";

const loanHistorySchema = new mongoose.Schema({
    loan_provider_bank: String,
    total_loan_amount: String,
    current_emi: String,
    remaining_amount: String,
}, { _id: false });

const personalLoanSchema = new mongoose.Schema(
    {
        folderName: { type: String, required: true },

        // Prerequisites
        loanId: { type: String, unique: true },
        amount: { type: String, required: true },
        loan_amount: String, // Legacy
        id_of_connector: String,
        name_of_connector: String,
        purpose_of_loan: String,

        // Personal Information
        applicantName: { type: String, required: true },
        applicant_name: String, // Legacy
        fathers_name: String,
        mothers_name: String,
        phone: { type: String },
        phone_no: String, // Legacy
        alt_phone_no: String,
        email: String,
        pan: String,
        aadhar: String,
        dob: String,
        marital_status: String,
        spouse_name: String,

        // Co-applicant
        have_coapplicant: String,
        co_applicant_dob: String,
        co_applicant_name: String,
        co_occupation: String,
        relation_with_applicant: String,

        // Addresses
        permanent_building_name: String,
        permanent_street_name: String,
        permanent_landmark: String,
        permanent_city: String,
        permanent_district: String,
        permanent_state: String,
        permanent_pincode: String,
        same_as_permanent_address: Boolean,
        present_building_name: String,
        present_street_name: String,
        present_landmark: String,
        present_city: String,
        present_district: String,
        present_state: String,
        present_pincode: String,

        // Employment
        current_company_name: String,
        designation: String,
        salary_account_bank: String,
        job_tenure: String,
        savings_account_bank: String,
        saving_account_turnover: String,
        file_income_tax: String,
        job_experience: String,
        monthly_income: String,
        office_building_name: String,
        office_street_name: String,
        office_landmark: String,
        office_city: String,
        office_district: String,
        office_state: String,
        office_pincode: String,

        // Loan History
        loanHistory: [loanHistorySchema],

        // Documents
        applicant_selfie: String,
        aadhar_front: String,
        aadhar_back: String,
        Personal_pan: String,
        salary_slip_1: String,
        salary_slip_2: String,
        salary_slip_3: String,
        offer_letter: String,
        other_doc1: String,
        other_doc2: String,
        other_doc3: String,
        bank_statement: { type: String, required: true },
        documents: [String],

        loanType: { type: String, default: "Personal" },
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

export default mongoose.model("PersonalLoan", personalLoanSchema);

