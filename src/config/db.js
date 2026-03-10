const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI is missing in .env");
    }

    const isSrvUri = mongoUri.startsWith("mongodb+srv://");
    const mongoOptions = {
      serverSelectionTimeoutMS: 10000,
      // Atlas SRV connections require TLS. Keep local mongodb:// untouched.
      ...(isSrvUri ? { tls: true } : {}),
      ...(process.env.MONGODB_TLS_ALLOW_INVALID_CERTS === "true"
        ? { tlsAllowInvalidCertificates: true }
        : {}),
    };

    await mongoose.connect(mongoUri, mongoOptions);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.error(
      "Check MONGODB_URI format, Atlas network access, and TLS settings."
    );
    process.exit(1);
  }
};

module.exports = connectDB;
