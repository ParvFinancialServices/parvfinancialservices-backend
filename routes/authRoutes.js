import express from "express";
const router = express.Router();

// Auth Controllers
import {
  login,
  logout,
  refreshToken,
  getCurrentUser,
  sendOTPMail,
  verifyOTP,
  changePassword,
} from "../controllers/authController.js";

// Middleware
import { checkAuthentication } from "../middleware/auth.js";

// -------------------------
// Public Authentication Routes
// -------------------------
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refreshToken);
// Backward-compatible alias for frontend token refresh
router.get("/refresh-token", refreshToken);

// -------------------------
// Forgot Password / OTP Routes
// -------------------------
router.post("/send-otp", sendOTPMail);
router.post("/verify-otp", verifyOTP);
router.post("/change-password", changePassword);
// router.post("/set-reset", setCanReset);

// -------------------------
// Protected Routes
// -------------------------
router.get("/me", checkAuthentication, getCurrentUser);

export default router;
