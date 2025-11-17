import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  getPaymentDetails,
  refundPayment,
} from "../config/razorpay.js";

class PaymentController {
  // Create Razorpay order for payment
  static async createPaymentOrder(req, res) {
    try {
      const { orderId } = req.body;

      // Get order details
      const order = await Order.findById(orderId).populate("user");
      if (!order) {
        return res.status(404).json({
          status: "error",
          message: "Order not found",
        });
      }

      // Check if order belongs to user
      if (order.user._id.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          status: "error",
          message: "Access denied",
        });
      }

      // Check if order is in valid state for payment
      if (order.paymentStatus === "paid") {
        return res.status(400).json({
          status: "error",
          message: "Order is already paid",
        });
      }

      if (order.status === "cancelled") {
        return res.status(400).json({
          status: "error",
          message: "Cannot process payment for cancelled order",
        });
      }

      // Check if payment already exists
      const existingPayment = await Payment.findOne({
        order: orderId,
        status: "pending",
      });

      if (existingPayment) {
        return res.json({
          status: "success",
          message: "Payment order already exists",
          data: {
            razorpayOrderId: existingPayment.razorpayOrderId,
            amount: order.finalAmount,
            currency: "INR",
            orderId: order._id,
            orderNumber: order.orderNumber,
          },
        });
      }

      // Create Razorpay order
      const razorpayResult = await createRazorpayOrder(
        order.finalAmount,
        "INR",
        order.orderNumber
      );

      if (!razorpayResult.success) {
        return res.status(500).json({
          status: "error",
          message: "Failed to create payment order",
        });
      }

      // Save payment record
      const paymentRecord = await Payment.createPayment(
        order._id,
        razorpayResult.order.id,
        order.finalAmount
      );

      res.json({
        status: "success",
        message: "Payment order created successfully",
        data: {
          razorpayOrderId: razorpayResult.order.id,
          amount: order.finalAmount,
          currency: "INR",
          orderId: order._id,
          orderNumber: order.orderNumber,
          paymentId: paymentRecord._id,
        },
      });
    } catch (error) {
      console.error("Create payment order error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to create payment order",
      });
    }
  }

  // Verify payment and update order status
  static async verifyPayment(req, res) {
    try {
      const { orderId, paymentId, signature } = req.body;

      // Get payment record
      const paymentRecord = await Payment.findOne({
        order: orderId,
        status: "pending",
      });

      if (!paymentRecord) {
        return res.status(404).json({
          status: "error",
          message: "Payment record not found or already processed",
        });
      }

      // Verify payment signature
      const isValidSignature = verifyPaymentSignature(
        paymentRecord.razorpayOrderId,
        paymentId,
        signature
      );

      if (!isValidSignature) {
        return res.status(400).json({
          status: "error",
          message: "Invalid payment signature",
        });
      }

      // Get payment details from Razorpay
      const paymentDetails = await getPaymentDetails(paymentId);
      if (!paymentDetails.success) {
        return res.status(500).json({
          status: "error",
          message: "Failed to verify payment with Razorpay",
        });
      }

      const razorpayPayment = paymentDetails.payment;

      // Update payment record
      await paymentRecord.markAsCompleted(paymentId, razorpayPayment.method, {
        razorpay_payment_id: paymentId,
        razorpay_order_id: paymentRecord.razorpayOrderId,
        method: razorpayPayment.method,
        amount: razorpayPayment.amount,
        currency: razorpayPayment.currency,
        status: razorpayPayment.status,
        captured: razorpayPayment.captured,
        description: razorpayPayment.description,
      });

      // Update order status and set paymentId
      const order = await Order.findById(orderId);
      if (order) {
        order.paymentId = paymentRecord._id;
        await order.updatePaymentStatus("paid");
        await order.updateStatus("confirmed");
        await order.save();
        // Clear user's cart after successful payment
        const Cart = (await import("../models/Cart.js")).default;
        const cart = await Cart.findOne({ user: order.user });
        if (cart) await cart.clear();
      }

      res.json({
        status: "success",
        message: "Payment verified successfully",
        data: {
          paymentId: paymentRecord._id,
          razorpayPaymentId: paymentId,
          amount: paymentRecord.amount,
          status: "completed",
        },
      });
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to verify payment",
      });
    }
  }

  // Handle failed payment
  static async handlePaymentFailure(req, res) {
    try {
      const { orderId, paymentId, errorCode, errorDescription } = req.body;

      // Get payment record
      const paymentRecord = await Payment.findOne({
        order: orderId,
        status: "pending",
      });

      if (!paymentRecord) {
        return res.status(404).json({
          status: "error",
          message: "Payment record not found",
        });
      }

      // Update payment record
      await paymentRecord.markAsFailed(paymentId, errorCode, errorDescription);

      res.json({
        status: "success",
        message: "Payment failure recorded",
      });
    } catch (error) {
      console.error("Payment failure handling error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to handle payment failure",
      });
    }
  }

  // Get payment details for an order
  static async getPaymentDetails(req, res) {
    try {
      const orderId = req.params.orderId;

      const payment = await Payment.findOne({ order: orderId }).populate(
        "order",
        "orderNumber finalAmount status paymentStatus"
      );

      if (!payment) {
        return res.status(404).json({
          status: "error",
          message: "Payment not found",
        });
      }

      // Check if user owns this order
      if (
        payment.order.user.toString() !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          status: "error",
          message: "Access denied",
        });
      }

      res.json({
        status: "success",
        data: { payment },
      });
    } catch (error) {
      console.error("Get payment error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get payment details",
      });
    }
  }

  // Process refund (Admin only)
  static async processRefund(req, res) {
    try {
      const paymentId = req.params.paymentId;
      const { amount, notes = "Admin refund" } = req.body;

      // Get payment record
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          status: "error",
          message: "Payment not found",
        });
      }

      if (payment.status !== "completed") {
        return res.status(400).json({
          status: "error",
          message: "Can only refund completed payments",
        });
      }

      const refundAmount = amount || payment.amount;

      // Process refund with Razorpay
      const refundResult = await refundPayment(
        payment.razorpayPaymentId,
        refundAmount,
        notes
      );

      if (!refundResult.success) {
        return res.status(500).json({
          status: "error",
          message: "Failed to process refund with Razorpay",
        });
      }

      // Update payment status
      await payment.markAsRefunded({
        id: refundResult.refund.id,
        amount: refundResult.refund.amount,
        status: refundResult.refund.status,
        notes: notes,
      });

      // Update order status
      const order = await Order.findById(payment.order);
      if (order) {
        await order.updatePaymentStatus("refunded");
      }

      res.json({
        status: "success",
        message: "Refund processed successfully",
        data: {
          refundId: refundResult.refund.id,
          amount: refundAmount,
          status: refundResult.refund.status,
        },
      });
    } catch (error) {
      console.error("Refund processing error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to process refund",
      });
    }
  }
}

export default PaymentController;
