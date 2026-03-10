const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Otp = require("../models/Otp");
const { sendOtpEmail } = require("../services/mailService");

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const normalizeEmail = (email) => email.toLowerCase().trim();
const createUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
});

const issueToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const sendOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;

    if (!email || !purpose) {
      return res.status(400).json({ message: "Email and purpose are required" });
    }

    if (!["signup", "signin"].includes(purpose)) {
      return res.status(400).json({ message: "Invalid OTP purpose" });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (purpose === "signup" && existingUser) {
      return res.status(400).json({ message: "User already exists. Please sign in." });
    }

    if (purpose === "signin" && !existingUser) {
      return res.status(404).json({ message: "User not found. Please sign up." });
    }

    await Otp.deleteMany({ email: normalizedEmail, purpose });

    const code = generateOtp();
    await Otp.create({
      email: normalizedEmail,
      purpose,
      code,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    });

    await sendOtpEmail({ email: normalizedEmail, code, purpose });

    return res.status(200).json({
      message: "OTP generated successfully",
      otp: code,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to send OTP" });
  }
};

const signup = async (req, res) => {
  try {
    const { name, email, phone, password, otp } = req.body;

    if (!name || !email || !phone || !password || !otp) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const otpDoc = await Otp.findOne({ email: normalizedEmail, purpose: "signup" }).sort({ createdAt: -1 });

    if (!otpDoc || otpDoc.code !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (otpDoc.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: normalizedEmail,
      phone,
      password: hashedPassword,
    });

    await Otp.deleteMany({ email: normalizedEmail, purpose: "signup" });

    res.cookie("token", issueToken(user._id.toString()), cookieOptions);

    return res.status(201).json({
      message: "Signup successful",
      user: createUserResponse(user),
    });
  } catch {
    return res.status(500).json({ message: "Signup failed" });
  }
};

const signin = async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    if (!email || !password || !otp) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const otpDoc = await Otp.findOne({ email: normalizedEmail, purpose: "signin" }).sort({ createdAt: -1 });

    if (!otpDoc || otpDoc.code !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (otpDoc.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    await Otp.deleteMany({ email: normalizedEmail, purpose: "signin" });

    res.cookie("token", issueToken(user._id.toString()), cookieOptions);

    return res.status(200).json({
      message: "Signin successful",
      user: createUserResponse(user),
    });
  } catch {
    return res.status(500).json({ message: "Signin failed" });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch {
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

const logout = async (_req, res) => {
  res.clearCookie("token", cookieOptions);
  return res.status(200).json({ message: "Logged out successfully" });
};

module.exports = {
  sendOtp,
  signup,
  signin,
  me,
  logout,
};
