import User from '../models/User.js';
import Loan from '../models/Loan.js';
import PersonalLoan from '../models/PersonalLoan.js';
import BusinessLoan from '../models/BusinessLoan.js';
import HomeLoan from '../models/HomeLoan.js';
import VehicleLoan from '../models/VehicleLoan.js';
import GoldLoan from '../models/GoldLoan.js';
import GroupLoan from '../models/GroupLoan.js';
import DSAIncome from '../models/DSAIncome.js';
import crypto from 'crypto';
import sendMail from '../emails/mail.js';
import mongoose from 'mongoose';

const DSA_LOAN_MODELS = [
  { loanType: 'Personal', Model: PersonalLoan },
  { loanType: 'Business', Model: BusinessLoan },
  { loanType: 'Home', Model: HomeLoan },
  { loanType: 'Vehicle', Model: VehicleLoan },
  { loanType: 'Gold', Model: GoldLoan },
  { loanType: 'Group', Model: GroupLoan }
];

const normalizeDSALoan = (doc, loanTypeFallback = 'Unknown') => ({
  id: doc._id.toString(),
  loanId: doc.loanId || '',
  connectorId: doc.id_of_connector || '',
  connectorName: doc.name_of_connector || '',
  applicantName:
    doc.applicantName ||
    doc.applicant_name ||
    doc.group_name ||
    doc.members?.[0]?.name ||
    '',
  phone:
    doc.phone ||
    doc.phone_no ||
    doc.members?.[0]?.phone ||
    '',
  loanAmount: doc.amount || doc.loan_amount || 0,
  loanType: doc.loanType || loanTypeFallback,
  status: doc.status || 'Application Received',
  createdAt: doc.createdAt || null
});

export const createEmployee = async (req, res) => {
  try {
    console.log("Create Employee Request Body:", req.body); // Debug Log
    const role = req.body?.role; // "RM", "FieldStaff", "Telecaller", "DSA"

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required."
      });
    }

    // Role → Prefix Mapping
    const rolePrefixes = {
      DSA: "PDSA",
      RM: "RM",
      Field_staff: "FS",
      Telecaller: "TC"
    };

    const prefix = rolePrefixes[role];
    console.log("Prefix:", prefix); // Debug Log

    if (!prefix) {
      return res.status(400).json({
        success: false,
        message: "Invalid role."
      });
    }

    // Count documents for auto-numbering
    const count = await User.countDocuments({ role });
    const nextNumber = count + 1;

    // Format username with padded number
    const username = `${prefix}${String(nextNumber).padStart(4, "0")}`;

    // Generate salt
    const salt = crypto.randomBytes(16).toString("hex");

    // Read body safely
    const fullName = req.body?.full_name || "";
    const phoneNo = req.body?.phone_no || "";
    const email = req.body?.email || "";

    if (fullName.length < 3 || phoneNo.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Full name must be 3+ chars and phone number must be valid."
      });
    }

    // Auto-generate temporary password
    const tempPassword =
      fullName.slice(0, 3).toLowerCase() + phoneNo.slice(0, 3);

    const passwordHash = User.generatePassword(tempPassword, salt);

    // Prepare data
    const employeeData = {
      ...req.body,
      username,
      password: passwordHash,
      salt,
      email,
      role,
      status: "approved",
      createdAt: new Date()
    };

    // Create employee in DB
    const newEmp = await User.create(employeeData);

    // Send welcome email
    const mailRes = await sendMail("PasswordSending", {
      fullName,
      username,
      password: tempPassword,
      email
    });

    // If email failed
    if (mailRes?.err) {
      return res.status(201).json({
        success: true,
        message: "Account created but email failed to send.",
        data: { username, tempPassword }
      });
    }

    // Success response
    res.status(201).json({
      success: true,
      message: `${role} account created successfully.`,
      data: { username, tempPassword }
    });

  } catch (error) {
    console.error("Create Employee Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Username or email already exists."
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create employee.",
      error: error.message
    });
  }
};

const ALLOWED_USER_STATUSES = new Set(["pending", "approved", "rejected", "inactive"]);

const updateUserStatusRecord = async ({ userId, status, remarks }) => {
  const user = await User.findById(userId);

  if (!user) {
    return { notFound: true };
  }

  if (!ALLOWED_USER_STATUSES.has(status)) {
    return { invalidStatus: true };
  }

  user.status = status;
  user.approvedAt = status === "approved" ? new Date() : null;
  if (typeof remarks === "string") {
    user.reviewRemarks = remarks.trim();
  }
  await user.save();

  return { user };
};

// Approve DSA Form 
export const approveDSAForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const nextStatus = req.body?.status || "approved";
    const result = await updateUserStatusRecord({
      userId: formId,
      status: nextStatus,
      remarks: req.body?.remarks,
    });

    if (result?.notFound) {
      return res.status(404).json({
        success: false,
        message: 'DSA not found'
      });
    }

    if (result?.invalidStatus) {
      return res.status(400).json({
        success: false,
        message: 'Invalid DSA status'
      });
    }

    const { user } = result;

    if (!user.email || !user.password || !user.username) {
      return res.status(400).json({
        success: false,
        message: 'Invalid DSA data'
      });
    }

    if (user.status !== "approved") {
      return res.status(200).json({
        success: true,
        message: `DSA ${formId} marked as ${user.status}`,
        data: user
      });
    }

    // Send approval email
    const mailRes = await sendMail('dsa_approved', {
      email: user.email,
      fullName: user.full_name || "User",
      username: user.username,
      password: user.password
    }, "DSA Approval Successful");

    if (mailRes?.err) {
      return res.status(200).json({
        success: true,
        message: `DSA ${formId} approved but email failed`,
        data: user
      });
    }

    res.status(200).json({
      success: true,
      message: `DSA ${formId} approved successfully`,
      data: user
    });

  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve DSA',
      error: error.message
    });
  }
};

export const updateUserApprovalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body || {};

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const result = await updateUserStatusRecord({
      userId: id,
      status,
      remarks,
    });

    if (result?.notFound) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (result?.invalidStatus) {
      return res.status(400).json({
        success: false,
        message: "Invalid user status"
      });
    }

    const { user } = result;

    if (user.status === "approved" && user.email && user.username && user.password) {
      await sendMail('dsa_approved', {
        email: user.email,
        fullName: user.full_name || "User",
        username: user.username,
        password: user.password
      }, "DSA Approval Successful");
    }

    return res.status(200).json({
      success: true,
      message: `User status updated to ${user.status}`,
      data: user
    });
  } catch (error) {
    console.error("Update user status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: error.message
    });
  }
};

/* ──────────────────────────────────────────────────────────────────────────
   COMMISSION / INCOME MANAGEMENT
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Fetch all disbursed loans across all collections (Admin/DSA)
 */
export const getDisbursedLoans = async (req, res) => {
  try {
    const isAdmin = req.userRole === "Admin";
    const connectorId = req.query.connectorId || "";

    // If not admin, strictly filter by their own username
    let filter = { status: "Disbursed", isDeleted: false };
    if (!isAdmin) {
      filter.id_of_connector = req.user.username;
    } else if (connectorId) {
      filter.id_of_connector = connectorId;
    }

    const loanResults = await Promise.all(
      DSA_LOAN_MODELS.map(({ Model }) => Model.find(filter).lean())
    );

    const allDisbursed = loanResults
      .flatMap((docs, index) =>
        docs.map((doc) => normalizeDSALoan(doc, DSA_LOAN_MODELS[index].loanType))
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Fetch existing commissions to map them
    const loanIds = allDisbursed.map(l => l.loanId);
    const existingCommissions = await DSAIncome.find({ loanId: { $in: loanIds } });
    const commissionMap = existingCommissions.reduce((acc, curr) => {
      acc[curr.loanId] = curr;
      return acc;
    }, {});

  const enrichedLoans = allDisbursed.map(loan => ({
      ...loan,
      commission: commissionMap[loan.loanId] || null
    }));

    res.status(200).json({
      success: true,
      data: enrichedLoans
    });
  } catch (error) {
    console.error("Get disbursed loans error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch disbursed loans",
      error: error.message
    });
  }
};

/**
 * Assign or update commission for a loan (Admin Only)
 */
export const assignCommission = async (req, res) => {
  try {
    const { loanId, connectorId, applicantName, loanType, loanAmount, income } = req.body;

    if (!loanId) {
      return res.status(400).json({ success: false, message: "Loan ID is required" });
    }

    if (!connectorId) {
      return res.status(400).json({
        success: false,
        message: "Commission can only be assigned to loans linked with a DSA/connector"
      });
    }

    let record = await DSAIncome.findOne({ loanId });

    if (record) {
      record.income = income;
      // Keep unpaid balance in sync: total income - what's already paid
      record.unpaid = Math.max(0, income - (record.paid || 0));
      
      // Update status based on new balance
      if (record.unpaid === 0 && record.income > 0) {
        record.status = 'Paid';
      } else {
        record.status = 'Pending';
      }
    } else {
      record = new DSAIncome({
        loanId,
        connectorId,
        applicantName,
        loanType,
        loanAmount,
        income,
        paid: 0,
        unpaid: income,
        status: 'Pending'
      });
    }

    await record.save();

    res.status(200).json({
      success: true,
      message: "Commission assigned successfully",
      data: record
    });
  } catch (error) {
    console.error("Assign commission error:", error);
    res.status(500).json({ success: false, message: "Failed to assign commission" });
  }
};

/**
 * Update commission payment status (Admin Only)
 * Now supports partial payments
 */
export const updateCommissionPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { amountPaid, paymentDate, paymentMode } = req.body;

    const record = await DSAIncome.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Commission record not found" });
    }

    const payValue = Number(amountPaid) || 0;
    
    // Update paid amount (accumulative)
    record.paid = (record.paid || 0) + payValue;
    
    // Recalculate unpaid balance
    record.unpaid = Math.max(0, record.income - record.paid);
    
    // Update status based on balance
    if (record.unpaid === 0) {
      record.status = 'Paid';
    } else {
      record.status = 'Pending';
    }

    record.paymentDate = paymentDate || new Date();
    record.paymentMode = paymentMode || 'UPI';

    await record.save();

    res.status(200).json({
      success: true,
      message: payValue > 0 ? `Paid ₹${payValue} successfully` : "Payment status updated",
      data: record
    });
  } catch (error) {
    console.error("Update commission status error:", error);
    res.status(500).json({ success: false, message: "Failed to update payment" });
  }
};

/**
 * Get Commission History / Income List (Admin/DSA)
 */
export const getCommissionHistory = async (req, res) => {
  try {
    const isAdmin = req.userRole === "Admin";
    const { connectorId, status, startDate, endDate } = req.query;

    let filter = {};
    if (!isAdmin) {
      filter.connectorId = req.user.username;
    } else if (connectorId) {
      filter.connectorId = connectorId;
    }

    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const history = await DSAIncome.find(filter).sort({ createdAt: -1 });

    // Aggregate stats correctly for the dashboard
    const stats = history.reduce((acc, curr) => {
      acc.totalEarnings += (curr.income || 0);
      acc.totalPaid += (curr.paid || 0);
      acc.totalPending += (curr.unpaid || 0);
      return acc;
    }, { totalEarnings: 0, totalPaid: 0, totalPending: 0 });

    res.status(200).json({
      success: true,
      data: history,
      stats
    });
  } catch (error) {
    console.error("Get commission history error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch history" });
  }
};


export const getDSAData = async (req, res) => {
  try {
    const pageSize = parseInt(req.query.pageSize) || 15;
    const startAfterId = req.query.startAfterId || null;
    const singleId = req.query.id || null;

    // --------------------------------------------------------
    // CASE 1: RETURN SINGLE DSA DETAILS IF ID PROVIDED
    // --------------------------------------------------------
    if (singleId) {
      const details = await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(singleId), role: "DSA" } },
        {
          $project: {
            password: 0,
            salt: 0,
            __v: 0
          }
        }
      ]);

      if (!details.length) {
        return res.status(404).json({
          success: false,
          message: "No DSA found with this ID",
        });
      }

      return res.status(200).json({
        success: true,
        data: details[0],
      });
    }

    // --------------------------------------------------------
    // CASE 2: PAGINATED DSA LIST (AGGREGATION)
    // --------------------------------------------------------

    let matchStage = { role: "DSA" };

    // Apply cursor pagination using date & _id
    if (startAfterId) {
      const doc = await User.findById(startAfterId).lean();
      if (doc) {
        matchStage = {
          ...matchStage,
          date: { $lt: doc.date }, // show newer → older
        };
      }
    }

    const pipeline = [
      { $match: matchStage },

      // Sort newest first
      { $sort: { date: -1 } },

      // Limit
      { $limit: pageSize },

      {
        $project: {
          password: 0,
          salt: 0,
          __v: 0,
        }
      },
    ];

    const data = await User.aggregate(pipeline);

    // Get total count
    const totalCount = await User.countDocuments({ role: "DSA" });
    const totalPages = Math.ceil(totalCount / pageSize);

    const firstDoc = data.length ? data[0] : null;
    const lastDoc = data.length ? data[data.length - 1] : null;

    return res.status(200).json({
      success: true,
      data,
      pageSize,
      totalPages,
      totalCount,
      firstDocId: firstDoc ? firstDoc._id.toString() : null,
      lastDocId: lastDoc ? lastDoc._id.toString() : null,
    });

  } catch (error) {
    console.error("Get DSA data error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch DSA data",
      error: error.message,
    });
  }
};
// Get RM Data with Pagination
export const getRMData = async (req, res) => {
  try {
    const pageSize = parseInt(req.query.pageSize) || 15;
    const pageNumber = parseInt(req.query.pageNumber) || 1;
    const startAfterDocId = req.query.startAfterDocId || null;

    let query = User.find({ role: 'RM' }).sort({ createdAt: -1 });

    // Apply pagination cursor if not first page
    if (startAfterDocId) {
      const startDoc = await User.findById(startAfterDocId);
      if (startDoc) {
        query = query.where('createdAt').lt(startDoc.createdAt);
      }
    }

    query = query.limit(pageSize);

    const result = await query.select('-password -salt');

    // Get total count
    const totalCount = await User.countDocuments({ role: 'RM' });
    const totalPages = Math.ceil(totalCount / pageSize);

    // Get first & last visible docs
    const firstDoc = result.length > 0 ? result[0] : null;
    const lastDoc = result.length > 0 ? result[result.length - 1] : null;

    res.status(200).json({
      success: true,
      data: result,
      currentPage: pageNumber,
      totalPages,
      totalCount,
      firstDocId: firstDoc ? firstDoc._id.toString() : null,
      lastDocId: lastDoc ? lastDoc._id.toString() : null
    });
  } catch (error) {
    console.error('Get RM data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RM data',
      error: error.message
    });
  }
};
// Get Telecaller Data with Pagination
export const getTelecallerData = async (req, res) => {
  try {
    const pageSize = parseInt(req.query.pageSize) || 15;
    const pageNumber = parseInt(req.query.pageNumber) || 1;
    const startAfterDocId = req.query.startAfterDocId || null;

    let query = User.find({ role: 'Telecaller' }).sort({ createdAt: -1 });

    // Apply pagination cursor if not first page
    if (startAfterDocId) {
      const startDoc = await User.findById(startAfterDocId);
      if (startDoc) {
        query = query.where('createdAt').lt(startDoc.createdAt);
      }
    }

    query = query.limit(pageSize);

    const result = await query.select('-password -salt');

    // Get total count
    const totalCount = await User.countDocuments({ role: 'Telecaller' });
    const totalPages = Math.ceil(totalCount / pageSize);

    // Get first & last visible docs
    const firstDoc = result.length > 0 ? result[0] : null;
    const lastDoc = result.length > 0 ? result[result.length - 1] : null;

    res.status(200).json({
      success: true,
      data: result,
      currentPage: pageNumber,
      totalPages,
      totalCount,
      firstDocId: firstDoc ? firstDoc._id.toString() : null,
      lastDocId: lastDoc ? lastDoc._id.toString() : null
    });
  } catch (error) {
    console.error('Get Telecaller data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Telecaller data',
      error: error.message
    });
  }
};
// Get Field Staff Data with Pagination
export const getFieldStaffData = async (req, res) => {
  try {
    const pageSize = parseInt(req.query.pageSize) || 15;
    const pageNumber = parseInt(req.query.pageNumber) || 1;
    const startAfterDocId = req.query.startAfterDocId || null;

    let query = User.find({ role: 'Field_staff' }).sort({ createdAt: -1 });

    // Apply pagination cursor if not first page
    if (startAfterDocId) {
      const startDoc = await User.findById(startAfterDocId);
      if (startDoc) {
        query = query.where('createdAt').lt(startDoc.createdAt);
      }
    }

    query = query.limit(pageSize);

    const result = await query.select('-password -salt');

    // Get total count
    const totalCount = await User.countDocuments({ role: 'Field_staff' });
    const totalPages = Math.ceil(totalCount / pageSize);

    // Get first & last visible docs
    const firstDoc = result.length > 0 ? result[0] : null;
    const lastDoc = result.length > 0 ? result[result.length - 1] : null;

    res.status(200).json({
      success: true,
      data: result,
      currentPage: pageNumber,
      totalPages,
      totalCount,
      firstDocId: firstDoc ? firstDoc._id.toString() : null,
      lastDocId: lastDoc ? lastDoc._id.toString() : null
    });
  } catch (error) {
    console.error('Get Field Staff data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Field Staff data',
      error: error.message
    });
  }
};
// Get Employee Data By Username (for Field Staff, Telecaller, RM profiles)
export const getEmployeeByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).select('-password -salt');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'No employee found with this username'
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: 'Employee data fetched successfully'
    });
  } catch (error) {
    console.error('Get employee by username error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee data',
      error: error.message
    });
  }
};

// Get DSA Data By ID/Username
export const getUserDataById = async (req, res) => {
  try {
    const { username } = req.params;
    // Fix: Query by username field instead of _id
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'No DSA found for this username'
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: 'Data fetched successfully'
    });
  } catch (error) {
    console.error('Get DSA by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch DSA data',
      error: error.message
    });
  }
};
export const getLoanDataByType = async (req, res) => {
  try {
    const username = req.query.username || '';
    const isAdmin = req.userRole === 'Admin';
    let filter = {};
    if (username) filter.id_of_connector = username;
    else if (!isAdmin) filter.id_of_connector = req.user.username;
    const pageSize = parseInt(req.query.pageSize) || 5;
    const currentPage = parseInt(req.query.currentPage) || 1;
    const startAfterDocId = req.query.startAfterDocId || null;
    const [legacyLoans, ...typedLoanResults] = await Promise.all([
      Loan.find(filter).lean(),
      ...DSA_LOAN_MODELS.map(({ Model }) =>
        Model.find({ ...filter, isDeleted: false }).lean()
      )
    ]);

    const allLoans = [
      ...legacyLoans.map((doc) => normalizeDSALoan(doc, doc.loanType || 'Loan')),
      ...typedLoanResults.flatMap((docs, index) =>
        docs.map((doc) => normalizeDSALoan(doc, DSA_LOAN_MODELS[index].loanType))
      )
    ].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    const totalCount = allLoans.length;
    const totalPages = Math.ceil(totalCount / pageSize);

    let startIndex = 0;
    if (startAfterDocId) {
      const cursorIndex = allLoans.findIndex((loan) => loan.id === startAfterDocId);
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    } else if (currentPage > 1) {
      startIndex = (currentPage - 1) * pageSize;
    }

    const docs = allLoans.slice(startIndex, startIndex + pageSize);
    const lastDocId = docs.length > 0 ? docs[docs.length - 1].id : null;
    const hasMore = startIndex + pageSize < totalCount;

    res.status(200).json({
      success: true,
      data: docs,
      lastDocId,
      hasMore,
      pageSize,
      currentPage,
      totalPages,
      totalCount
    });
  } catch (error) {
    console.error('Get loan data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loan data',
      error: error.message
    });
  }
};
// Get DSA Dashboard Data
export const getDSADashboardData = async (req, res) => {
  try {
    const { connectorId } = req.params;

    let totalLoan = 0;
    let totalIncome = 0;
    let paidMoney = 0;
    let remainingMoney = 0;
    const monthlyIncomeMap = new Map();

    // Get income details from dsa_income
    const incomeDocs = await DSAIncome.find({ connectorId });

    incomeDocs.forEach((doc) => {
      const data = doc.toObject();
      totalIncome += Number(data.income || 0);
      paidMoney += Number(data.paid || 0);
      remainingMoney += Number(data.unpaid || 0);
      totalLoan += Number(data.loanAmount || 0);

      const createdAt = data.createdAt;
      if (createdAt) {
        const month = createdAt.toLocaleString('default', { month: 'short' });
        monthlyIncomeMap.set(
          month,
          (monthlyIncomeMap.get(month) || 0) + Number(data.income || 0)
        );
      }
    });

    const [legacyTotalApplications, legacyApprovedApplications, ...typedCounts] = await Promise.all([
      Loan.countDocuments({ id_of_connector: connectorId }),
      Loan.countDocuments({ id_of_connector: connectorId, status: 'Disbursed' }),
      ...DSA_LOAN_MODELS.flatMap(({ Model }) => ([
        Model.countDocuments({ id_of_connector: connectorId, isDeleted: false }),
        Model.countDocuments({ id_of_connector: connectorId, isDeleted: false, status: 'Disbursed' })
      ]))
    ]);

    let totalApplications = legacyTotalApplications;
    let approvedApplications = legacyApprovedApplications;

    for (let i = 0; i < typedCounts.length; i += 2) {
      totalApplications += typedCounts[i] || 0;
      approvedApplications += typedCounts[i + 1] || 0;
    }

    // Format monthly income chart data
    const chartData = Array.from(monthlyIncomeMap.entries()).map(([month, income]) => ({
      name: month,
      income
    }));

    chartData.sort(
      (a, b) =>
        new Date(`1 ${a.name} 2025`).getMonth() -
        new Date(`1 ${b.name} 2025`).getMonth()
    );

    res.status(200).json({
      success: true,
      data: {
        totalLoan,
        totalIncome,
        paidMoney,
        remainingMoney,
        totalApplications,
        approvedApplications,
        chartData
      }
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
};

// UPDATE EMPLOYEE DETAILS
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Fields that should NOT be updated directly
    const restrictedFields = [
      "password",
      "salt",
      "username",
      "role",
      "createdAt"
    ];

    // Remove restricted fields from request body
    restrictedFields.forEach((field) => delete req.body[field]);

    // Update allowed fields
    Object.assign(user, req.body);
    user.updatedAt = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: user
    });

  } catch (error) {
    console.error("Update employee error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update employee",
      error: error.message
    });
  }
};

// SOFT DELETE EMPLOYEE
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    user.status = "inactive";
    user.deletedAt = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: "Employee deactivated successfully"
    });

  } catch (error) {
    console.error("Delete employee error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete employee",
      error: error.message
    });
  }
};

// HARD DELETE EMPLOYEE (DANGEROUS)
export const hardDeleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Employee permanently deleted"
    });

  } catch (error) {
    console.error("Hard delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to permanently delete employee",
      error: error.message
    });
  }
};

// GET USERS BY ROLE
export const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

    if (!['DSA', 'Admin', 'RM', 'Field_staff', 'Telecaller'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role"
      });
    }

    const users = await User.find({ role, status: { $ne: 'inactive' } })
      .select('username full_name email')
      .sort({ username: 1 });

    res.status(200).json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error("Get users by role error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message
    });
  }
};


