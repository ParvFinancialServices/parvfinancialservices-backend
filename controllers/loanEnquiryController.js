import LoanEnquiry from "../models/LoanEnquiry.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

export const createLoanEnquiry = async (req, res) => {
  try {
    const enquiry = new LoanEnquiry(req.body);
    await enquiry.save();

    // Create notifications for Admin and RM
    const recipients = await User.find({ role: { $in: ["Admin", "RM"] } });
    
    const notificationPromises = recipients.map(user => {
      return Notification.create({
        userId: user._id,
        title: "New Loan Enquiry",
        message: `New enquiry received from ${enquiry.fullName || "a user"} for ${enquiry.loanProduct || "unknown loan type"}.`,
        type: "enquiry",
        link: "/dashboard/loan-enquiry"
      });
    });

    await Promise.all(notificationPromises);

    return res.status(201).json({
      success: true,
      message: "Loan enquiry submitted successfully",
      data: enquiry,
    });
  } catch (error) {
    console.error("Error creating loan enquiry:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to submit loan enquiry",
    });
  }
};

export const getLoanEnquiries = async (req, res) => {
  try {
    const { search, loanType, status, page = 1, limit = 10 } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (loanType) {
      query.loanProduct = loanType;
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const totalCount = await LoanEnquiry.countDocuments(query);
    const enquiries = await LoanEnquiry.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      data: enquiries,
      pagination: {
        totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching loan enquiries:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching loan enquiries",
    });
  }
};

export const updateLoanEnquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    const enquiry = await LoanEnquiry.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Loan enquiry not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: enquiry,
    });
  } catch (error) {
    console.error("Error updating loan enquiry status:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update loan enquiry status",
    });
  }
};

export const deleteLoanEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const enquiry = await LoanEnquiry.findByIdAndDelete(id);

    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Loan enquiry not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Loan enquiry deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting loan enquiry:", error);
    return res.status(500).json({
      success: false,
      message: "Server error deleting loan enquiry",
    });
  }
};

