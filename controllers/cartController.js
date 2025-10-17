import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

class CartController {
  // Get user's cart items
  static async getCart(req, res) {
    try {
      let cart = await Cart.findOne({ user: req.user.id }).populate(
        "items.product",
        "name price sizeQuantity images stockQuantity isActive averageRating ratings"
      );

      if (!cart) {
        cart = new Cart({ user: req.user.id, items: [] });
        await cart.save();
      }

      // Filter out inactive products
      const activeItems = cart.items.filter(
        (item) => item.product && item.product.isActive
      );

      // Prepare response items
      const cartItems = activeItems.map((item) => {
        const product = item.product;

        // If ratings array exists, calculate average
        const avgRating =
          product.ratings && product.ratings.length > 0
            ? product.ratings.reduce((a, b) => a + b, 0) /
              product.ratings.length
            : product.averageRating || 0;

        console.log(product);

        return {
          _id: item._id,
          quantity: item.quantity,
          sizeQuantity: item.sizeQuantity,
          priceAtTime: item.priceAtTime,
          product: {
            _id: product._id,
            name: product.name,
            price: item.priceAtTime, // Use the price at time of adding to cart
            basePrice: product.basePrice,
            sizePricing: product.sizePricing,
            stockQuantity: product.getStockForSize
              ? product.getStockForSize(item.sizeQuantity)
              : product.stockQuantity,
            averageRating: Math.round(avgRating * 10) / 10,
            image: Array.isArray(product.images)
              ? product.images[0]
              : product.images, // if it's a string instead of array
          },
        };
      });

      // Summary
      const totalItems = cartItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + item.priceAtTime * item.quantity,
        0
      );

      res.json({
        status: "success",
        data: {
          cartItems,
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
      const { productId, quantity, sizeQuantity } = req.body;

      let cart = await Cart.findOne({ user: req.user.id });
      if (!cart) {
        cart = new Cart({ user: req.user.id, items: [] });
      }

      // Fetch product to validate sizeQuantity
      const product = await Product.findById(productId);
      if (!product || !product.isActive) {
        return res.status(404).json({
          status: "error",
          message: "Product not found or inactive",
        });
      }

      // Check if requested size exists in product
      let validSize = false;

      // Check in new sizePricing structure
      if (product.sizePricing && product.sizePricing.length > 0) {
        validSize = product.sizePricing.some(
          (item) => item.size === sizeQuantity
        );
      } else {
        // Fallback to old sizeQuantity structure
        validSize = product.sizeQuantity.find(
          (eachQuantity) => eachQuantity === sizeQuantity
        );
      }

      if (!validSize) {
        return res.status(400).json({
          status: "error",
          message: "Selected size not available for this product",
        });
      }

      try {
        await cart.addItem(productId, quantity, sizeQuantity);

        // Populate the product data for response
        await cart.populate(
          "items.product",
          "name price sizeQuantity productImageUrl stockQuantity isActive"
        );

        const addedItem = cart.items.find(
          (item) =>
            item.product._id.toString() === productId &&
            item.sizeQuantity === sizeQuantity
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
        if (quantity > item.product.stockQuantity) {
          return res.status(400).json({
            status: "error",
            message: `Only ${item.product.stockQuantity} items available in stock`,
          });
        }

        await cart.updateItemQuantity(
          item.product._id,
          quantity,
          item.sizeQuantity
        );

        // Get updated item
        await cart.populate(
          "items.product",
          "name price sizeQuantity productImageUrl stockQuantity isActive"
        );
        const updatedItem = cart.items.id(cartItemId);

        // ✅ Calculate summary
        const activeItems = cart.items.filter(
          (i) => i.product && i.product.isActive
        );
        const totalItems = activeItems.reduce((sum, i) => sum + i.quantity, 0);
        const totalAmount = activeItems.reduce(
          (sum, i) => sum + i.priceAtTime * i.quantity,
          0
        );

        res.json({
          status: "success",
          message: "Cart item updated successfully",
          data: {
            cartItem: updatedItem,
            summary: {
              totalItems,
              totalAmount: Math.round(totalAmount * 100) / 100,
            },
          },
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

      await cart.removeItem(item.product._id, item.sizeQuantity);

      // Repopulate after removal
      await cart.populate(
        "items.product",
        "name price sizeQuantity productImageUrl stockQuantity isActive"
      );

      // ✅ Calculate summary after removal
      const activeItems = cart.items.filter(
        (i) => i.product && i.product.isActive
      );
      const totalItems = activeItems.reduce((sum, i) => sum + i.quantity, 0);
      const totalAmount = activeItems.reduce(
        (sum, i) => sum + i.priceAtTime * i.quantity,
        0
      );

      res.json({
        status: "success",
        message: "Item removed from cart successfully",
        data: {
          deletedCartItemId: cartItemId,
          summary: {
            totalItems,
            totalAmount: Math.round(totalAmount * 100) / 100,
          },
        },
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
