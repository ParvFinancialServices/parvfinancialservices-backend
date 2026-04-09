import express from "express";
import {
    createLoan,
    getAllLoans,
    getLoanById,
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
router.put("/:id/status", updateLoanStatus);
router.put("/:id", updateLoan);
router.delete("/:id", deleteLoan);

export default router;
