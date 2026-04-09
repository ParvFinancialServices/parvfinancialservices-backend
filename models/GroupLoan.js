import mongoose from "mongoose";

const memberDocumentSchema = new mongoose.Schema({
    aadhar_front: String,
    aadhar_back: String,
    photo: String,
    voter_id: String,
    husband_photo: String,
    husband_aadhar_front: String,
    husband_aadhar_back: String,
    husband_voter_id: String,
    joint_photo: String,
}, { _id: false });

const memberSchema = new mongoose.Schema({
    name: String,
    phone: String,
    email: String,
    whatsapp_number: String,
    husband_name: String,
    husband_phone: String,
    husband_profession: String,
    has_own_house: String,
    have_any_current_loan: String,
    past_loan_record: String,
    documents: memberDocumentSchema,
}, { _id: false });

const groupLoanSchema = new mongoose.Schema(
    {
        folderName: { type: String, required: true },

        loanId: { type: String, unique: true },
        amount: { type: String, required: true },
        loan_amount: String, // Legacy
        applicantName: { type: String, required: true },
        phone: { type: String },
        documents: [String],
        bank_statement: { type: String, required: true },
        id_of_connector: String,
        name_of_connector: String,
        group_size: String,
        group_name: String,
        nearest_branch: String,
        group_village: String,
        group_post: String,
        group_police_station: String,
        group_district: String,
        group_pincode: String,

        members: [memberSchema],

        loanType: { type: String, default: "Group" },
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

export default mongoose.model("GroupLoan", groupLoanSchema);

