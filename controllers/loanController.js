import mongoose from "mongoose";
import BusinessLoan from "../models/BusinessLoan.js";
import GoldLoan from "../models/GoldLoan.js";
import GroupLoan from "../models/GroupLoan.js";
import HomeLoan from "../models/HomeLoan.js";
import PersonalLoan from "../models/PersonalLoan.js";
import VehicleLoan from "../models/VehicleLoan.js";
import Lead from "../models/Lead.js";
import User from "../models/User.js";
import DSAIncome from "../models/DSAIncome.js";
import { generateLoanId } from "../utils/generateLoanId.js";

const LOAN_MODELS = [
    { key: "personal", label: "Personal", Model: PersonalLoan },
    { key: "business", label: "Business", Model: BusinessLoan },
    { key: "home", label: "Home", Model: HomeLoan },
    { key: "vehicle", label: "Vehicle", Model: VehicleLoan },
    { key: "gold", label: "Gold", Model: GoldLoan },
    { key: "group", label: "Group", Model: GroupLoan },
];

// Normalized workflow statuses used by the UI.
// We keep legacy values (Pending/Approved) for backward compatibility.
const STATUS_MAP = {
    // UI workflow
    "application received": "Application Received",
    "in progress at parv": "In Progress at PARV",
    "applied to bank": "Applied to Bank",
    "pendency": "Pendency",
    "sanctioned": "Sanctioned",
    "disbursed": "Disbursed",
    "rejected": "Rejected",

    // Legacy values
    "pending": "Application Received",
    "approved": "Sanctioned",
};

const normalizeStatus = (status) => {
    if (!status) return "Application Received";
    const key = String(status).trim().toLowerCase();
    return STATUS_MAP[key] || null;
};

const isAllowedStatus = (status) => {
    const normalized = normalizeStatus(status);
    return Boolean(normalized);
};

const getModelInfo = (loanType) => {
    if (!loanType) return null;
    const normalized = String(loanType).trim().toLowerCase();
    const found = LOAN_MODELS.find((x) => x.key === normalized || x.label.toLowerCase() === normalized);
    return found || null;
};

const canManageLoan = (role) => {
    const normalized = String(role || "").trim().toLowerCase();
    return normalized === "admin" || normalized === "rm";
};

const MONEY_KEYWORDS = ["amount", "emi", "cost", "turnover", "income", "need", "loan"];

const sanitizeLoanPayload = (value, key = "") => {
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeLoanPayload(item, key));
    }

    if (value && typeof value === "object" && !(value instanceof Date)) {
        return Object.entries(value).reduce((acc, [childKey, childValue]) => {
            const sanitized = sanitizeLoanPayload(childValue, childKey);
            if (sanitized !== undefined) acc[childKey] = sanitized;
            return acc;
        }, {});
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        const lowerKey = String(key || "").toLowerCase();
        const looksLikeMoney = MONEY_KEYWORDS.some((token) => lowerKey.includes(token));
        if (looksLikeMoney) {
            return trimmed.replace(/[₹,\s]/g, "");
        }
        return trimmed;
    }

    return value;
};

const normalizeLoanPayload = (payload, existingDoc = null) => {
    const normalized = sanitizeLoanPayload(payload || {});

    // Keep model identity stable on updates.
    delete normalized._id;
    delete normalized.id;
    delete normalized.createdAt;
    delete normalized.updatedAt;
    delete normalized.isDeleted;
    delete normalized.__v;

    if (existingDoc?.loanId) normalized.loanId = existingDoc.loanId;
    if (existingDoc?.loanType) normalized.loanType = existingDoc.loanType;
    if (existingDoc?.status && !Object.prototype.hasOwnProperty.call(normalized, "status")) {
        normalized.status = existingDoc.status;
    }

    if (!normalized.applicantName && normalized.applicant_name) normalized.applicantName = normalized.applicant_name;
    if (!normalized.applicantName && normalized.group_name) normalized.applicantName = normalized.group_name;
    if (!normalized.applicantName && normalized.members?.length) normalized.applicantName = normalized.members[0]?.name;

    if (!normalized.phone && normalized.phone_no) normalized.phone = normalized.phone_no;
    if (!normalized.phone && normalized.members?.length) normalized.phone = normalized.members[0]?.phone;

    if (!normalized.amount && normalized.loan_amount) normalized.amount = normalized.loan_amount;

    return normalized;
};

const escapeRegex = (value) => {
    if (typeof value !== "string") return "";
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const buildModelFilter = ({ status, search, loanId, connector, createdById, startDate, endDate }, modelKey) => {
    const filter = { isDeleted: false };

    if (status && status !== "all") {
        const normalizedStatus = normalizeStatus(status);
        // If it is a legacy status we map it to the normalized workflow.
        if (normalizedStatus) {
            // Include legacy values so older records still match the new UI filter.
            const legacyStatuses = [];
            if (normalizedStatus === "Application Received") legacyStatuses.push("Pending");
            if (normalizedStatus === "Sanctioned") legacyStatuses.push("Approved");

            filter.status = legacyStatuses.length
                ? { $in: [normalizedStatus, ...legacyStatuses] }
                : normalizedStatus;
        } else {
            filter.status = status;
        }
    }

    if (createdById) {
        filter.createdById = createdById;
    }

    if (search) {
        const safeSearch = escapeRegex(search);
        filter.$or = [
            { applicantName: { $regex: safeSearch, $options: "i" } },
            { applicant_name: { $regex: safeSearch, $options: "i" } },
            { group_name: { $regex: safeSearch, $options: "i" } },
            { phone: { $regex: safeSearch, $options: "i" } },
            { phone_no: { $regex: safeSearch, $options: "i" } },
            { loanId: { $regex: safeSearch, $options: "i" } },
            { connectorName: { $regex: safeSearch, $options: "i" } }
        ];
    }

    if (loanId) {
        filter.loanId = { $regex: escapeRegex(loanId), $options: "i" };
    }

    if (connector) {
        filter.connectorName = { $regex: escapeRegex(connector), $options: "i" };
    }

    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.createdAt.$lte = end;
        }
    }

    return filter;
};

const toUnifiedListItem = (doc, modelKey) => {
    const applicantName =
        doc.applicantName ||
        doc.applicant_name ||
        doc.group_name ||
        (Array.isArray(doc.members) && doc.members[0]?.name) ||
        "";

    const phone =
        doc.phone ||
        doc.phone_no ||
        (Array.isArray(doc.members) && doc.members[0]?.phone) ||
        "";

    return {
        id: String(doc._id),
        loanId: doc.loanId || "",
        loanType: doc.loanType || LOAN_MODELS.find((x) => x.key === modelKey)?.label || "Unknown",
        applicantName,
        phone,
        loanAmount: doc.amount || doc.loan_amount || "",
        connectorName: doc.name_of_connector || "",
        status: normalizeStatus(doc.status) || doc.status || "Application Received",
        createdAt: doc.createdAt,
    };
};

export const createLoan = async (req, res) => {
    try {
        const sanitizedBody = normalizeLoanPayload(req.body);
        const { loanType } = sanitizedBody;

        const modelInfo = getModelInfo(loanType);
        if (!modelInfo) {
            return res.status(400).json({ success: false, message: `Unknown or missing loanType: ${loanType}` });
        }

        const Model = modelInfo.Model;

        // Generate a standard loanId
        const loanId = await generateLoanId(modelInfo.label, Model);

        // Construct standard fields from fallbacks if needed
        const loanData = {
            ...sanitizedBody,
            loanId,
            loanType: modelInfo.label
        };

        // Default status for new loans (required by UI).
        const normalized = normalizeStatus(loanData.status);
        if (!normalized) {
            return res.status(400).json({ success: false, message: "Invalid loan status" });
        }
        loanData.status = normalized;

        // Handle legacy fallbacks automatically for smooth transition
        // Frontend might still be sending applicant_name instead of applicantName
        if (!loanData.applicantName && loanData.applicant_name) loanData.applicantName = loanData.applicant_name;
        if (!loanData.applicantName && loanData.group_name) loanData.applicantName = loanData.group_name;
        if (!loanData.applicantName && loanData.members && loanData.members.length > 0) loanData.applicantName = loanData.members[0].name;

        if (!loanData.phone && loanData.phone_no) loanData.phone = loanData.phone_no;
        if (!loanData.phone && loanData.members && loanData.members.length > 0) loanData.phone = loanData.members[0].phone;

        if (!loanData.amount && loanData.loan_amount) loanData.amount = loanData.loan_amount;

        // Set creator info from authenticated user
        if (req.user) {
            loanData.createdById = req.userId;
            loanData.createdByName = req.user.full_name || req.user.username;
            loanData.createdByRole = req.user.role;
        }

        const loan = await Model.create(loanData);
        res.status(201).json({ success: true, data: loan });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getAllLoans = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = "",
            loanId = "",
            connector = "",
            status = "all",
            loanType = "all",
            sortOrder = "desc",
            startDate,
            endDate,
        } = req.query;

        const pageNum = Math.max(Number(page) || 1, 1);
        const pageLimit = Math.min(Math.max(Number(limit) || 10, 1), 200);
        const query = {
            search: String(search || "").trim(),
            loanId: String(loanId || "").trim(),
            connector: String(connector || "").trim(),
            status: String(status || "all"),
            createdById: req.query.createdById || null,
            startDate,
            endDate,
        };

        const modelInfo = getModelInfo(loanType);
        const selectedModels = modelInfo ? [modelInfo] : LOAN_MODELS;

        const results = await Promise.all(
            selectedModels.map(async ({ key, Model }) => {
                const filter = buildModelFilter(query, key);
                const docs = await Model.find(filter).lean();
                return docs.map((d) => toUnifiedListItem(d, key));
            })
        );

        const all = results.flat();
        all.sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
        });

        const totalCount = all.length;
        const start = (pageNum - 1) * pageLimit;
        const data = all.slice(start, start + pageLimit);

        res.json({
            success: true,
            total: totalCount,
            totalCount,
            page: pageNum,
            limit: pageLimit,
            data,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getLoansByType = async (req, res) => {
    try {
        const { loanType } = req.params;
        const reqQuery = { ...req.query, loanType };
        // We can just reuse getAllLoans logic but with loanType pinned!
        req.query = reqQuery;
        return getAllLoans(req, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export const getLoanById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid loan id" });
        }

        const lookups = await Promise.all(
            LOAN_MODELS.map(async ({ key, label, Model }) => {
                const loan = await Model.findOne({ _id: id, isDeleted: false }).lean();
                return loan ? { key, label, loan } : null;
            })
        );

        const found = lookups.find(Boolean);
        if (!found) return res.status(404).json({ success: false, message: "Loan not found" });

        const normalizedData = { ...(found.loan || {}) };
        normalizedData.status = normalizeStatus(normalizedData.status) || normalizedData.status;

        res.json({
            success: true,
            loanType: found.loan.loanType || found.label,
            loanKey: found.key,
            data: normalizedData,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateLoan = async (req, res) => {
    try {
        const { id } = req.params;
        if (!canManageLoan(req.userRole)) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid loan id" });
        }

        const lookups = await Promise.all(
            LOAN_MODELS.map(async ({ key, label, Model }) => {
                const loan = await Model.findOne({ _id: id, isDeleted: false });
                return loan ? { Model, doc: loan } : null;
            })
        );

        const found = lookups.find(Boolean);
        if (!found) return res.status(404).json({ success: false, message: "Loan not found" });

        if (!req.body || !Object.keys(req.body).length) {
            return res.status(400).json({ success: false, message: "No update payload provided" });
        }

        const payload = normalizeLoanPayload(req.body, found.doc);

        if (payload && Object.prototype.hasOwnProperty.call(payload, "status")) {
            const normalizedStatus = normalizeStatus(payload.status);
            if (!normalizedStatus) {
                return res.status(400).json({ success: false, message: "Invalid loan status" });
            }

            payload.status = normalizedStatus;
        }

        const updated = await found.Model.findByIdAndUpdate(
            id,
            payload,
            { new: true, runValidators: true }
        );

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Dedicated endpoint for UI status workflow updates (Admin/RM only).
export const updateLoanStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body || {};

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid loan id" });
        }
        if (!status) {
            return res.status(400).json({ success: false, message: "Status is required" });
        }

        const role = String(req.userRole || "").toLowerCase();
        if (role !== "admin" && role !== "rm") {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const normalizedStatus = normalizeStatus(status);
        if (!normalizedStatus) {
            return res.status(400).json({ success: false, message: "Invalid loan status" });
        }

        const lookups = await Promise.all(
            LOAN_MODELS.map(async ({ Model }) => {
                const loan = await Model.findOne({ _id: id, isDeleted: false });
                return loan ? { Model, doc: loan } : null;
            })
        );

        const found = lookups.find(Boolean);
        if (!found) return res.status(404).json({ success: false, message: "Loan not found" });

        const updated = await found.Model.findByIdAndUpdate(
            id,
            { status: normalizedStatus },
            { new: true, runValidators: true }
        );

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteLoan = async (req, res) => {
    try {
        const { id } = req.params;
        if (!canManageLoan(req.userRole)) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid loan id" });
        }

        const lookups = await Promise.all(
            LOAN_MODELS.map(async ({ key, label, Model }) => {
                const loan = await Model.findOne({ _id: id, isDeleted: false });
                return loan ? { Model, doc: loan } : null;
            })
        );

        const found = lookups.find(Boolean);
        if (!found) return res.status(404).json({ success: false, message: "Loan not found" });

        await found.Model.findByIdAndUpdate(id, { isDeleted: true });
        res.json({ success: true, message: "Loan deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getDashboardStats = async (req, res) => {
    try {
        const isAdmin = req.userRole === "Admin";
        const connectorFilter = isAdmin ? {} : { id_of_connector: req.user.username };
        const dsaIncomeFilter = isAdmin ? {} : { connectorId: req.user.username };

        // --- Per-type stats ---
        const typeStats = await Promise.all(
            LOAN_MODELS.map(async ({ key, label, Model }) => {
                const filter = { isDeleted: false, ...connectorFilter };
                const [count, amountAgg] = await Promise.all([
                    Model.countDocuments(filter),
                    Model.aggregate([
                        { $match: filter },
                        { $project: { amt: { $toDouble: { $ifNull: ["$amount", "$loan_amount", 0] } } } },
                        { $group: { _id: null, total: { $sum: "$amt" } } }
                    ])
                ]);
                return {
                    label,
                    count,
                    amount: amountAgg[0]?.total || 0
                };
            })
        );

        const totalApplications = typeStats.reduce((s, t) => s + t.count, 0);
        const totalAmount = typeStats.reduce((s, t) => s + t.amount, 0);

        const typeWise = {};
        typeStats.forEach(({ label, count, amount }) => {
            typeWise[label] = { count, amount };
        });

        // --- 12-month trend ---
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

        const monthlyTrend = await Promise.all(
            LOAN_MODELS.map(async ({ Model }) => {
                return Model.aggregate([
                    { $match: { isDeleted: false, ...connectorFilter, createdAt: { $gte: twelveMonthsAgo } } },
                    {
                        $group: {
                            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
                            count: { $sum: 1 },
                            amount: { $sum: { $toDouble: { $ifNull: ["$amount", "$loan_amount", 0] } } }
                        }
                    }
                ]);
            })
        );

        // Merge all model monthly data
        const monthMap = {};
        monthlyTrend.flat().forEach(({ _id, count, amount }) => {
            const key = `${_id.year}-${String(_id.month).padStart(2, "0")}`;
            if (!monthMap[key]) monthMap[key] = { count: 0, amount: 0, year: _id.year, month: _id.month };
            monthMap[key].count += count;
            monthMap[key].amount += amount;
        });

        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const monthly = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            monthly.push({
                month: monthNames[d.getMonth()],
                year: d.getFullYear(),
                applications: monthMap[key]?.count || 0,
                amount: monthMap[key]?.amount || 0
            });
        }

        // --- Recent 5 applications (across all models) ---
        const recentDocs = await Promise.all(
            LOAN_MODELS.map(async ({ key, Model }) => {
                const docs = await Model.find({ isDeleted: false, ...connectorFilter })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .lean();
                return docs.map(d => toUnifiedListItem(d, key));
            })
        );
        const recentApplications = recentDocs
            .flat()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        // --- Commission Stats ---
        const commissionHistory = await DSAIncome.find(dsaIncomeFilter);
        const commissionStats = commissionHistory.reduce((acc, curr) => {
            acc.totalEarnings += (curr.income || 0);
            acc.totalPaid += (curr.paid || 0);
            acc.totalPending += (curr.unpaid || 0);
            return acc;
        }, { totalEarnings: 0, totalPaid: 0, totalPending: 0 });

        // --- Lead stats ---
        const [totalLeads, leadsBySource] = await Promise.all([
            Lead.countDocuments(connectorFilter),
            Lead.aggregate([
                { $match: connectorFilter },
                { $group: { _id: "$leadSource", count: { $sum: 1 } } }
            ])
        ]);
        const leadSource = {};
        leadsBySource.forEach(({ _id, count }) => { leadSource[_id || "Unknown"] = count; });

        // --- User stats (Only relevant for Admin) ---
        let usersData = { total: 0, byRole: {} };
        if (isAdmin) {
            const usersByRole = await User.aggregate([
                { $group: { _id: "$role", count: { $sum: 1 } } }
            ]);
            usersData.total = usersByRole.reduce((s, r) => s + r.count, 0);
            usersByRole.forEach(({ _id, count }) => { usersData.byRole[_id || "Unknown"] = count; });
        }

        res.json({
            success: true,
            data: {
                totalApplications,
                totalAmount,
                typeWise,
                monthly,
                recentApplications,
                commissionStats,
                leads: { total: totalLeads, bySource: leadSource },
                users: usersData
            }
        });
    } catch (error) {
        console.error("Dashboard stats error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
