import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { validate, cartValidation } from "../middleware/validation.js";
import CartController from "../controllers/cartController.js";

const router = express.Router();

// @route   GET /api/cart
// @desc    Get user's cart items
// @access  Private
router.get("/", authenticateToken, CartController.getCart);

// @route   POST /api/cart
// @desc    Add item to cart
// @access  Private
router.post(
  "/",
  validate(cartValidation.add),
  authenticateToken,
  CartController.addToCart
);

// @route   PUT /api/cart/:id
// @desc    Update cart item quantity
// @access  Private
router.put(
  "/:id",
  validate(cartValidation.update),
  authenticateToken,
  CartController.updateCartItem
);

// @route   DELETE /api/cart/:id
// @desc    Remove item from cart
// @access  Private
router.delete("/:id", authenticateToken, CartController.removeFromCart);

// @route   DELETE /api/cart
// @desc    Clear entire cart
// @access  Private
router.delete("/", authenticateToken, CartController.clearCart);

// @route   POST /api/cart/validate
// @desc    Validate cart items before checkout
// @access  Private
router.post("/validate", authenticateToken, CartController.validateCart);

export default router;
