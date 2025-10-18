import multer from "multer";
import path from "path";

// Configure multer for file uploads - using memory storage to avoid local file creation
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: fileFilter,
});

// Upload middleware for single image
const uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

// Upload middleware for multiple images
const uploadMultiple = (fieldName) => {
  return upload.array(fieldName);
};

// Upload middleware for mixed fields
const uploadFields = (fields) => {
  return upload.fields(fields);
};

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        status: "error",
        message: "File too large. Maximum size is 5MB.",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        status: "error",
        message: "Too many files. Maximum is 3 files.",
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        status: "error",
        message: "Unexpected field name for file upload.",
      });
    }
  }

  if (err.message === "Only image files are allowed!") {
    return res.status(400).json({
      status: "error",
      message: "Only image files are allowed.",
    });
  }

  next(err);
};

export {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleUploadError,
};
