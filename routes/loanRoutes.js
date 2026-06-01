import express from "express";
import {
    createLoan,
    getAllLoans,
    getLoanById,
    addLoanRemark,
    deleteLoanRemark,
    updateLoan,
    updateLoanStatus,
    deleteLoan,
    getLoansByType,
    getDashboardStats
} from "../controllers/loanController.js";
import { checkAuthentication } from "../middleware/auth.js";

const router = express.Router();

router.use(checkAuthentication);

router.post("/", createLoan);
router.get("/", getAllLoans);
router.get("/dashboard/stats", getDashboardStats); // must be before /:id
router.get("/type/:loanType", getLoansByType);
router.get("/:id", getLoanById);
router.post("/:id/remarks", addLoanRemark);
router.delete("/:id/remarks/:remarkIndex", deleteLoanRemark);
router.put("/:id/status", updateLoanStatus);
router.put("/:id", updateLoan);
router.delete("/:id", deleteLoan);

export default router;
