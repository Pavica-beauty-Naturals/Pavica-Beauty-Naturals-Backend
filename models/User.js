import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "customer"],
      default: "customer",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    addresses: [
      {
        type: {
          type: String,
          enum: ["shipping", "billing"],
          required: true,
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
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
userSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.password;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
