import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        sizeQuantity: {
          type: String,
          required: true,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    shippingAddress: {
      type: {
        type: String,
        enum: ["shipping", "billing"],
        default: "shipping",
      },
      fullName: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      addressLine1: {
        type: String,
        required: true,
      },
      addressLine2: String,
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      postalCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        default: "India",
      },
    },
    billingAddress: {
      type: {
        type: String,
        enum: ["shipping", "billing"],
        default: "billing",
      },
      fullName: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      addressLine1: {
        type: String,
        required: true,
      },
      addressLine2: String,
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      postalCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        default: "India",
      },
    },
    notes: {
      type: String,
      trim: true,
    },
    trackingNumber: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// Static method to generate order number
orderSchema.statics.generateOrderNumber = function () {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `PN-${timestamp.slice(-6)}${random}`;
};

// Static method to create order from cart
orderSchema.statics.createFromCart = async function (
  userId,
  cart,
  addresses,
  notes
) {
  const Cart = mongoose.model("Cart");
  const Product = mongoose.model("Product");

  // Validate cart items
  const validationResults = await cart.validateItems();
  if (!validationResults.valid) {
    throw new Error(
      `Cart validation failed: ${validationResults.errors.join(", ")}`
    );
  }

  // Create order items with current prices
  const orderItems = [];
  let totalAmount = 0;

  for (const cartItem of cart.items) {
    const product = await Product.findById(cartItem.product);
    if (!product || !product.isActive) {
      throw new Error(
        `Product ${product?.name || "Unknown"} is no longer available`
      );
    }

    const itemTotal = cartItem.priceAtTime * cartItem.quantity;
    totalAmount += itemTotal;

    orderItems.push({
      product: product._id,
      quantity: cartItem.quantity,
      price: cartItem.priceAtTime,
      sizeQuantity: cartItem.sizeQuantity,
    });
  }

  const orderNumber = this.generateOrderNumber();
  const shippingAmount = 0; // Free shipping for now
  const discountAmount = 0; // No discount applied yet
  const finalAmount = totalAmount + shippingAmount - discountAmount;

  // Create order
  const order = new this({
    orderNumber,
    user: userId,
    items: orderItems,
    totalAmount,
    shippingAmount,
    discountAmount,
    finalAmount,
    shippingAddress: addresses.shipping,
    billingAddress: addresses.billing || addresses.shipping,
    notes,
  });

  await order.save();

  // Clear cart after successful order creation


  // Update product stock (handle both size-based and general stock)
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (product) {
      // If product has size-based pricing, update specific size stock
      if (product.sizePricing && product.sizePricing.length > 0) {
        const sizeIndex = product.sizePricing.findIndex(
          (sp) => sp.size === item.sizeQuantity
        );
        if (sizeIndex !== -1) {
          product.sizePricing[sizeIndex].stockQuantity -= item.quantity;
          await product.save();
        }
      } else {
        // Fallback to general stock reduction
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stockQuantity: -item.quantity },
        });
      }
    }
  }

  return order;
};

// Method to update order status
orderSchema.methods.updateStatus = function (newStatus) {
  this.status = newStatus;
  return this.save();
};

// Method to update payment status
orderSchema.methods.updatePaymentStatus = function (newStatus) {
  this.paymentStatus = newStatus;
  return this.save();
};

// Virtual for total items count
orderSchema.virtual("totalItems").get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

export default mongoose.model("Order", orderSchema);
