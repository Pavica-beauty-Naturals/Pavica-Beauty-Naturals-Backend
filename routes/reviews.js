import express from "express";
import { authenticateToken, optionalAuth } from "../middleware/auth.js";
import {
  validate,
  reviewValidation,
  queryValidation,
} from "../middleware/validation.js";
import ReviewController from "../controllers/reviewController.js";

const router = express.Router();

// @route   GET /api/reviews/product/:productId
// @desc    Get reviews for a specific product
// @access  Public
router.get(
  "/product/:productId",
  validate(queryValidation.pagination),
  optionalAuth,
  ReviewController.getProductReviews
);

// @route   POST /api/reviews
// @desc    Create a new review
// @access  Private
router.post(
  "/",
  validate(reviewValidation.create),
  authenticateToken,
  ReviewController.createReview
);

// @route   PUT /api/reviews/:id
// @desc    Update a review
// @access  Private
router.put(
  "/:id",
  validate(reviewValidation.update),
  authenticateToken,
  ReviewController.updateReview
);

// @route   DELETE /api/reviews/:id
// @desc    Delete a review
// @access  Private
router.delete("/:id", authenticateToken, ReviewController.deleteReview);

// @route   GET /api/reviews/user
// @desc    Get user's reviews
// @access  Private
router.get(
  "/user",
  validate(queryValidation.pagination),
  authenticateToken,
  ReviewController.getUserReviews
);

export default router;
