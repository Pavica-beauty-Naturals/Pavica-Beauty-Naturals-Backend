import User from "../models/User.js";
import { generateToken } from "../middleware/auth.js";

class AuthController {
  // Register a new user
  static async register(req, res) {
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: "error",
          message: "User already exists with this email",
        });
      }

      // Create user
      const user = new User({
        email,
        password,
        firstName,
        lastName,
        phone: phone || null,
      });

      await user.save();

      // Generate JWT token
      const token = generateToken(user._id);

      res.status(201).json({
        status: "success",
        message: "User registered successfully",
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            createdAt: user.createdAt,
          },
          token,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);

      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          status: "error",
          message: "User already exists with this email",
        });
      }

      // Handle validation errors
      if (error.name === "ValidationError") {
        const errors = Object.values(error.errors).map((err) => err.message);
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors,
        });
      }

      res.status(500).json({
        status: "error",
        message: "Registration failed",
      });
    }
  }

  // Login user
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Get user with password
      const user = await User.findOne({ email }).select("+password");
      if (!user) {
        return res.status(401).json({
          status: "error",
          message: "Invalid credentials",
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          status: "error",
          message: "Account is deactivated",
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          status: "error",
          message: "Invalid credentials",
        });
      }

      // Generate JWT token
      const token = generateToken(user._id);

      res.json({
        status: "success",
        message: "Login successful",
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
          },
          token,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        status: "error",
        message: "Login failed",
      });
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      res.json({
        status: "success",
        data: { user },
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get profile",
      });
    }
  }

  // Change user password
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(req.user.id).select("+password");
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(
        currentPassword
      );
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          status: "error",
          message: "Current password is incorrect",
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        status: "success",
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to change password",
      });
    }
  }

  // Verify if token is valid
  static async verifyToken(req, res) {
    res.json({
      status: "success",
      message: "Token is valid",
      data: {
        user: req.user,
      },
    });
  }
}

export default AuthController;
