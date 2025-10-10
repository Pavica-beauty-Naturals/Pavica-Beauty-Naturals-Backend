import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Review from "../models/Review.js";
import Category from "../models/Category.js";

class AdminController {
  // Get admin dashboard statistics
  static async getDashboardStats(req, res) {
    try {
      // Get total counts using aggregation for better performance
      const statsPipeline = [
        {
          $facet: {
            totalUsers: [{ $match: { role: "customer" } }, { $count: "count" }],
            totalProducts: [{ $count: "count" }],
            totalOrders: [{ $count: "count" }],
            totalRevenue: [
              { $match: { paymentStatus: "paid" } },
              {
                $group: {
                  _id: null,
                  total: { $sum: "$finalAmount" },
                },
              },
            ],
          },
        },
      ];

      const [userStats, productStats, orderStats, revenueStats] =
        await Promise.all([
          User.aggregate([
            { $match: { role: "customer" } },
            { $count: "count" },
          ]),
          Product.aggregate([{ $count: "count" }]),
          Order.aggregate([{ $count: "count" }]),
          Order.aggregate([
            { $match: { paymentStatus: "paid" } },
            { $group: { _id: null, total: { $sum: "$finalAmount" } } },
          ]),
        ]);

      // Get recent orders
      const recentOrders = await Order.find()
        .populate("user", "firstName lastName email")
        .sort({ createdAt: -1 })
        .limit(10)
        .select("orderNumber finalAmount status paymentStatus createdAt user");

      // Get low stock products
      const lowStockProducts = await Product.find({
        stockQuantity: { $lte: 10 },
        isActive: true,
      })
        .select("name stockQuantity price")
        .sort({ stockQuantity: 1 })
        .limit(5);

      // Get orders by status using aggregation
      const ordersByStatus = await Order.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      // Format orders by status
      const statusCounts = {
        pending: 0,
        confirmed: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
      };

      ordersByStatus.forEach((stat) => {
        if (statusCounts.hasOwnProperty(stat._id)) {
          statusCounts[stat._id] = stat.count;
        }
      });

      const totalUsers = userStats.length > 0 ? userStats[0].count : 0;
      const totalProducts = productStats.length > 0 ? productStats[0].count : 0;
      const totalOrders = orderStats.length > 0 ? orderStats[0].count : 0;
      const totalRevenue = revenueStats.length > 0 ? revenueStats[0].total : 0;

      res.json({
        status: "success",
        data: {
          statistics: {
            totalUsers,
            totalProducts,
            totalOrders,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
          },
          ordersByStatus: statusCounts,
          recentOrders,
          lowStockProducts,
        },
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get dashboard data",
      });
    }
  }

  // Get all categories (Admin)
  static async getCategories(req, res) {
    try {
      const categories = await Category.find().sort({ name: 1 });

      res.json({
        status: "success",
        data: { categories },
      });
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get categories",
      });
    }
  }

  // Create new category (Admin)
  static async createCategory(req, res) {
    try {
      const { name, description } = req.body;

      const category = new Category({ name, description });
      await category.save();

      res.status(201).json({
        status: "success",
        message: "Category created successfully",
        data: { category },
      });
    } catch (error) {
      console.error("Create category error:", error);

      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          status: "error",
          message: "Category with this name already exists",
        });
      }

      res.status(500).json({
        status: "error",
        message: "Failed to create category",
      });
    }
  }

  // Update category (Admin)
  static async updateCategory(req, res) {
    try {
      const categoryId = req.params.id;
      const { name, description, isActive } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (isActive !== undefined) updateData.isActive = isActive;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          status: "error",
          message: "No valid fields to update",
        });
      }

      const category = await Category.findByIdAndUpdate(
        categoryId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!category) {
        return res.status(404).json({
          status: "error",
          message: "Category not found",
        });
      }

      res.json({
        status: "success",
        message: "Category updated successfully",
        data: { category },
      });
    } catch (error) {
      console.error("Update category error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update category",
      });
    }
  }

  // Delete category (Admin)
  static async deleteCategory(req, res) {
    try {
      const categoryId = req.params.id;

      // Check if category has products
      const productCount = await Product.countDocuments({
        category: categoryId,
      });
      if (productCount > 0) {
        return res.status(400).json({
          status: "error",
          message: "Cannot delete category with existing products",
        });
      }

      const category = await Category.findByIdAndDelete(categoryId);
      if (!category) {
        return res.status(404).json({
          status: "error",
          message: "Category not found",
        });
      }

      res.json({
        status: "success",
        message: "Category deleted successfully",
      });
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to delete category",
      });
    }
  }

  // Get all products with admin details (Admin)
  static async getProducts(req, res) {
    try {
      const { page = 1, limit = 20, category, search, isActive } = req.query;
      const offset = (page - 1) * limit;

      // Build query
      const query = {};
      if (category) query.category = category;
      if (search) query.$text = { $search: search };
      if (isActive !== undefined) query.isActive = isActive === "true";

      const products = await Product.find(query)
        .populate("category", "name")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(parseInt(limit));

      const totalProducts = await Product.countDocuments(query);

      res.json({
        status: "success",
        data: {
          products,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalProducts / limit),
            totalProducts,
            hasNext: offset + limit < totalProducts,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Get admin products error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get products",
      });
    }
  }

  // Get all users (Admin)
  static async getUsers(req, res) {
    try {
      const { page = 1, limit = 20, search, role } = req.query;
      const offset = (page - 1) * limit;

      // Build query
      const query = {};
      if (role) query.role = role;
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: "i" } },
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
        ];
      }

      const users = await User.find(query)
        .select("-addresses")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(parseInt(limit));

      const totalUsers = await User.countDocuments(query);

      res.json({
        status: "success",
        data: {
          users,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalUsers / limit),
            totalUsers,
            hasNext: offset + limit < totalUsers,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Get admin users error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get users",
      });
    }
  }

  // Update user status (Admin)
  static async updateUserStatus(req, res) {
    try {
      const userId = req.params.id;
      const { isActive } = req.body;

      // Check if user exists
      const existingUser = await User.findById(userId);
      if (!existingUser) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      // Prevent deactivating the last admin
      if (!isActive && existingUser.role === "admin") {
        const adminCount = await User.countDocuments({
          role: "admin",
          isActive: true,
        });

        if (adminCount <= 1) {
          return res.status(400).json({
            status: "error",
            message: "Cannot deactivate the last admin user",
          });
        }
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { isActive },
        { new: true, runValidators: true }
      ).select("-addresses");

      res.json({
        status: "success",
        message: "User status updated successfully",
        data: { user },
      });
    } catch (error) {
      console.error("Update user status error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update user status",
      });
    }
  }

  // Get all orders with admin details (Admin)
  static async getOrders(req, res) {
    try {
      const { page = 1, limit = 20, status, paymentStatus, search } = req.query;
      const offset = (page - 1) * limit;

      // Build query
      const query = {};
      if (status) query.status = status;
      if (paymentStatus) query.paymentStatus = paymentStatus;

      let orders;
      let totalOrders;

      if (search) {
        // Use aggregation for text search
        const pipeline = [
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "userData",
            },
          },
          {
            $match: {
              ...query,
              $or: [
                { orderNumber: { $regex: search, $options: "i" } },
                { "userData.firstName": { $regex: search, $options: "i" } },
                { "userData.lastName": { $regex: search, $options: "i" } },
              ],
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "items.product",
              foreignField: "_id",
              as: "products",
            },
          },
          {
            $project: {
              orderNumber: 1,
              totalAmount: 1,
              shippingAmount: 1,
              discountAmount: 1,
              finalAmount: 1,
              status: 1,
              paymentStatus: 1,
              shippingAddress: 1,
              createdAt: 1,
              "userData.firstName": 1,
              "userData.lastName": 1,
              "userData.email": 1,
              "products.name": 1,
              "products.productImageUrl": 1,
              items: 1,
            },
          },
          { $sort: { createdAt: -1 } },
          { $skip: offset },
          { $limit: parseInt(limit) },
        ];

        orders = await Order.aggregate(pipeline);

        const countPipeline = [
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "userData",
            },
          },
          {
            $match: {
              ...query,
              $or: [
                { orderNumber: { $regex: search, $options: "i" } },
                { "userData.firstName": { $regex: search, $options: "i" } },
                { "userData.lastName": { $regex: search, $options: "i" } },
              ],
            },
          },
          { $count: "total" },
        ];

        const countResult = await Order.aggregate(countPipeline);
        totalOrders = countResult.length > 0 ? countResult[0].total : 0;
      } else {
        orders = await Order.find(query)
          .populate("user", "firstName lastName email")
          .populate("items.product", "name productImageUrl")
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(parseInt(limit));

        totalOrders = await Order.countDocuments(query);
      }

      res.json({
        status: "success",
        data: {
          orders,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalOrders / limit),
            totalOrders,
            hasNext: offset + limit < totalOrders,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Get admin orders error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get orders",
      });
    }
  }

  // Get all reviews (Admin)
  static async getReviews(req, res) {
    try {
      const { page = 1, limit = 20, rating, productId } = req.query;
      const offset = (page - 1) * limit;

      // Build query
      const query = {};
      if (rating) query.rating = parseInt(rating);
      if (productId) query.product = productId;

      const reviews = await Review.find(query)
        .populate("product", "name productImageUrl")
        .populate("user", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(parseInt(limit));

      const totalReviews = await Review.countDocuments(query);

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
      console.error("Get admin reviews error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get reviews",
      });
    }
  }
}

export default AdminController;
