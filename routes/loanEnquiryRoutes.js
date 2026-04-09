import express from "express";
import {
  createLoanEnquiry,
  deleteLoanEnquiry,
  getLoanEnquiries,
  updateLoanEnquiryStatus,
} from "../controllers/loanEnquiryController.js";

const router = express.Router();

router.route("/").post(createLoanEnquiry).get(getLoanEnquiries);

router.route("/:id").patch(updateLoanEnquiryStatus).delete(deleteLoanEnquiry);

export default router;

