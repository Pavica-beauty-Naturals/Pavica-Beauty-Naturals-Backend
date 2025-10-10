import express from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import {
  validate,
  userValidation,
  queryValidation,
} from "../middleware/validation.js";
import UserController from "../controllers/userController.js";

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get("/profile", authenticateToken, UserController.getProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  "/profile",
  validate(userValidation.updateProfile),
  authenticateToken,
  UserController.updateProfile
);

// @route   POST /api/users/addresses
// @desc    Add user address
// @access  Private
router.post(
  "/addresses",
  validate(userValidation.addAddress),
  authenticateToken,
  UserController.addAddress
);

// @route   GET /api/users/addresses
// @desc    Get user addresses
// @access  Private
router.get("/addresses", authenticateToken, UserController.getAddresses);

// @route   PUT /api/users/addresses/:id
// @desc    Update user address
// @access  Private
router.put(
  "/addresses/:id",
  validate(userValidation.updateAddress),
  authenticateToken,
  UserController.updateAddress
);

// @route   DELETE /api/users/addresses/:id
// @desc    Delete user address
// @access  Private
router.delete(
  "/addresses/:id",
  authenticateToken,
  UserController.deleteAddress
);

// @route   GET /api/users (Admin only)
// @desc    Get all users (Admin)
// @access  Private/Admin
router.get(
  "/",
  validate(queryValidation.pagination),
  authenticateToken,
  requireAdmin,
  UserController.getAllUsers
);

export default router;
