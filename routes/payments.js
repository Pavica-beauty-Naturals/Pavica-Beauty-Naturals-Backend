import express from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import { validate, paymentValidation } from "../middleware/validation.js";
import PaymentController from "../controllers/paymentController.js";

const router = express.Router();

// @route   POST /api/payments/create-order
// @desc    Create Razorpay order for payment
// @access  Private
router.post(
  "/create-order",
  validate(paymentValidation.createOrder),
  authenticateToken,
  PaymentController.createPaymentOrder
);

// @route   POST /api/payments/verify
// @desc    Verify payment and update order status
// @access  Private
router.post(
  "/verify",
  validate(paymentValidation.verify),
  authenticateToken,
  PaymentController.verifyPayment
);

// @route   POST /api/payments/failed
// @desc    Handle failed payment
// @access  Private
router.post(
  "/failed",
  validate(paymentValidation.failed),
  authenticateToken,
  PaymentController.handlePaymentFailure
);

// @route   GET /api/payments/:orderId
// @desc    Get payment details for an order
// @access  Private
router.get("/:orderId", authenticateToken, PaymentController.getPaymentDetails);

// @route   POST /api/payments/:paymentId/refund
// @desc    Process refund (Admin only)
// @access  Private/Admin
router.post(
  "/:paymentId/refund",
  validate(paymentValidation.refund),
  authenticateToken,
  requireAdmin,
  PaymentController.processRefund
);

export default router;
