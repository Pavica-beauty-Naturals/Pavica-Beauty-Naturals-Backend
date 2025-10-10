import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Index for better query performance
reviewSchema.index({ product: 1, rating: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ createdAt: -1 });

// Update product rating when review is saved
reviewSchema.post("save", async function () {
  const Product = mongoose.model("Product");
  await Product.updateRating(this.product);
});

// Update product rating when review is deleted
reviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    const Product = mongoose.model("Product");
    await Product.updateRating(doc.product);
  }
});

export default mongoose.model("Review", reviewSchema);
