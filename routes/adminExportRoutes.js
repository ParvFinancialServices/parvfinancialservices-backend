// Backend API endpoint for Excel export
// Place this file in: parv-backend/routes/adminExportRoutes.js

import express from 'express';
import ExcelJS from 'exceljs';
import { checkAuthentication } from '../middleware/auth.js';
import BusinessLoan from '../models/BusinessLoan.js';
import GoldLoan from '../models/GoldLoan.js';
import GroupLoan from '../models/GroupLoan.js';
import HomeLoan from '../models/HomeLoan.js';
import PersonalLoan from '../models/PersonalLoan.js';
import VehicleLoan from '../models/VehicleLoan.js';
import Lead from '../models/Lead.js';
import LoanEnquiry from '../models/LoanEnquiry.js';

const router = express.Router();

const LOAN_MODELS = [
    { key: 'personal', label: 'Personal', Model: PersonalLoan },
    { key: 'business', label: 'Business', Model: BusinessLoan },
    { key: 'home', label: 'Home', Model: HomeLoan },
    { key: 'vehicle', label: 'Vehicle', Model: VehicleLoan },
    { key: 'gold', label: 'Gold', Model: GoldLoan },
    { key: 'group', label: 'Group', Model: GroupLoan },
];

const STATUS_MAP = {
    'application received': 'Application Received',
    'in progress at parv': 'In Progress at PARV',
    'applied to bank': 'Applied to Bank',
    'pendency': 'Pendency',
    'sanctioned': 'Sanctioned',
    'disbursed': 'Disbursed',
    'rejected': 'Rejected',
    'pending': 'Pending',
    'approved': 'Approved',
};

const normalizeStatus = (status) => {
    if (!status) return null;
    const key = String(status).trim().toLowerCase();
    return STATUS_MAP[key] || null;
};

const escapeRegex = (value) => {
    if (typeof value !== 'string') return '';
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const buildLoanFilter = ({ status, loanId, connector, month, year }) => {
    const filter = { isDeleted: false };

    if (status) {
        const normalized = normalizeStatus(status);
        if (normalized) {
            const legacyStatuses = [];
            if (normalized === 'Application Received') legacyStatuses.push('Pending');
            if (normalized === 'Sanctioned') legacyStatuses.push('Approved');
            filter.status = legacyStatuses.length ? { $in: [normalized, ...legacyStatuses] } : normalized;
        } else {
            filter.status = status;
        }
    }

    if (loanId) {
        filter.loanId = { $regex: escapeRegex(loanId), $options: 'i' };
    }

    if (connector) {
        filter.name_of_connector = { $regex: escapeRegex(connector), $options: 'i' };
    }

    if (month && year) {
        const startDate = new Date(Number(year), Number(month) - 1, 1);
        const endDate = new Date(Number(year), Number(month), 0);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt = { $gte: startDate, $lte: endDate };
    }

    return filter;
};

const getModelInfo = (loanType) => {
    if (!loanType) return null;
    const normalized = String(loanType).trim().toLowerCase();
    return LOAN_MODELS.find((x) => x.key === normalized || x.label.toLowerCase() === normalized) || null;
};

const LOAN_EXPORT_COLUMNS = [
    { key: 'loanId', label: 'Loan ID' },
    { key: 'applicantName', label: 'Applicant Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'loanType', label: 'Loan Type' },
    { key: 'amount', label: 'Loan Amount', width: 14 },
    { key: 'purpose_of_loan', label: 'Purpose Of Loan' },
    { key: 'name_of_connector', label: 'Connector Name' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Created Date' },
];

const EXCLUDED_KEYS = [
    '_id', '__v', 'password', 'buffer', 'folderName', 'isDeleted', 'id_of_connector',
    'public_id', 'secure_url', 'asset_id', 'documents', 'updatedAt', 'legacy_id',
    'applicant_selfie', 'aadhar_front', 'aadhar_back', 'Personal_pan', 'salary_slip_1',
    'salary_slip_2', 'salary_slip_3', 'offer_letter', 'other_doc1', 'other_doc2',
    'other_doc3', 'pancard_photo', 'passbook_photo', 'itr_docs', 'bank_statements',
    'other_docs', 'husband_aadhar_front', 'husband_aadhar_back', 'husband_voter_id',
    'husband_photo', 'photo', 'voter_id', 'joint_photo', 'applicant_name', 'loan_amount', 'phone_no'
];

const flattenValue = (value) => {
    if (value instanceof Date) {
        return value;
    }
    if (Array.isArray(value)) {
        if (value.length === 0) return '';

        // If it's an array of simple values
        if (value.every((item) => typeof item !== 'object')) {
            return value.join(', ');
        }

        // Array of objects (e.g., members) - format more nicely
        return value.map((item, index) => {
            if (typeof item !== 'object' || item === null) return String(item);

            // Try to extract a meaningful representation
            const name = item.name || item.fullName || item.applicantName || item.memberName;
            const phone = item.phone || item.contactNo;

            if (name && phone) return `${name} (${phone})`;
            if (name) return name;

            // Fallback for objects without name
            const details = Object.entries(item)
                .filter(([k]) => !EXCLUDED_KEYS.includes(k) && typeof item[k] !== 'object')
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ');

            return details ? `{${details}}` : `Entry ${index + 1}`;
        }).join('; ');
    }

    if (value && typeof value === 'object') {
        const name = value.name || value.fullName || value.label;
        if (name) return name;

        const details = Object.entries(value)
            .filter(([k]) => !EXCLUDED_KEYS.includes(k) && typeof value[k] !== 'object')
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');

        return details ? `{${details}}` : '';
    }

    return value === null || value === undefined ? '' : value;
};

const flattenObject = (obj, parentKey = '', result = {}) => {
    Object.entries(obj).forEach(([key, value]) => {
        // Skip excluded keys
        if (EXCLUDED_KEYS.includes(key)) return;

        const newKey = parentKey ? `${parentKey}.${key}` : key;

        if (value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
            flattenObject(value, newKey, result);
        } else {
            const flattened = flattenValue(value);
            // Only add if there is a value
            if (flattened !== '' && flattened !== null && flattened !== undefined) {
                result[newKey] = flattened;
            }
        }
    });
    return result;
};

const buildColumnsFromRows = (rows) => {
    const allKeys = Array.from(rows.reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key));
        return set;
    }, new Set()));

    return allKeys.map((key) => ({
        key,
        label: key.replace(/\./g, ' ').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
        width: 20,
    }));
};

// Helper function to generate Excel file
async function generateExcelFile(data, columns, fileName) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Add headers
    worksheet.columns = columns.map(col => ({
        header: col.label,
        key: col.key,
        width: col.width || 15,
    }));

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

    // Add data rows
    data.forEach(row => {
        worksheet.addRow(row);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell?.({ includeEmpty: true }, cell => {
            const length = cell.value?.toString().length || 0;
            if (length > maxLength) maxLength = length;
        });
        column.width = Math.min(maxLength + 2, 50);
    });

    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

// Get Applied Loans (JSON)
router.get('/applied-loans', checkAuthentication, async (req, res) => {
    try {
        const { createdById, month, year, status, loanType, loanId, connector } = req.query;
        const selectedModelInfo = getModelInfo(loanType);
        const modelsToQuery = selectedModelInfo ? [selectedModelInfo] : LOAN_MODELS;

        const loanResults = await Promise.all(
            modelsToQuery.map(async ({ key, Model }) => {
                const filter = buildLoanFilter({ status, loanId, connector, month, year });
                if (createdById) {
                    filter.createdById = createdById;
                }
                const docs = await Model.find(filter).sort({ createdAt: -1 }).lean();
                return docs.map(doc => ({
                    id: doc._id,
                    loanId: doc.loanId || String(doc._id),
                    loanType: key.charAt(0).toUpperCase() + key.slice(1),
                    status: normalizeStatus(doc.status) || doc.status || 'Application Received',
                    applicantName: doc.applicantName || doc.applicant_name || doc.group_name || (Array.isArray(doc.members) && doc.members[0]?.name) || 'N/A',
                    loanAmount: doc.amount || doc.loan_amount || 0,
                    createdAt: doc.createdAt,
                    createdByName: doc.createdByName,
                    createdByRole: doc.createdByRole
                }));
            })
        );

        const allLoans = loanResults.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            total: allLoans.length,
            data: allLoans
        });
    } catch (error) {
        console.error('Fetch loans error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch loans' });
    }
});

// Export Applied Loans
router.get('/export/applied-loans', checkAuthentication, async (req, res) => {
    try {
        const { month, year, status, loanType, loanId, connector } = req.query;
        const selectedModelInfo = getModelInfo(loanType);
        const modelsToQuery = selectedModelInfo ? [selectedModelInfo] : LOAN_MODELS;

        const loanResults = await Promise.all(
            modelsToQuery.map(async ({ Model }) => {
                const filter = buildLoanFilter({ status, loanId, connector, month, year });
                return Model.find(filter).lean();
            })
        );

        const rawLoans = loanResults.flat();
        const loans = rawLoans.map((doc) => flattenObject({
            ...doc,
            loanId: doc.loanId || String(doc._id),
            loanType: doc.loanType || doc.loanType || '',
            status: normalizeStatus(doc.status) || doc.status || 'Application Received',
            assignedTo: doc.name_of_connector || doc.connectorName || doc.id_of_connector || '',
            applicantName: doc.applicantName || doc.applicant_name || doc.group_name || (Array.isArray(doc.members) && doc.members[0]?.name) || '',
            createdAt: doc.createdAt || doc.updatedAt || new Date(),
        }));

        const columns = buildColumnsFromRows(loans);

        const fileName = `applied_loans_${month || 'all'}_${year || 'all'}.xlsx`;
        const buffer = await generateExcelFile(loans, columns, fileName);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

// Export Enquiries
router.get('/export/enquiries', checkAuthentication, async (req, res) => {
    try {
        const { month, year, status } = req.query;
        const query = {};

        if (month && year) {
            const startDate = new Date(year, Number(month) - 1, 1);
            const endDate = new Date(year, Number(month), 0);
            endDate.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: startDate, $lte: endDate };
        }

        if (status) {
            query.status = status;
        }

        const enquiries = await LoanEnquiry.find(query).lean();
        const rows = enquiries.map((doc) => ({
            enquiryId: String(doc._id),
            name: doc.fullName || '',
            phone: doc.phone || doc.whatsappNo || '',
            email: doc.email || '',
            loanType: doc.loanProduct || '',
            amount: doc.loanAmount || '',
            createdAt: doc.createdAt || new Date(),
        }));

        const columns = [
            { key: 'enquiryId', label: 'Enquiry ID' },
            { key: 'name', label: 'Name' },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
            { key: 'loanType', label: 'Loan Type' },
            { key: 'amount', label: 'Amount', width: 14 },
            { key: 'createdAt', label: 'Date' },
        ];

        const fileName = `enquiries_${month || 'all'}_${year || 'all'}.xlsx`;
        const buffer = await generateExcelFile(rows, columns, fileName);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

// Export Leads
router.get('/export/leads', checkAuthentication, async (req, res) => {
    try {
        const { month, year } = req.query;
        const query = {};

        if (month && year) {
            const startDate = new Date(year, Number(month) - 1, 1);
            const endDate = new Date(year, Number(month), 0);
            endDate.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: startDate, $lte: endDate };
        }

        const leads = await Lead.find(query).lean();
        const rows = leads.map((doc) => ({
            leadId: String(doc._id),
            name: doc.leadName || '',
            phone: doc.contactNo || doc.whatsappNo || '',
            email: doc.email || '',
            city: doc.city || '',
            state: doc.state || '',
            createdAt: doc.createdAt || new Date(),
        }));

        const columns = [
            { key: 'leadId', label: 'Lead ID' },
            { key: 'name', label: 'Name' },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
            { key: 'city', label: 'City' },
            { key: 'state', label: 'State' },
            { key: 'createdAt', label: 'Date' },
        ];

        const fileName = `leads_${month || 'all'}_${year || 'all'}.xlsx`;
        const buffer = await generateExcelFile(rows, columns, fileName);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

export default router;
