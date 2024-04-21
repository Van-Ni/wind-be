const router = require("express").Router();
const passport = require('passport')
const authController = require("../controllers/authController");
require('dotenv').config({ path: "./config.env" })
router.get("/", (req, res) => {
  res.json({
    "hi": "hello"
  })
});
router.post("/login", authController.login);

router.post("/register", authController.register,authController.sendOTP);

router.post("/verify", authController.verifyOTP);
router.post("/send-otp", authController.sendOTP);
router.post('/refreshtoken', authController.refreshAccessToken)
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);


// @desc    Auth with Google
// @route   GET /auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
// @desc    Google auth callback
// @route   GET /auth/google/callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    successRedirect: "/auth/callback/success",
    failureRedirect: "/login/failed",
  })
);

router.get("/github", passport.authenticate("github", { scope: ["profile", "email"] }));

router.get(
  "/github/callback",
  passport.authenticate("github", {
    successRedirect: "/auth/callback/success",
    failureRedirect: "/login/failed",
  })
);

router.get("/facebook", passport.authenticate("facebook", { scope: ["profile", "email"] }));

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    successRedirect: "/auth/callback/success",
    failureRedirect: "/login/failed",
  })
);

// Success  
router.get('/callback/success', authController.googleSuccess);
module.exports = router;