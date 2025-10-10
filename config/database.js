import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI ||
      "mongodb+srv://shubhamdevops58_db_user:KEyYlR6PlInSgJX2@pavicadb.pf2i0zd.mongodb.net/pavica-naturals?retryWrites=true&w=majority";

    await mongoose.connect(mongoURI);

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on("connected", () => {
  console.log("Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose disconnected");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed through app termination");
  process.exit(0);
});

export { connectDB };
