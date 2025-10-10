import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Access token required",
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from MongoDB
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid token - user not found",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: "error",
        message: "Account is deactivated",
      });
    }

    req.user = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        status: "error",
        message: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: "error",
        message: "Token expired",
      });
    }

    console.error("Auth middleware error:", error);
    return res.status(500).json({
      status: "error",
      message: "Authentication error",
    });
  }
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role !== "admin") {
    return res.status(403).json({
      status: "error",
      message: "Admin access required",
    });
  }
  next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user || !user.isActive) {
      req.user = null;
    } else {
      req.user = {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      };
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

export { authenticateToken, requireAdmin, optionalAuth, generateToken };
