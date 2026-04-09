import mongoose from "mongoose";

const homeLoanSchema = new mongoose.Schema(
    {
        folderName: { type: String, required: true },

        // Prerequisites
        loanId: { type: String, unique: true },
        amount: { type: String, required: true },
        loan_amount: String, // Legacy
        id_of_connector: String,
        name_of_connector: String,
        purpose_of_loan: String,
        loan_type: String,

        // Personal Information
        applicantName: { type: String, required: true },
        applicant_name: String, // Legacy
        fathers_name: String,
        mothers_name: String,
        phone: { type: String },
        phone_no: String, // Legacy
        email: String,
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

        // Profession
        profession: String,

        // Job Details
        current_company_name: String,
        salary_account_bank: String,
        savings_account_bank: String,
        job_tenure: String,
        job_experience: String,
        monthly_income: String,

        // Business Details
        company_name: String,
        company_age: String,
        registration_paper: [String],

        // Documents (Binary)
        have_offer_letter: String,
        have_tan_no: String,
        has_salary_slip: String,
        has_bank_statement: String,
        has_current_loan: String,

        // Current Loans
        total_loan_amount: String,
        loan_start_date: String,
        loan_provider_bank: String,
        monthly_emi: String,

        // Property Information
        have_property_for_mortage: String,
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
        coapplicant_aadhar_front: String,
        coapplicant_aadhar_back: String,
        coapplicant_pan: String,
        salary_slip_1: String,
        salary_slip_2: String,
        salary_slip_3: String,
        other_doc: String,
        gst_certificate: String,
        udyam_registration: String,
        form_3: String,
        itr_1: String,
        itr_2: String,
        bank_statement: { type: String, required: true },
        shop_front: String,
        house_electricity: String,
        lpc: String,
        rashid: String,
        mutation: String,
        sale_deed: String,
        property_pic: String,
        property_map: String,
        chain_deed: String,
        other_doc1: String,
        other_doc2: String,
        other_doc3: String,
        documents: [String],

        loanType: { type: String, default: "Home" },
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

export default mongoose.model("HomeLoan", homeLoanSchema);

