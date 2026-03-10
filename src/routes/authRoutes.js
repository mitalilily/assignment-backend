const express = require("express");
const authMiddleware = require("../middleware/auth");
const { sendOtp, signup, signin, me, logout } = require("../controllers/authController");

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/signup", signup);
router.post("/signin", signin);
router.get("/me", authMiddleware, me);
router.post("/logout", authMiddleware, logout);

module.exports = router;
