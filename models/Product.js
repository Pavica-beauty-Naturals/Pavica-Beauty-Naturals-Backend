import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    // Base price for the product (can be used as default or for products without size variants)
    basePrice: {
      type: Number,
      min: 0,
    },
    // Size-based pricing configuration
    sizePricing: [
      {
        size: {
          type: String,
          required: true,
          trim: true,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        stockQuantity: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],
    // Legacy field for backward compatibility
    sizeQuantity: [
      {
        type: String,
        trim: true,
      },
    ],
    // Cloudinary image URLs array
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        public_id: {
          type: String,
          required: true,
        },
        alt: {
          type: String,
          default: "",
        },
      },
    ],
    // Arrays for features and qualities
    qualities: [
      {
        type: String,
        trim: true,
      },
    ],
    productFeatures: [
      {
        type: String,
        trim: true,
      },
    ],
    howToUse: [
      {
        type: String,
        trim: true,
      },
    ],
    stockQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    // Aggregated fields for performance
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug before saving
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "");
  }

  next();
});

// Indexes for better query performance
productSchema.index({ name: "text", description: "text" });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ createdAt: -1 });

// Virtual for current price (for backward compatibility)
productSchema.virtual("price").get(function () {
  // If sizePricing exists and has items, return the lowest price
  if (this.sizePricing && this.sizePricing.length > 0) {
    return Math.min(...this.sizePricing.map((item) => item.price));
  }
  // Otherwise return basePrice
  return this.basePrice || 0;
});

productSchema.virtual("reviews", {
  ref: "Review", // The model to use
  localField: "_id", // Field on Product
  foreignField: "product", // Field on Review referencing Product
  justOne: false, // If false, will populate as array
});

// Instance method to get price for specific size
productSchema.methods.getPriceForSize = function (size) {
  if (this.sizePricing && this.sizePricing.length > 0) {
    const sizeOption = this.sizePricing.find((item) => item.size === size);
    return sizeOption ? sizeOption.price : this.basePrice || 0;
  }
  return this.basePrice || 0;
};

// Instance method to get stock for specific size
productSchema.methods.getStockForSize = function (size) {
  if (this.sizePricing && this.sizePricing.length > 0) {
    const sizeOption = this.sizePricing.find((item) => item.size === size);
    return sizeOption ? sizeOption.stockQuantity : this.stockQuantity || 0;
  }
  return this.stockQuantity || 0;
};

// Instance method to check if size is available
productSchema.methods.isSizeAvailable = function (size) {
  const stock = this.getStockForSize(size);
  return stock > 0;
};

// Instance method to get available sizes
productSchema.methods.getAvailableSizes = function () {
  if (this.sizePricing && this.sizePricing.length > 0) {
    return this.sizePricing.filter((item) => item.stockQuantity > 0);
  }
  return [];
};

// Static method to update product ratings
productSchema.statics.updateRating = async function (productId) {
  const Review = mongoose.model("Review");

  const stats = await Review.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await this.findByIdAndUpdate(productId, {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      totalReviews: stats[0].totalReviews,
    });
  } else {
    await this.findByIdAndUpdate(productId, {
      averageRating: 0,
      totalReviews: 0,
    });
  }
};

export default mongoose.model("Product", productSchema);
