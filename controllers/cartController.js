import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

class CartController {
  // Get user's cart items
  static async getCart(req, res) {
    try {
      let cart = await Cart.findOne({ user: req.user.id }).populate(
        "items.product",
        "name price sizeQuantity productImageUrl stockQuantity isActive"
      );

      if (!cart) {
        cart = new Cart({ user: req.user.id, items: [] });
        await cart.save();
      }

      // Filter out items for inactive products
      const activeItems = cart.items.filter(
        (item) => item.product && item.product.isActive
      );

      const totalItems = activeItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      const totalAmount = activeItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );

      res.json({
        status: "success",
        data: {
          cartItems: activeItems,
          summary: {
            totalItems,
            totalAmount: Math.round(totalAmount * 100) / 100,
          },
        },
      });
    } catch (error) {
      console.error("Get cart error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get cart items",
      });
    }
  }

  // Add item to cart
  static async addToCart(req, res) {
    try {
      const { productId, quantity } = req.body;

      let cart = await Cart.findOne({ user: req.user.id });
      if (!cart) {
        cart = new Cart({ user: req.user.id, items: [] });
      }

      try {
        await cart.addItem(productId, quantity);

        // Populate the product data for response
        await cart.populate(
          "items.product",
          "name price sizeQuantity productImageUrl stockQuantity isActive"
        );

        const addedItem = cart.items.find(
          (item) => item.product._id.toString() === productId
        );

        res.status(201).json({
          status: "success",
          message: "Item added to cart successfully",
          data: { cartItem: addedItem },
        });
      } catch (cartError) {
        return res.status(400).json({
          status: "error",
          message: cartError.message,
        });
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to add item to cart",
      });
    }
  }

  // Update cart item quantity
  static async updateCartItem(req, res) {
    try {
      const cartItemId = req.params.id;
      const { quantity } = req.body;

      const cart = await Cart.findOne({ user: req.user.id }).populate(
        "items.product",
        "name price sizeQuantity productImageUrl stockQuantity isActive"
      );

      if (!cart) {
        return res.status(404).json({
          status: "error",
          message: "Cart not found",
        });
      }

      const item = cart.items.id(cartItemId);
      if (!item) {
        return res.status(404).json({
          status: "error",
          message: "Cart item not found",
        });
      }

      try {
        await cart.updateItemQuantity(item.product._id, quantity);

        // Get updated item
        await cart.populate(
          "items.product",
          "name price sizeQuantity productImageUrl stockQuantity isActive"
        );
        const updatedItem = cart.items.id(cartItemId);

        res.json({
          status: "success",
          message: "Cart item updated successfully",
          data: { cartItem: updatedItem },
        });
      } catch (cartError) {
        return res.status(400).json({
          status: "error",
          message: cartError.message,
        });
      }
    } catch (error) {
      console.error("Update cart error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update cart item",
      });
    }
  }

  // Remove item from cart
  static async removeFromCart(req, res) {
    try {
      const cartItemId = req.params.id;

      const cart = await Cart.findOne({ user: req.user.id });
      if (!cart) {
        return res.status(404).json({
          status: "error",
          message: "Cart not found",
        });
      }

      const item = cart.items.id(cartItemId);
      if (!item) {
        return res.status(404).json({
          status: "error",
          message: "Cart item not found",
        });
      }

      await cart.removeItem(item.product);

      res.json({
        status: "success",
        message: "Item removed from cart successfully",
      });
    } catch (error) {
      console.error("Remove from cart error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to remove item from cart",
      });
    }
  }

  // Clear entire cart
  static async clearCart(req, res) {
    try {
      const cart = await Cart.findOne({ user: req.user.id });
      if (!cart) {
        return res.status(404).json({
          status: "error",
          message: "Cart not found",
        });
      }

      await cart.clear();

      res.json({
        status: "success",
        message: "Cart cleared successfully",
      });
    } catch (error) {
      console.error("Clear cart error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to clear cart",
      });
    }
  }

  // Validate cart items before checkout
  static async validateCart(req, res) {
    try {
      const cart = await Cart.findOne({ user: req.user.id }).populate(
        "items.product",
        "name price stockQuantity isActive"
      );

      if (!cart) {
        return res.status(404).json({
          status: "error",
          message: "Cart not found",
        });
      }

      const validationResults = await cart.validateItems();

      res.json({
        status: "success",
        data: validationResults,
      });
    } catch (error) {
      console.error("Cart validation error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to validate cart",
      });
    }
  }
}

export default CartController;
