const express = require("express");
const router = express.Router();
const passport = require("passport");
const authMiddleware = require("../middlewares/authentication");
const csrfAuthMiddleware = require("../middlewares/csrfAuthMiddleware");
const {
  registerUser,
  loginUser,
  googleCallback,
  forgotPassword,
  resetPassword,
  logoutUser,
  verifyEmail,
  getToken,
  getUserInfo,
  updateUserInfo,
} = require("../controllers/auth");

router.post("/register", registerUser);

router.get("/verify/:verificationToken", verifyEmail);

router.post("/login", loginUser);

router.post("/forgotPassword", forgotPassword);

router.get("/resetPassword/:resetToken", (req, res) => {
  const { resetToken } = req.params;
  res.render("resetPassword", { resetToken });
});

router.post("/resetPassword", resetPassword);

router.post("/logout", authMiddleware, csrfAuthMiddleware, logoutUser);

router.post("/test", async (req, res) => {
  const pass = await req.body.resetToken;
  console.log(pass);
});

router.get("/getToken", authMiddleware, getToken);

router.get(
  "/getUserInfo/:userID",
  authMiddleware,
  csrfAuthMiddleware,
  getUserInfo
);

router.patch(
  "/updateUserInfo/:userID",
  authMiddleware,
  csrfAuthMiddleware,
  updateUserInfo
);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login/failed",
    session: false,
  }),
  googleCallback
);

router.get("/google/failed", async (req, res) =>
  res.status(401).redirect(process.env.CLIENT_URL)
);

module.exports = router;
