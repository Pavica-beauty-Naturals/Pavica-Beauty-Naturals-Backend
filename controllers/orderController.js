import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import User from "../models/User.js";

class OrderController {
  // Get user's orders
  static async getUserOrders(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const offset = (page - 1) * limit;

      // Build query
      const query = { user: req.user.id };
      if (status) {
        query.status = status;
      }

      const orders = await Order.find(query)
        .populate({
          path: "items.product",
          select: "name sizeQuantity images", // Added additional image fields
        })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(parseInt(limit));

      // console.log(orders[0].items[0].product);

      const totalOrders = await Order.countDocuments(query);

      // Transform orders to include all image URLs
      const transformedOrders = orders.map((order) => {
        const orderObj = order.toObject();
        console.log(orderObj.items, "items");

        orderObj.items = orderObj.items.map((item) => ({
          ...item,
          product: {
            ...item.product,
            allImages: [(item.product && item.product.images) || []].filter(
              Boolean
            ), // Remove any null/undefined values
          },
        }));
        return orderObj;
      });

      res.json({
        status: "success",
        data: {
          orders: transformedOrders,
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
      console.error("Get orders error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get orders",
      });
    }
  }

  // Get single order details
  static async getOrderById(req, res) {
    try {
      const orderId = req.params.id;

      const order = await Order.findOne({
        _id: orderId,
        user: req.user.id,
      })
        .populate({
          path: "items.product",
          select: "name sizeQuantity description images",
        })
        .populate("user", "firstName lastName email");

      if (!order) {
        return res.status(404).json({
          status: "error",
          message: "Order not found",
        });
      }

      // Transform order to include all image URLs
      const transformedOrder = order.toObject();
      transformedOrder.items = transformedOrder.items.map((item) => ({
        ...item,
        product: {
          ...item.product,
          allImages: [item.product.images || []].filter(Boolean), // Remove any null/undefined values
        },
      }));

      res.json({
        status: "success",
        data: { order: transformedOrder },
      });
    } catch (error) {
      console.error("Get order error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get order details",
      });
    }
  }

  // Create new order
  static async createOrder(req, res) {
    try {
      const { shippingAddress, billingAddress, notes } = req.body;

      // Get user's cart
      const cart = await Cart.findOne({ user: req.user.id }).populate(
        "items.product",
        "name price stockQuantity isActive"
      );

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Cart is empty",
        });
      }

      try {
        // Create order from cart
        const order = await Order.createFromCart(
          req.user.id,
          cart,
          { shipping: shippingAddress, billing: billingAddress },
          notes
        );

        // Populate order data
        await order.populate(
          "items.product",
          "name productImageUrl sizeQuantity"
        );

        res.status(201).json({
          status: "success",
          message: "Order created successfully",
          data: {
            order,
            orderItems: order.items,
          },
        });
      } catch (cartError) {
        return res.status(400).json({
          status: "error",
          message: cartError.message,
        });
      }
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to create order",
      });
    }
  }

  // Cancel order
  static async cancelOrder(req, res) {
    try {
      const orderId = req.params.id;

      const order = await Order.findOne({
        _id: orderId,
        user: req.user.id,
      });

      if (!order) {
        return res.status(404).json({
          status: "error",
          message: "Order not found",
        });
      }

      // Check if order can be cancelled
      if (order.status === "cancelled") {
        return res.status(400).json({
          status: "error",
          message: "Order is already cancelled",
        });
      }

      if (order.status === "delivered") {
        return res.status(400).json({
          status: "error",
          message: "Cannot cancel delivered order",
        });
      }

      if (order.status === "shipped") {
        return res.status(400).json({
          status: "error",
          message: "Cannot cancel shipped order. Please contact support.",
        });
      }

      // Update order status
      await order.updateStatus("cancelled");

      res.json({
        status: "success",
        message: "Order cancelled successfully",
      });
    } catch (error) {
      console.error("Cancel order error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to cancel order",
      });
    }
  }

  // Get all orders (Admin only)
  static async getAllOrders(req, res) {
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
        // Use aggregation for text search across multiple fields
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

        // Count total orders for search
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

  // Update order status (Admin only)
  static async updateOrderStatus(req, res) {
    try {
      const orderId = req.params.id;
      const { status } = req.body;

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          status: "error",
          message: "Order not found",
        });
      }

      await order.updateStatus(status);

      res.json({
        status: "success",
        message: "Order status updated successfully",
        data: {
          order: {
            id: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            updatedAt: order.updatedAt,
          },
        },
      });
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update order status",
      });
    }
  }
}

export default OrderController;
