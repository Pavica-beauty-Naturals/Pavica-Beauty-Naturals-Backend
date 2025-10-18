import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { uploadMultipleImages } from "../config/cloudinary.js";
import mongoose from "mongoose";

class ProductController {
  // Get all products with filtering and pagination
  static async getAllProducts(req, res) {
    try {
      const {
        page = 1,
        limit = 12,
        category,
        search,
        minPrice,
        maxPrice,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const offset = (page - 1) * limit;

      // Build query
      const query = {};

      // Apply filters
      if (category) {
        query.category = category;
      }

      if (search) {
        query.$text = { $search: search };
      }

      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice);
        if (maxPrice) query.price.$lte = parseFloat(maxPrice);
      }

      // Only show active products for non-admin users
      if (!req.user || req.user.role !== "admin") {
        query.isActive = true;
      }

      // Build sort object
      const sort = {};
      const validSortFields = [
        "name",
        "price",
        "createdAt",
        "updatedAt",
        "averageRating",
      ];
      const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
      sort[sortField] = sortOrder.toLowerCase() === "asc" ? 1 : -1;

      const products = await Product.find(query)
        .populate("category", "name")
        .sort(sort)
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
      console.error("Get products error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get products",
      });
    }
  }

  // Search products by name and/or category (by name or ID)
  static async searchProducts(req, res) {
    try {
      const { name, category, limit = 10, excludeId } = req.query;

      // Build base query
      const query = { isActive: true };

      // Match by product name (case-insensitive partial match)
      if (name) {
        query.name = { $regex: name, $options: "i" };
      }

      // Handle category search by name or ID
      if (category) {
        const categoryDoc = await Category.findOne({
          $or: [
            {
              _id: mongoose.Types.ObjectId.isValid(category) ? category : null,
            },
            { name: { $regex: category, $options: "i" } },
          ],
        });

        if (categoryDoc) {
          query.category = categoryDoc._id;
        } else {
          return res.status(404).json({
            status: "error",
            message: "Category not found",
          });
        }
      }

      // Exclude a specific product (useful for similar products)
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      // Fetch products
      const products = await Product.find(query)
        .populate("category", "name")
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      res.json({
        status: "success",
        data: { products },
      });
    } catch (error) {
      console.error("Search products error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to search products",
      });
    }
  }

  // Get single product by ID
  static async getProductById(req, res) {
    try {
      const productId = req.params.id;

      // Build query
      const query = { _id: productId };

      // Only show active products for non-admin users
      if (!req.user || req.user.role !== "admin") {
        query.isActive = true;
      }

      const product = await Product.findOne(query)
        .populate("category", "name description")
        .populate({
          path: "reviews",
          model: "Review",
          select: "userName rating title description createdAt",
          options: { sort: { createdAt: -1 } },
        });

      if (!product) {
        return res.status(404).json({
          status: "error",
          message: "Product not found",
        });
      }

      res.json({
        status: "success",
        data: { product },
      });
    } catch (error) {
      console.error("Get product error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get product",
      });
    }
  }

  // Create new product (Admin only)
  static async createProduct(req, res) {
    try {
      const {
        name,
        description,
        categoryId,
        basePrice,
        price, // For backward compatibility
        sizePricing = [],
        sizeQuantity = [],
        qualities = [],
        productFeatures = [],
        howToUse = [],
        stockQuantity = 0,
      } = req.body;

      // Validate category
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(400).json({
          status: "error",
          message: "Category not found",
        });
      }

      // Generate slug from product name
      const slug = name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "");

      // Check if product with same name or slug already exists
      const existingProduct = await Product.findOne({
        $or: [{ name: new RegExp(`^${name}$`, "i") }, { slug }],
      });

      if (existingProduct) {
        return res.status(400).json({
          status: "error",
          message: "Product with this name or slug already exists.",
        });
      }

      let productImages = [];

      // Upload images (if any)
      if (req.files && req.files.length > 0) {
        const uploadResult = await uploadMultipleImages(
          req.files,
          "pavica-naturals/products"
        );

        if (!uploadResult.success) {
          return res.status(500).json({
            status: "error",
            message: "Failed to upload images: " + uploadResult.error,
          });
        }

        // Convert uploaded images to array format
        productImages = uploadResult.uploaded.map((image, index) => ({
          url: image.url,
          public_id: image.public_id,
          alt: `Product image ${index + 1}`,
        }));
      }

      // Determine the price to use (basePrice takes precedence, fallback to price for backward compatibility)
      const finalBasePrice =
        basePrice !== undefined
          ? parseFloat(basePrice)
          : price
          ? parseFloat(price)
          : 0;

      // Create product document
      const product = new Product({
        name,
        description,
        category: categoryId,
        basePrice: finalBasePrice,
        sizePricing: sizePricing.map((item) => ({
          size: item.size,
          price: parseFloat(item.price),
          stockQuantity: parseInt(item.stockQuantity || stockQuantity || 0),
        })),
        sizeQuantity, // Keep for backward compatibility
        qualities,
        productFeatures,
        howToUse,
        stockQuantity: parseInt(stockQuantity),
        images: productImages,
      });

      await product.save();
      await product.populate("category", "name");

      res.status(201).json({
        status: "success",
        message: "Product created successfully",
        data: { product },
      });
    } catch (error) {
      console.error("Create product error:", error);

      if (error.name === "ValidationError") {
        const errors = Object.values(error.errors).map((e) => e.message);
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors,
        });
      }

      res.status(500).json({
        status: "error",
        message: "Failed to create product",
      });
    }
  }

  // Update product (Admin only)
  static async updateProduct(req, res) {
    try {
      const productId = req.params.id;
      const updateData = {};

      // Build update data object
      const allowedFields = [
        "name",
        "description",
        "categoryId",
        "basePrice",
        "price", // For backward compatibility
        "sizePricing",
        "sizeQuantity",
        "qualities",
        "productFeatures",
        "howToUse",
        "stockQuantity",
        "isActive",
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          if (field === "categoryId") {
            updateData.category = req.body[field];
          } else if (field === "sizePricing") {
            // Process sizePricing array
            updateData.sizePricing = req.body[field].map((item) => ({
              size: item.size,
              price: parseFloat(item.price),
              stockQuantity: parseInt(item.stockQuantity || 0),
            }));
          } else if (field === "basePrice" || field === "price") {
            // Handle price fields
            updateData.basePrice = parseFloat(req.body[field]);
          } else {
            updateData[field] = req.body[field];
          }
        }
      });

      console.log(updateData, req.body, "updateData");

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          status: "error",
          message: "No valid fields to update",
        });
      }

      // If category is being updated, verify it exists
      if (updateData.category) {
        const category = await Category.findById(updateData.category);
        if (!category) {
          return res.status(400).json({
            status: "error",
            message: "Category not found",
          });
        }
      }

      // Handle image updates if files are provided
      if (req.files && req.files.length > 0) {
        const uploadResult = await uploadMultipleImages(
          req.files,
          "pavica-naturals/products"
        );

        if (!uploadResult.success) {
          return res.status(500).json({
            status: "error",
            message: "Failed to upload images: " + uploadResult.error,
          });
        }

        // Convert uploaded images to array format
        const newImages = uploadResult.uploaded.map((image, index) => ({
          url: image.url,
          public_id: image.public_id,
          type: index === 0 ? "product" : index === 1 ? "model" : "use_case",
          alt: `Product image ${index + 1}`,
        }));

        // Add new images to existing images
        const existingProduct = await Product.findById(productId);
        updateData.images = [...(existingProduct.images || []), ...newImages];
      }

      const product = await Product.findByIdAndUpdate(productId, updateData, {
        new: true,
        runValidators: true,
      }).populate("category", "name");

      if (!product) {
        return res.status(404).json({
          status: "error",
          message: "Product not found",
        });
      }

      res.json({
        status: "success",
        message: "Product updated successfully",
        data: { product },
      });
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update product",
      });
    }
  }

  // Delete specific image from product (Admin only)
  static async deleteProductImage(req, res) {
    try {
      const { productId, imageId } = req.params;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          status: "error",
          message: "Product not found",
        });
      }

      const imageToDelete = product.images.id(imageId);
      if (!imageToDelete) {
        return res.status(404).json({
          status: "error",
          message: "Image not found",
        });
      }

      // Delete from Cloudinary
      const { deleteImage } = await import("../config/cloudinary.js");
      const deleteResult = await deleteImage(imageToDelete.public_id);

      if (!deleteResult.success) {
        console.warn(
          "Failed to delete image from Cloudinary:",
          deleteResult.error
        );
      }

      // Remove from product images array
      product.images.pull(imageId);
      await product.save();

      res.json({
        status: "success",
        message: "Image deleted successfully",
        data: { product },
      });
    } catch (error) {
      console.error("Delete image error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to delete image",
      });
    }
  }

  // Delete product (Admin only)
  static async deleteProduct(req, res) {
    try {
      const productId = req.params.id;

      const product = await Product.findByIdAndDelete(productId);
      if (!product) {
        return res.status(404).json({
          status: "error",
          message: "Product not found",
        });
      }

      res.json({
        status: "success",
        message: "Product deleted successfully",
      });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to delete product",
      });
    }
  }

  // Get product pricing for specific size
  static async getProductPricing(req, res) {
    try {
      const productId = req.params.id;
      const { size } = req.query;

      const product = await Product.findById(productId);
      if (
        !product ||
        ((!req.user || req.user.role !== "admin") && !product.isActive)
      ) {
        return res.status(404).json({
          status: "error",
          message: "Product not found",
        });
      }

      let response = {
        productId: product._id,
        name: product.name,
        basePrice: product.basePrice,
        sizePricing: product.sizePricing || [],
      };

      if (size) {
        const price = product.getPriceForSize(size);
        const stock = product.getStockForSize(size);
        const isAvailable = product.isSizeAvailable(size);

        response.selectedSize = {
          size,
          price,
          stock,
          isAvailable,
        };
      }

      res.json({
        status: "success",
        data: response,
      });
    } catch (error) {
      console.error("Get product pricing error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to get product pricing",
      });
    }
  }

  // Get all categories
  static async getCategories(req, res) {
    try {
      const categories = await Category.find({ isActive: true }).sort({
        name: 1,
      });

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
}

export default ProductController;
