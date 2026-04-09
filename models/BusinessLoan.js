import mongoose from "mongoose";

const businessLoanSchema = new mongoose.Schema(
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
        company_name: String,
        company_age: String,
        registration_paper: [String],
        have_current_account: String,
        current_account_bank_name: String,
        name_in_current_account: String,
        current_account_age: String,
        current_account_turnover: String,
        saving_account_bank_name: String,
        saving_account_turnover: String,
        file_income_tax: String,
        itr_1_upload: String,
        itr_2_upload: String,
        is_family_files_income_tax: String,
        have_property_for_mortgage: String,
        property_location: String,
        who_own_property: String,
        have_17_kahta_agri_land: String,
        needs_of_documents: [String],

        // Documents (Cloudinary URLs)
        applicant_selfie: String,
        aadhar_front: String,
        aadhar_back: String,
        personal_pan_upload: String,
        company_image: String,
        gst_certificate: String,
        udyam_registration: String,
        form_3: String,
        itr_2023_2024: String,
        itr_2024_2025: String,
        bank_statement: { type: String, required: true },
        shop_front: String,
        house_electricity: String,
        other_doc: String,
        other_doc1: String,
        other_doc2: String,
        other_doc3: String,
        documents: [String],

        loanType: { type: String, default: "Business" },
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

export default mongoose.model("BusinessLoan", businessLoanSchema);

