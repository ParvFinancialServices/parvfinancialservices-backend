// Backend API endpoints for filtered data
// Place this file in: parv-backend/routes/adminFilteredRoutes.js

import express from 'express';
import { checkAuthentication } from '../middleware/auth.js';

const router = express.Router();

// Get filtered loans with server-side filtering
router.get('/loans/filtered', checkAuthentication, async (req, res) => {
    try {
        const { month, year, status, search, page = 1, limit = 50 } = req.query;

        let query = {};

        // Month and Year filter
        if (month && year) {
            const startDate = new Date(year, parseInt(month) - 1, 1);
            const endDate = new Date(year, parseInt(month), 0);
            query.createdAt = {
                $gte: startDate,
                $lte: endDate,
            };
        }

        // Status filter
        if (status) {
            query.status = status;
        }

        // Search filter
        if (search) {
            query.$or = [
                { loanId: { $regex: search, $options: 'i' } },
                { applicantName: { $regex: search, $options: 'i' } },
                { applicantEmail: { $regex: search, $options: 'i' } },
            ];
        }

        // Import your Loan model
        // const loans = await Loan.find(query)
        //     .skip((page - 1) * limit)
        //     .limit(limit)
        //     .lean();
        // const total = await Loan.countDocuments(query);

        // Mock data
        const loans = [
            {
                _id: '1',
                loanId: 'LOAN001',
                applicantName: 'John Doe',
                loanType: 'Personal Loan',
                loanAmount: 500000,
                status: 'Approved',
                assignedTo: 'Rajesh Kumar',
                createdAt: new Date(),
            },
            {
                _id: '2',
                loanId: 'LOAN002',
                applicantName: 'Jane Smith',
                loanType: 'Home Loan',
                loanAmount: 2500000,
                status: 'Pending',
                assignedTo: 'Priya Singh',
                createdAt: new Date(),
            },
        ];

        res.json({
            success: true,
            data: loans,
            total: loans.length,
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (error) {
        console.error('Filter error:', error);
        res.status(500).json({ error: 'Failed to fetch filtered data' });
    }
});

// Get filtered enquiries
router.get('/enquiries/filtered', checkAuthentication, async (req, res) => {
    try {
        const { month, year, search, page = 1, limit = 50 } = req.query;

        let query = {};

        if (month && year) {
            const startDate = new Date(year, parseInt(month) - 1, 1);
            const endDate = new Date(year, parseInt(month), 0);
            query.createdAt = {
                $gte: startDate,
                $lte: endDate,
            };
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }

        // Mock data
        const enquiries = [
            {
                _id: '1',
                enquiryId: 'ENQ001',
                name: 'Jane Doe',
                phone: '9876543210',
                email: 'jane@example.com',
                loanType: 'Home Loan',
                amount: 2500000,
                createdAt: new Date(),
            },
        ];

        res.json({
            success: true,
            data: enquiries,
            total: enquiries.length,
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (error) {
        console.error('Filter error:', error);
        res.status(500).json({ error: 'Failed to fetch filtered data' });
    }
});

// Get filtered leads
router.get('/leads/filtered', checkAuthentication, async (req, res) => {
    try {
        const { month, year, search, page = 1, limit = 50 } = req.query;

        let query = {};

        if (month && year) {
            const startDate = new Date(year, parseInt(month) - 1, 1);
            const endDate = new Date(year, parseInt(month), 0);
            query.createdAt = {
                $gte: startDate,
                $lte: endDate,
            };
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }

        // Mock data
        const leads = [
            {
                _id: '1',
                leadId: 'LEAD001',
                name: 'Alice Smith',
                phone: '9876543211',
                email: 'alice@example.com',
                city: 'Mumbai',
                state: 'Maharashtra',
                createdAt: new Date(),
            },
        ];

        res.json({
            success: true,
            data: leads,
            total: leads.length,
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (error) {
        console.error('Filter error:', error);
        res.status(500).json({ error: 'Failed to fetch filtered data' });
    }
});

export default router;
