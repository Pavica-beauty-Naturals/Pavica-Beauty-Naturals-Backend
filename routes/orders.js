import express from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import {
  validate,
  orderValidation,
  queryValidation,
} from "../middleware/validation.js";
import OrderController from "../controllers/orderController.js";

const router = express.Router();

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get(
  "/",
  validate(queryValidation.pagination),
  authenticateToken,
  OrderController.getUserOrders
);

// @route   GET /api/orders/:id
// @desc    Get single order details
// @access  Private
router.get("/:id", authenticateToken, OrderController.getOrderById);

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post(
  "/",
  validate(orderValidation.create),
  authenticateToken,
  OrderController.createOrder
);

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.put("/:id/cancel", authenticateToken, OrderController.cancelOrder);

// @route   GET /api/orders/admin/all
// @desc    Get all orders (Admin only)
// @access  Private/Admin
router.get(
  "/admin/all",
  validate(queryValidation.pagination),
  authenticateToken,
  requireAdmin,
  OrderController.getAllOrders
);

// @route   PUT /api/orders/:id/status
// @desc    Update order status (Admin only)
// @access  Private/Admin
router.put(
  "/:id/status",
  validate(orderValidation.updateStatus),
  authenticateToken,
  requireAdmin,
  OrderController.updateOrderStatus
);

export default router;
