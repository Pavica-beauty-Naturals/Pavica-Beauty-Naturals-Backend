import Review from "../models/Review.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

class ReviewController {
  // Get reviews for a specific product
  static async getProductReviews(req, res) {
    try {
      const productId = req.params.productId;
      const { page = 1, limit = 10, rating } = req.query;
      const offset = (page - 1) * limit;

      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          status: "error",
          message: "Product not found",
        });
      }

      // Build query
      const query = { product: productId };
      if (rating) {
        query.rating = parseInt(rating);
      }

      const reviews = await Review.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(parseInt(limit));

      const totalReviews = await Review.countDocuments(query);

      // Calculate rating statistics using aggregation
      const ratingStats = await Review.aggregate([
        { $match: { product: product._id } },
        {
          $group: {
            _id: "$rating",
            count: { $sum: 1 },
          },
        },
      ]);

      // Format rating statistics
      const stats = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      ratingStats.forEach((stat) => {
        stats[stat._id] = stat.count;
      });

      // Calculate average rating
      const avgRatingResult = await Review.aggregate([
        { $match: { product: product._id } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
          },
        },
      ]);

      const averageRating =
        avgRatingResult.length > 0
          ? Math.round(avgRatingResult[0].averageRating * 10) / 10
          : 0;

      res.json({
        status: "success",
        data: {
          product: {
            id: product._id,
            name: product.name,
          },
          reviews,
          ratingStats: stats,
          averageRating,
          totalReviews,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalReviews / limit),
            totalReviews,
            hasNext: offset + limit < totalReviews,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Get reviews error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get reviews",
      });
    }
  }

  // Create a new review
  static async createReview(req, res) {
    try {
      const { productId, rating, title, description } = req.body;

      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          status: "error",
          message: "Product not found",
        });
      }

      // Check if user has already reviewed this product
      const existingReview = await Review.findOne({
        product: productId,
        user: req.user.id,
      });

      if (existingReview) {
        return res.status(400).json({
          status: "error",
          message: "You have already reviewed this product",
        });
      }

      // Get user details for user name
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      // Create review
      const review = new Review({
        product: productId,
        user: req.user.id,
        userName: user.fullName,
        rating,
        title: title || null,
        description: description || null,
      });

      await review.save();

      res.status(201).json({
        status: "success",
        message: "Review created successfully",
        data: { review },
      });
    } catch (error) {
      console.error("Create review error:", error);

      // Handle validation errors
      if (error.name === "ValidationError") {
        const errors = Object.values(error.errors).map((err) => err.message);
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors,
        });
      }

      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          status: "error",
          message: "You have already reviewed this product",
        });
      }

      res.status(500).json({
        status: "error",
        message: "Failed to create review",
      });
    }
  }

  // Update a review
  static async updateReview(req, res) {
    try {
      const reviewId = req.params.id;
      const { rating, title, description } = req.body;

      const updateData = {};
      if (rating !== undefined) updateData.rating = rating;
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          status: "error",
          message: "No valid fields to update",
        });
      }

      const review = await Review.findOneAndUpdate(
        { _id: reviewId, user: req.user.id },
        updateData,
        { new: true, runValidators: true }
      );

      if (!review) {
        return res.status(404).json({
          status: "error",
          message: "Review not found or you can only update your own reviews",
        });
      }

      res.json({
        status: "success",
        message: "Review updated successfully",
        data: { review },
      });
    } catch (error) {
      console.error("Update review error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update review",
      });
    }
  }

  // Delete a review
  static async deleteReview(req, res) {
    try {
      const reviewId = req.params.id;

      const review = await Review.findOneAndDelete({
        _id: reviewId,
        user: req.user.id,
      });

      if (!review) {
        return res.status(404).json({
          status: "error",
          message: "Review not found or you can only delete your own reviews",
        });
      }

      res.json({
        status: "success",
        message: "Review deleted successfully",
      });
    } catch (error) {
      console.error("Delete review error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to delete review",
      });
    }
  }

  // Get user's reviews
  static async getUserReviews(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const reviews = await Review.find({ user: req.user.id })
        .populate("product", "name productImageUrl")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(parseInt(limit));

      const totalReviews = await Review.countDocuments({ user: req.user.id });

      res.json({
        status: "success",
        data: {
          reviews,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalReviews / limit),
            totalReviews,
            hasNext: offset + limit < totalReviews,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Get user reviews error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get reviews",
      });
    }
  }
}

export default ReviewController;
