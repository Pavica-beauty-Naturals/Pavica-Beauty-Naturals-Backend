import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
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
  },
  {
    timestamps: true,
  }
);

// Generate slug before saving
categorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "");
  }
  next();
});

// Index for better query performance
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });

export default mongoose.model("Category", categorySchema);
