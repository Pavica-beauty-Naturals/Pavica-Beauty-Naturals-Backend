import express from "express";
import {
  authenticateToken,
  requireAdmin,
  optionalAuth,
} from "../middleware/auth.js";
import {
  validate,
  productValidation,
  queryValidation,
  parseMultipartJSONFields,
} from "../middleware/validation.js";
import { uploadMultiple, handleUploadError } from "../middleware/upload.js";
import ProductController from "../controllers/productController.js";

const router = express.Router();

// @route   GET /api/products/categories
// @desc    Get all categories
// @access  Public
router.get("/categories", ProductController.getCategories);

// @route   GET /api/products
// @desc    Get all products with filtering and pagination
// @access  Public
router.get(
  "/",
  validate(queryValidation.pagination.concat(queryValidation.productFilters)),
  optionalAuth,
  ProductController.getAllProducts
);

// @route   GET /api/products/search
// @desc    similar products or search products by name and category
// @access  Public
router.get("/search", ProductController.searchProducts);

// @route   GET /api/products/:id/pricing
// @desc    Get product pricing for specific size
// @access  Public
router.get(
  "/:id/pricing",
  validate(productValidation.getPricing),
  optionalAuth,
  ProductController.getProductPricing
);

// @route   GET /api/products/:id
// @desc    Get single product by ID
// @access  Public
router.get("/:id", optionalAuth, ProductController.getProductById);

// @route   POST /api/products
// @desc    Create new product (Admin only)
// @access  Private/Admin
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  uploadMultiple("images"),
  handleUploadError,
  parseMultipartJSONFields, // <-- NEW: parse JSON strings from form-data
  validate(productValidation.create),
  ProductController.createProduct
);

// @route   PUT /api/products/:id
// @desc    Update product (Admin only)
// @access  Private/Admin
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  uploadMultiple("images"),
  handleUploadError,
  parseMultipartJSONFields, // <-- NEW: parse JSON strings from form-data
  validate(productValidation.update),
  ProductController.updateProduct
);

// @route   DELETE /api/products/:productId/images/:imageId
// @desc    Delete specific image from product (Admin only)
// @access  Private/Admin
router.delete(
  "/:productId/images/:imageId",
  authenticateToken,
  requireAdmin,
  ProductController.deleteProductImage
);

// @route   DELETE /api/products/:id
// @desc    Delete product (Admin only)
// @access  Private/Admin
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  ProductController.deleteProduct
);

export default router;
