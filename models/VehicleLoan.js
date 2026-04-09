import mongoose from "mongoose";

const loanHistorySchema = new mongoose.Schema({
    loan_provider_bank: String,
    total_loan_amount: String,
    current_emi: String,
    remaining_amount: String,
}, { _id: false });

const vehicleLoanSchema = new mongoose.Schema(
    {
        folderName: { type: String, required: true },

        // Vehicle Details
        which_vehicle: String,
        when_purchase: String,
        estimated_cost: String,
        loan_you_need: String,
        profession: String,

        // Co-applicant
        have_coapplicant: String,
        co_applicant_dob: String,
        co_applicant_name: String,
        co_occupation: String,
        relation_with_applicant: String,

        // Personal Details
        loanId: { type: String, unique: true },
        amount: { type: String, required: true },
        loan_amount: String, // Legacy
        id_of_connector: String,
        name_of_connector: String,
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

        // Employment - Business
        company_name: String,
        company_age: String,
        registration_paper: [String],

        // Employment - Job
        current_company_name: String,
        salary_account_bank: String,
        savings_account_bank: String,
        job_tenure: String,
        job_experience: String,
        monthly_income: String,

        // Current Account
        have_current_account: String,
        current_account_bank_name: String,
        name_in_current_account: String,
        current_account_age: String,
        current_account_turnover: String,

        // Saving Account
        saving_account_bank_name: String,
        saving_account_turnover: String,

        // Loan History
        loanHistory: [loanHistorySchema],

        // Property
        have_property_for_mortage: String,
        property_location: String,
        who_own_property: String,
        have_17_kahta_agri_land: String,
        needs_of_documents: [String],

        // Documents
        applicant_selfie: String,
        aadhar_front: String,
        aadhar_back: String,
        personal_pan: String,
        address_prooof: String,
        coapplicant_aadhar_front: String,
        coapplicant_aadhar_back: String,
        coapplicant_pan: String,
        salary_slip_1: String,
        salary_slip_2: String,
        salary_slip_3: String,
        form_16_itr_1: String,
        form_16_itr_2: String,
        electricity_bill: String,
        business_images: String,
        business_proof: String,
        itr_1: String,
        itr_2: String,
        another_1: String,
        another_2: String,
        another_3: String,
        sale_deed: String,
        mutation: String,
        rashid: String,
        lpc: String,
        property_pic: String,
        property_map: String,
        chain_deed: String,
        guarantor_aadhar_front: String,
        guarantor_aadhar_back: String,
        guarantor_pan: String,
        vehicle_quotation: String,
        owner_book: String,
        bank_statement: { type: String, required: true },
        documents: [String],

        loanType: { type: String, default: "Vehicle" },
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

export default mongoose.model("VehicleLoan", vehicleLoanSchema);

