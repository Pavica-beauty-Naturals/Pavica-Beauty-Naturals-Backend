import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
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
        sizeQuantity: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Ensure one cart per user
cartSchema.index({ user: 1 }, { unique: true });

// Index for better query performance
cartSchema.index({ user: 1 });

// Virtual for total items count
cartSchema.virtual("totalItems").get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for total amount
cartSchema.virtual("totalAmount").get(function () {
  return this.items.reduce((total, item) => {
    return total + (item.product?.price || 0) * item.quantity;
  }, 0);
});

// Method to add item to cart
cartSchema.methods.addItem = async function (
  productId,
  quantity,
  sizeQuantity
) {
  const Product = mongoose.model("Product");
  const product = await Product.findById(productId);

  if (!product || !product.isActive) {
    throw new Error("Product not available");
  }

  if (product.stockQuantity < quantity) {
    throw new Error(`Only ${product.stockQuantity} items available in stock`);
  }

  const existingItem = this.items.find(
    (item) => item.product.toString() === productId.toString()
  );

  if (existingItem) {
    // ✅ Check if total desired quantity exceeds available stock
    const totalRequested = existingItem.quantity + quantity;
    if (totalRequested > product.stockQuantity) {
      throw new Error(
        `Only ${product.stockQuantity} items available in stock. You already have ${existingItem.quantity} in your cart.`
      );
    }
    existingItem.quantity += quantity;
  } else {
    this.items.push({ product: productId, quantity, sizeQuantity });
  }

  return this.save();
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = async function (productId, quantity) {
  const Product = mongoose.model("Product");
  const product = await Product.findById(productId);

  if (!product || !product.isActive) {
    throw new Error("Product not available");
  }

  if (product.stockQuantity < quantity) {
    throw new Error(`Only ${product.stockQuantity} items available in stock`);
  }

  const item = this.items.find(
    (item) => item.product._id.toString() === productId.toString()
  );

  if (item) {
    item.quantity = quantity;
  }

  return this.save();
};

// Method to remove item from cart
cartSchema.methods.removeItem = function (productId) {
  this.items = this.items.filter(
    (item) => item.product.toString() !== productId.toString()
  );
  return this.save();
};

// Method to clear cart
cartSchema.methods.clear = function () {
  this.items = [];
  return this.save();
};

// Method to validate cart items
cartSchema.methods.validateItems = async function () {
  const Product = mongoose.model("Product");
  const validationResults = {
    valid: true,
    errors: [],
    warnings: [],
    summary: {
      totalItems: 0,
      totalAmount: 0,
    },
  };

  for (const item of this.items) {
    const product = await Product.findById(item.product);

    if (!product) {
      validationResults.valid = false;
      validationResults.errors.push(
        `Product not found for cart item ${item._id}`
      );
      continue;
    }

    if (!product.isActive) {
      validationResults.valid = false;
      validationResults.errors.push(`${product.name} is no longer available`);
      continue;
    }

    if (product.stockQuantity < item.quantity) {
      validationResults.valid = false;
      validationResults.errors.push(
        `Only ${product.stockQuantity} ${product.name} available in stock`
      );
      continue;
    }

    validationResults.summary.totalItems += item.quantity;
    validationResults.summary.totalAmount += product.price * item.quantity;
  }

  validationResults.summary.totalAmount =
    Math.round(validationResults.summary.totalAmount * 100) / 100;

  return validationResults;
};

export default mongoose.model("Cart", cartSchema);
