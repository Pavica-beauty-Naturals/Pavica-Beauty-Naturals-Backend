const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error(err);

  // MongoDB errors
  if (err.code) {
    switch (err.code) {
      case 11000: // Duplicate key error
        error.message = "Resource already exists";
        error.statusCode = 400;
        break;
      case 11001: // Duplicate key error (alternative)
        error.message = "Resource already exists";
        error.statusCode = 400;
        break;
      default:
        error.message = "Database error";
        error.statusCode = 500;
    }
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error.message = "Invalid token";
    error.statusCode = 401;
  }

  if (err.name === "TokenExpiredError") {
    error.message = "Token expired";
    error.statusCode = 401;
  }

  // Validation errors
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error.message = message;
    error.statusCode = 400;
  }

  // Cast error (invalid ObjectId)
  if (err.name === "CastError") {
    error.message = "Invalid ID format";
    error.statusCode = 400;
  }

  // Multer errors (file upload)
  if (err.code === "LIMIT_FILE_SIZE") {
    error.message = "File too large";
    error.statusCode = 400;
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    error.message = "Too many files";
    error.statusCode = 400;
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    error.message = "Unexpected field";
    error.statusCode = 400;
  }

  res.status(error.statusCode || 500).json({
    status: "error",
    message: error.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;
