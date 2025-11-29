import Razorpay from "razorpay";
import crypto from "crypto";

// Function to get Razorpay credentials based on profile
const getRazorpayCredentials = () => {
  // Get the profile (test or live), default to test if not specified
  const profile = (process.env.RAZORPAY_PROFILE || "test").toUpperCase();

  // Support for multiple profiles (RAZORPAY_KEY_ID_TEST, RAZORPAY_KEY_ID_LIVE, etc.)
  const keyId =
    process.env[`RAZORPAY_KEY_ID_${profile}`] || process.env.RAZORPAY_KEY_ID;
  const keySecret =
    process.env[`RAZORPAY_KEY_SECRET_${profile}`] ||
    process.env.RAZORPAY_KEY_SECRET;

  return { keyId, keySecret, profile: profile.toLowerCase() };
};

// Initialize Razorpay instance only if credentials are available
let razorpay = null;
let currentProfile = null;

const { keyId, keySecret, profile } = getRazorpayCredentials();

if (keyId && keySecret) {
  razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
  currentProfile = profile;
  console.log(`✅ Razorpay initialized with profile ${profile}`);
} else {
  console.warn(
    "⚠️  Razorpay credentials not found. Payment features will be disabled."
  );
}

// Function to get current Razorpay key secret for signature verification
const getCurrentKeySecret = () => {
  const profile = (process.env.RAZORPAY_PROFILE || "test").toUpperCase();
  return (
    process.env[`RAZORPAY_KEY_SECRET_${profile}`] ||
    process.env.RAZORPAY_KEY_SECRET
  );
};

// Helper function to create Razorpay order
const createRazorpayOrder = async (
  amount,
  currency = "INR",
  receipt = null
) => {
  if (!razorpay) {
    return {
      success: false,
      error:
        "Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.",
    };
  }

  try {
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1, // Auto capture payment
    };

    const order = await razorpay.orders.create(options);
    return {
      success: true,
      order,
    };
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Helper function to verify payment signature
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const keySecret = getCurrentKeySecret();
  if (!keySecret) {
    console.error("RAZORPAY_KEY_SECRET not configured");
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    return expectedSignature === signature;
  } catch (error) {
    console.error("Payment verification error:", error);
    return false;
  }
};

// Helper function to capture payment
const capturePayment = async (paymentId, amount) => {
  if (!razorpay) {
    return {
      success: false,
      error:
        "Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.",
    };
  }

  try {
    const payment = await razorpay.payments.capture(
      paymentId,
      Math.round(amount * 100),
      "INR"
    );
    return {
      success: true,
      payment,
    };
  } catch (error) {
    console.error("Payment capture error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Helper function to get payment details
const getPaymentDetails = async (paymentId) => {
  if (!razorpay) {
    return {
      success: false,
      error:
        "Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.",
    };
  }

  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return {
      success: true,
      payment,
    };
  } catch (error) {
    console.error("Get payment details error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Helper function to refund payment
const refundPayment = async (paymentId, amount, notes = "Refund") => {
  if (!razorpay) {
    return {
      success: false,
      error:
        "Razorpay not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.",
    };
  }

  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(amount * 100), // Convert to paise
      notes: {
        reason: notes,
      },
    });
    return {
      success: true,
      refund,
    };
  } catch (error) {
    console.error("Payment refund error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export {
  razorpay,
  createRazorpayOrder,
  verifyPaymentSignature,
  capturePayment,
  getPaymentDetails,
  refundPayment,
  getRazorpayCredentials,
  getCurrentKeySecret,
};
