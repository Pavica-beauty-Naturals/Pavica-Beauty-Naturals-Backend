import express from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import {
  validate,
  adminValidation,
  queryValidation,
} from "../middleware/validation.js";
import AdminController from "../controllers/adminController.js";

const router = express.Router();

// Apply admin middleware to all routes
router.use(authenticateToken, requireAdmin);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private/Admin
router.get("/dashboard", AdminController.getDashboardStats);

// @route   GET /api/admin/categories
// @desc    Get all categories (Admin)
// @access  Private/Admin
router.get("/categories", AdminController.getCategories);

// @route   POST /api/admin/categories
// @desc    Create new category (Admin)
// @access  Private/Admin
router.post(
  "/categories",
  validate(adminValidation.createCategory),
  AdminController.createCategory
);

// @route   PUT /api/admin/categories/:id
// @desc    Update category (Admin)
// @access  Private/Admin
router.put(
  "/categories/:id",
  validate(adminValidation.updateCategory),
  AdminController.updateCategory
);

// @route   DELETE /api/admin/categories/:id
// @desc    Delete category (Admin)
// @access  Private/Admin
router.delete("/categories/:id", AdminController.deleteCategory);

// @route   GET /api/admin/products
// @desc    Get all products with admin details (Admin)
// @access  Private/Admin
router.get(
  "/products",
  validate(queryValidation.pagination),
  AdminController.getProducts
);

// @route   GET /api/admin/users
// @desc    Get all users (Admin)
// @access  Private/Admin
router.get(
  "/users",
  validate(queryValidation.pagination),
  AdminController.getUsers
);

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (Admin)
// @access  Private/Admin
router.put(
  "/users/:id/status",
  validate(adminValidation.updateUserStatus),
  AdminController.updateUserStatus
);

// @route   GET /api/admin/orders
// @desc    Get all orders with admin details (Admin)
// @access  Private/Admin
router.get(
  "/orders",
  validate(queryValidation.pagination),
  AdminController.getOrders
);

// @route   GET /api/admin/reviews
// @desc    Get all reviews (Admin)
// @access  Private/Admin
router.get(
  "/reviews",
  validate(queryValidation.pagination),
  AdminController.getReviews
);

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status (Admin)
// @access  Private/Admin

// @route   DELETE /api/admin/orders/:id
// @desc    Delete order (Admin only)
// @access  Private/Admin
router.delete(
  "/orders/:id",
  AdminController.deleteOrder
);

router.put(
  "/orders/:id/status",
  AdminController.updateOrderStatus
);

export default router;
