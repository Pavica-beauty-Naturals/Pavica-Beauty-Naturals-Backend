import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { validate, authValidation } from "../middleware/validation.js";
import AuthController from "../controllers/authController.js";

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  "/register",
  validate(authValidation.register),
  AuthController.register
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", validate(authValidation.login), AuthController.login);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get("/me", authenticateToken, AuthController.getProfile);

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post(
  "/change-password",
  validate(authValidation.changePassword),
  authenticateToken,
  AuthController.changePassword
);

// @route   POST /api/auth/verify-token
// @desc    Verify if token is valid
// @access  Private
router.post("/verify-token", authenticateToken, AuthController.verifyToken);

export default router;
