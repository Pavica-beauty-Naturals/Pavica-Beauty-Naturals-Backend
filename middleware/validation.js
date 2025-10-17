import { body, query, validationResult } from "express-validator";

// Validation middleware wrapper
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    for (const validation of validations) {
      await validation.run(req);
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    next();
  };
};

// Auth validation rules
const authValidation = {
  register: [
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("firstName")
      .trim()
      .isLength({ min: 1 })
      .withMessage("First name is required"),
    body("lastName")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Last name is required"),
  ],
  login: [
    body("email").isEmail().normalizeEmail(),
    body("password").exists().withMessage("Password is required"),
  ],
  changePassword: [
    body("currentPassword")
      .exists()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
  ],
};

// User validation rules
const userValidation = {
  updateProfile: [
    body("firstName").optional().trim().isLength({ min: 1 }),
    body("lastName").optional().trim().isLength({ min: 1 }),
    body("phone").optional().isMobilePhone(),
    // Optional address payload
    body("address").optional().isObject(),
    body("address.type").optional().isIn(["shipping", "billing"]),
    body("address.phone").optional().isMobilePhone(),
    body("address.addressLine1").optional().trim().isLength({ min: 1 }),
    body("address.addressLine2").optional().trim(),
    body("address.city").optional().trim().isLength({ min: 1 }),
    body("address.state").optional().trim().isLength({ min: 1 }),
    body("address.postalCode").optional().trim().isLength({ min: 1 }),
    body("address.country").optional().trim().isLength({ min: 1 }),
    body("address.isDefault").optional().isBoolean(),
  ],
  addAddress: [
    body("type")
      .isIn(["shipping", "billing"])
      .withMessage("Type must be shipping or billing"),
    body("fullName")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Full name is required"),
    body("phone").isMobilePhone().withMessage("Valid phone number is required"),
    body("addressLine1")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Address line 1 is required"),
    body("city").trim().isLength({ min: 1 }).withMessage("City is required"),
    body("state").trim().isLength({ min: 1 }).withMessage("State is required"),
    body("postalCode")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Postal code is required"),
  ],
  updateAddress: [
    body("type").optional().isIn(["shipping", "billing"]),
    body("fullName").optional().trim().isLength({ min: 1 }),
    body("phone").optional().isMobilePhone(),
    body("addressLine1").optional().trim().isLength({ min: 1 }),
    body("city").optional().trim().isLength({ min: 1 }),
    body("state").optional().trim().isLength({ min: 1 }),
    body("postalCode").optional().trim().isLength({ min: 1 }),
  ],
};

// Parse JSON fields in multipart/form-data before validation
const parseMultipartJSONFields = (req, res, next) => {
  const jsonFields = [
    "qualities",
    "productFeatures",
    "howToUse",
    "sizeQuantity",
  ];

  jsonFields.forEach((field) => {
    if (req.body[field]) {
      try {
        req.body[field] = JSON.parse(req.body[field]);
      } catch (e) {
        // If parsing fails, we let validation handle it
        req.body[field] = req.body[field];
      }
    }
  });

  next();
};

// Product validation rules
const productValidation = {
  create: [
    body("name")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Product name is required"),
    body("description").optional().trim(),
    body("categoryId").isString().withMessage("Valid category ID is required"),
    body("price")
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
    body("sizeQuantity")
      .optional()
      .isArray()
      .withMessage("sizeQuantity must be an array"),
    body("qualities")
      .optional()
      .isArray()
      .withMessage("Qualities must be an array"),
    body("productFeatures")
      .optional()
      .isArray()
      .withMessage("Product features must be an array"),
    body("howToUse")
      .optional()
      .isArray()
      .withMessage("How to use must be an array"),
    body("stockQuantity")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Stock quantity must be a non-negative integer"),
  ],
  update: [
    body("name")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Product name is required"),
    body("description").optional().trim(),
    body("categoryId").isString().withMessage("Valid category ID is required"),
    body("price")
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
    body("sizeQuantity").optional().trim(),
    body("qualities")
      .optional()
      .isArray()
      .withMessage("Qualities must be an array"),
    body("productFeatures")
      .optional()
      .isArray()
      .withMessage("Product features must be an array"),
    body("howToUse")
      .optional()
      .isArray()
      .withMessage("How to use must be an array"),
    body("stockQuantity")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Stock quantity must be a non-negative integer"),
    body("isActive").optional().isBoolean(),
  ],
};

// Review validation rules
const reviewValidation = {
  create: [
    body("productId").isString().withMessage("Valid product ID is required"),
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("title").optional().trim().isLength({ min: 1, max: 255 }),
    body("description").optional().trim().isLength({ max: 1000 }),
  ],
  update: [
    body("rating").optional().isInt({ min: 1, max: 5 }),
    body("title").optional().trim().isLength({ min: 1, max: 255 }),
    body("description").optional().trim().isLength({ max: 1000 }),
  ],
};

// Cart validation rules
const cartValidation = {
  add: [
    body("productId").isString().withMessage("Valid product ID is required"),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("sizeQuantity")
      .isString()
      .withMessage("Size Quantity must be selected"),
  ],
  update: [
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
  ],
};

// Order validation rules
const orderValidation = {
  create: [
    body("shippingAddress")
      .isObject()
      .withMessage("Shipping address is required"),
    body("shippingAddress.fullName")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Full name is required"),
    body("shippingAddress.phone")
      .isMobilePhone()
      .withMessage("Valid phone number is required"),
    body("shippingAddress.addressLine1")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Address line 1 is required"),
    body("shippingAddress.city")
      .trim()
      .isLength({ min: 1 })
      .withMessage("City is required"),
    body("shippingAddress.state")
      .trim()
      .isLength({ min: 1 })
      .withMessage("State is required"),
    body("shippingAddress.postalCode")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Postal code is required"),
    body("billingAddress").optional().isObject(),
    body("notes").optional().trim(),
  ],
  updateStatus: [
    body("status")
      .isIn(["pending", "confirmed", "shipped", "delivered", "cancelled"])
      .withMessage("Invalid status"),
  ],
};

// Payment validation rules
const paymentValidation = {
  createOrder: [
    body("orderId").isUUID().withMessage("Valid order ID is required"),
  ],
  verify: [
    body("orderId").isUUID().withMessage("Valid order ID is required"),
    body("paymentId").notEmpty().withMessage("Payment ID is required"),
    body("signature").notEmpty().withMessage("Payment signature is required"),
  ],
  failed: [
    body("orderId").isUUID().withMessage("Valid order ID is required"),
    body("paymentId").optional(),
    body("errorCode").optional(),
    body("errorDescription").optional(),
  ],
  refund: [
    body("amount").optional().isFloat({ min: 0 }),
    body("notes").optional().trim(),
  ],
};

// Admin validation rules
const adminValidation = {
  createCategory: [
    body("name")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Category name is required"),
    body("description").optional().trim(),
  ],
  updateCategory: [
    body("name").optional().trim().isLength({ min: 1 }),
    body("description").optional().trim(),
    body("isActive").optional().isBoolean(),
  ],
  updateUserStatus: [
    body("isActive").isBoolean().withMessage("isActive must be a boolean"),
  ],
};

// Query validation rules
const queryValidation = {
  pagination: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  productFilters: [
    query("category").optional().isString(),
    query("search").optional().trim(),
    query("minPrice").optional().isFloat({ min: 0 }),
    query("maxPrice").optional().isFloat({ min: 0 }),
    query("sortBy")
      .optional()
      .isIn(["name", "price", "created_at", "updated_at"]),
    query("sortOrder").optional().isIn(["asc", "desc"]),
  ],
};

export {
  validate,
  authValidation,
  userValidation,
  productValidation,
  reviewValidation,
  cartValidation,
  orderValidation,
  paymentValidation,
  adminValidation,
  queryValidation,
  parseMultipartJSONFields,
};
