import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
    },
    razorpayPaymentId: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
    },
    transactionDetails: {
      razorpay_payment_id: String,
      razorpay_order_id: String,
      method: String,
      amount: Number,
      currency: String,
      status: String,
      captured: Boolean,
      description: String,
      refund: {
        id: String,
        amount: Number,
        status: String,
        notes: String,
        processed_at: Date,
      },
      error_code: String,
      error_description: String,
      failed_at: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
paymentSchema.index({ order: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

// Static method to create payment record
paymentSchema.statics.createPayment = async function (
  orderId,
  razorpayOrderId,
  amount
) {
  return this.create({
    order: orderId,
    razorpayOrderId,
    amount,
    currency: "INR",
  });
};

// Method to update payment with success details
paymentSchema.methods.markAsCompleted = function (
  paymentId,
  paymentMethod,
  transactionDetails
) {
  this.razorpayPaymentId = paymentId;
  this.status = "completed";
  this.paymentMethod = paymentMethod;
  this.transactionDetails = {
    ...this.transactionDetails,
    ...transactionDetails,
  };
  return this.save();
};

// Method to update payment with failure details
paymentSchema.methods.markAsFailed = function (
  paymentId,
  errorCode,
  errorDescription
) {
  this.razorpayPaymentId = paymentId;
  this.status = "failed";
  this.transactionDetails = {
    ...this.transactionDetails,
    error_code: errorCode,
    error_description: errorDescription,
    failed_at: new Date(),
  };
  return this.save();
};

// Method to mark as refunded
paymentSchema.methods.markAsRefunded = function (refundDetails) {
  this.status = "refunded";
  this.transactionDetails = {
    ...this.transactionDetails,
    refund: {
      ...refundDetails,
      processed_at: new Date(),
    },
  };
  return this.save();
};

export default mongoose.model("Payment", paymentSchema);
