const sendOtpEmail = async ({ email, code, purpose }) => {
  const actionText = purpose === "signup" ? "create your account" : "sign in";

  console.log(`[OTP] Use this code to ${actionText}: ${code} for ${email}`);
};

module.exports = {
  sendOtpEmail,
};
