import "dotenv/config"; // ✅ ensures .env variables are loaded before anything else
import { v2 as cloudinary } from "cloudinary";

// ✅ Ensure config is applied immediately
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
  secure: true, // Always use HTTPS URLs
});

// Optional sanity log for debugging (you can remove later)
console.log("✅ Cloudinary configured with:", {
  cloud_name: cloudinary.config().cloud_name,
  api_key: cloudinary.config().api_key ? "Loaded" : "Missing",
  api_secret: cloudinary.config().api_secret ? "Loaded" : "Missing",
});

// ✅ Helper: Single image upload (supports both file path and buffer)
const uploadImage = async (file, folder = "pavica-naturals") => {
  try {
    // If file has buffer (memory storage), upload from buffer
    // If file has path (disk storage), upload from path
    const uploadOptions = {
      folder,
      use_filename: true,
      unique_filename: true,
      resource_type: "image",
      transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
    };

    let result;
    if (file.buffer) {
      // Upload from buffer (memory storage)
      result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });
    } else if (file.path) {
      // Upload from file path (disk storage)
      result = await cloudinary.uploader.upload(file.path, uploadOptions);
    } else {
      throw new Error("File must have either buffer or path");
    }

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error);
    return { success: false, error: error.message };
  }
};

// ✅ Helper: Delete image
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return { success: result.result === "ok", result };
  } catch (error) {
    console.error("❌ Cloudinary delete error:", error);
    return { success: false, error: error.message };
  }
};

// ✅ Helper: Upload multiple images
const uploadMultipleImages = async (files, folder = "pavica-naturals") => {
  try {
    const uploadPromises = files.map((file) => uploadImage(file, folder));
    const results = await Promise.all(uploadPromises);

    const successfulUploads = results.filter((r) => r.success);
    const failedUploads = results.filter((r) => !r.success);

    return {
      success: successfulUploads.length > 0,
      uploaded: successfulUploads,
      failed: failedUploads,
      totalUploaded: successfulUploads.length,
      totalFailed: failedUploads.length,
    };
  } catch (error) {
    console.error("❌ Multiple upload error:", error);
    return { success: false, error: error.message };
  }
};

// ✅ Helper: Optimized URL
const getOptimizedImageUrl = (publicId, options = {}) => {
  const defaultOptions = {
    quality: "auto",
    fetch_format: "auto",
    width: "auto",
    crop: "scale",
  };
  const finalOptions = { ...defaultOptions, ...options };
  return cloudinary.url(publicId, finalOptions);
};

export {
  cloudinary,
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  getOptimizedImageUrl,
};
