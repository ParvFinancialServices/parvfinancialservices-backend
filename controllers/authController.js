import User from "../models/User.js";
import OTP from "../models/OTP.js";
import RefreshToken from "../models/RefreshToken.js";
import crypto from 'crypto';
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import sendMail from "../emails/mail.js";
import {
  getAccessTokenCookieOptions,
  getClearedCookieOptions,
  getRefreshTokenCookieOptions,
} from "../utils/cookieOptions.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRE = "15m";
const REFRESH_TOKEN_EXPIRE = "30d";

// Generate Access Token
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRE });
};

// Generate Refresh Token
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
};

// Set Cookies
const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, getAccessTokenCookieOptions());
  res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());
};

// Clear Cookies
const clearTokenCookies = (res) => {
  const clearedCookieOptions = getClearedCookieOptions();
  res.cookie("accessToken", "", clearedCookieOptions);
  res.cookie("refreshToken", "", clearedCookieOptions);
};


// ========== LOGIN ==========
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(process.env.JWT_REFRESH_SECRET);
    

    if (!username || !password)
      return res.status(400).json({ success: false, message: "Enter username & password" });

    const user = await User.findOne({ username });

    if (!user)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (!user.verifyPassword(password))
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    // Check User Status (Active/Inactive)
    if (user.status !== "approved") {
      const message = user.status === "inactive"
        ? "Your account is inactive. Please contact admin."
        : "Your account is pending approval.";
      return res.status(403).json({ success: false, message });
    }

    // Remove old refreshTokens for this user
    await RefreshToken.deleteMany({ userId: user._id });

    // Generate new tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const expiresAt = new Date(Date.now() + 30 * 86400000);
    await RefreshToken.create({ token: refreshToken, userId: user._id, expiresAt });

    // Set Cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Clean user data
    const cleanUser = user.toObject();
    delete cleanUser.password;
    delete cleanUser.salt;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: accessToken,
      data: { user: cleanUser }
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
};


// ========== REFRESH TOKEN ==========
export const refreshToken = async (req, res) => {
  try {
    const fromCookie = req.cookies.refreshToken;
    if (!fromCookie)
      return res.status(401).json({ success: false, message: "No refresh token" });

    let decoded;
    try {
      decoded = jwt.verify(fromCookie, JWT_REFRESH_SECRET);
    } catch {
      clearTokenCookies(res);
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const storedToken = await RefreshToken.findOne({
      token: fromCookie,
      userId: decoded.id
    });

    if (!storedToken)
      return res.status(401).json({ success: false, message: "Refresh token revoked" });

    if (storedToken.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      clearTokenCookies(res);
      return res.status(401).json({ success: false, message: "Refresh token expired" });
    }

    const newAccessToken = generateAccessToken(decoded.id);

    // Set new cookie
    res.cookie("accessToken", newAccessToken, getAccessTokenCookieOptions());

    return res.status(200).json({ 
      success: true, 
      message: "Access token refreshed",
      token: newAccessToken  // Return token so frontend can store it
    });

  } catch (err) {
    console.error("Refresh token error:", err);
    return res.status(500).json({ success: false, message: "Failed to refresh token" });
  }
};


// ========== LOGOUT ==========
export const logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      await RefreshToken.deleteOne({ token });
    }

    clearTokenCookies(res);

    return res.status(200).json({ success: true, message: "Logout successful" });

  } catch (err) {
    console.error("Logout error:", err);
    clearTokenCookies(res);
    return res.status(500).json({ success: false, message: "Logout failed" });
  }
};


// ========== CURRENT USER ==========
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password -salt");

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch user" });
  }
};

export const sendOTPMail = async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username || !email)
      return res.status(400).json({
        success: false,
        message: "Username and email are required",
      });

    const user = await User.findOne({ username, email });
    if (!user)
      return res.status(404).json({
        success: false,
        message: "User not found",
      });

    // Delete old OTPs
    await OTP.deleteMany({ username, email });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.create({
      username,
      email,
      otp,
      attempts: 0,
      blocked: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    // Send Email
    const mailResult = await sendMail(
      "otp",
      {
        fullName: user.full_name,
        otp,
        email,
      },
      "Your OTP Code"
    );

    if (!mailResult.success) {
      return res.status(200).json({
        success: true,
        message: "OTP generated but email failed to send",
        otp, // remove in production
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (err) {
    console.error("OTP Send Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const verifyOTP = async (req, res) => {
  try {
    const { username, email, otp } = req.body;

    if (!username || !email || !otp)
      return res.status(400).json({
        success: false,
        message: "Username, email and OTP are required",
      });

    const record = await OTP.findOne({ username, email });

    if (!record)
      return res.status(404).json({
        success: false,
        message: "OTP not found or expired",
      });

    if (record.blocked)
      return res.status(403).json({
        success: false,
        message: "Too many failed attempts. Try again later.",
      });

    if (record.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: record._id });
      return res.status(410).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (record.otp !== otp) {
      record.attempts += 1;

      if (record.attempts >= 5) {
        record.blocked = true;
      }

      await record.save();

      return res.status(400).json({
        success: false,
        message: "Incorrect OTP",
        attempts: record.attempts,
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified",
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const changePassword = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({
        success: false,
        message: "Username, email and new password are required",
      });

    const user = await User.findOne({ username, email });

    if (!user)
      return res.status(404).json({
        success: false,
        message: "User not found",
      });

    const salt = crypto.randomBytes(16).toString("hex");
    const hashed = User.generatePassword(password, salt);

    user.password = hashed;
    user.salt = salt;
    await user.save();

    // Delete all OTPs for this user
    await OTP.deleteMany({ username, email });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });

  } catch (err) {
    console.error("Change Password Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

