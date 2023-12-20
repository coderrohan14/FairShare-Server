const User = require("../models/User");
const UnverifiedUser = require("../models/UnverifiedUser");
const PasswordReset = require("../models/PasswordReset");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const passwordHasher = require("../utils/passwordHasher");
const { BadRequestError, UnauthenticatedError } = require("../errors");

const registerUser = async (req, res) => {
  const { name, email, password, picture } = await req.body;
  if (!name || !email || !password) {
    throw new BadRequestError("Please provide all the missing credentials.");
  }
  const existingUser = await User.findOne({ email });
  const existingUnverifiedUser = await UnverifiedUser.findOne({ email });
  if (existingUnverifiedUser) {
    res.status(401).json({
      success: false,
      msg: "The email verification link is already sent, please verify your email.",
    });
  }
  if (existingUser) {
    throw new BadRequestError("User already exists, please log in instead.");
  }
  const verificationToken = crypto.randomBytes(20).toString("hex");
  const userInfo = {
    name,
    email,
    password,
    verificationToken,
    expireAt: new Date(Date.now() + 1000 * 60 * 60),
  };
  if (picture) {
    userInfo.picture = picture;
  }
  const user = await UnverifiedUser.create(userInfo);
  if (user) {
    // Send the verification email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER.toString(),
        pass: process.env.GMAIL_PASSWORD.toString(),
      },
    });

    const mailOptions = {
      from: process.env.GMAIL_USER.toString(),
      to: email,
      subject: "Verify your email address",
      html: `<p>Please click the following link to verify your email address:</p><p><a href="${process.env.SERVER_URL}/auth/verify/${verificationToken}">Verify Email</a></p>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        res.status(500).json({ success: false, msg: error.message });
      } else {
        res
          .status(200)
          .json({ success: true, msg: "Verification email sent." });
      }
    });
  } else {
    throw new UnauthenticatedError(
      "Registration failed, please try again later."
    );
  }
};

const verifyEmail = async (req, res) => {
  const { verificationToken } = await req.params;
  const user = await UnverifiedUser.findOne({ verificationToken });
  if (user) {
    const userInfo = {
      name: user.name,
      email: user.email,
      password: user.password,
    };
    if (user.picture) {
      userInfo.picture = user.picture;
    }
    const newUser = await User.create(userInfo);
    if (newUser) {
      await UnverifiedUser.findOneAndRemove({ email: user.email });
      //   const token = await newUser.createJWT();
      //   res
      //     .status(200)
      //     .cookie("XSRF_TOKEN", token, {
      //       httpOnly: false,
      //       secure: true,
      //       sameSite: "None",
      //       domain: process.env.SERVER_DOMAIN,
      //     })
      res.redirect(process.env.CLIENT_URL);
    } else {
      res
        .status(401)
        .json({ success: false, msg: "Email verification failed." });
    }
  } else {
    res.status(401).json({
      success: false,
      msg: "Verification time exceeded, please sign up again.",
    });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = await req.body;
  const user = await User.findOne({ email });
  const existingRecord = await PasswordReset.findOne({ email });
  if (user && user.password && !existingRecord) {
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetData = {
      email,
      resetToken,
      expireAt: new Date(Date.now() + 1000 * 60 * 60),
    };
    const passwordResetRecord = await PasswordReset.create(resetData);
    if (passwordResetRecord) {
      // Send the password reset email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.GMAIL_USER.toString(),
          pass: process.env.GMAIL_PASSWORD.toString(),
        },
      });

      const mailOptions = {
        from: process.env.GMAIL_USER.toString(),
        to: email,
        subject: "Reset your password",
        html: `<p>Please click the following link to reset your password:</p><p><a href="https://blogbuzz.onrender.com/auth/resetPassword/${resetToken}">Reset Password</a></p>`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          res.status(500).json({ success: false, msg: error.message });
        } else {
          res
            .status(200)
            .json({ success: true, msg: "Password reset email sent." });
        }
      });
    } else {
      res.status(401).json({ success: false, msg: "Password reset failed." });
    }
  } else {
    res.status(401).json({
      success: false,
      msg: "Some error occured, please try again later.",
    });
  }
};

const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = await req.body;
  const resetData = await PasswordReset.findOne({ resetToken });
  if (resetData) {
    const newHashedPassword = await passwordHasher(newPassword);
    const updatedUser = await User.findOneAndUpdate(
      { email: resetData.email },
      { password: newHashedPassword },
      {
        new: true,
        runValidators: true,
      }
    );
    if (updatedUser) {
      await PasswordReset.findOneAndRemove({ email: resetData.email });
      const token = await updatedUser.createJWT();
      res
        .status(200)
        .cookie("XSRF_TOKEN", token, {
          httpOnly: false,
          secure: true,
          sameSite: "None",
          domain: "blogbuzz.onrender.com",
        })
        .redirect(process.env.CLIENT_URL);
    } else {
      res.status(401).redirect(process.env.CLIENT_URL);
    }
  } else {
    res.status(401).redirect(process.env.CLIENT_URL);
  }
};

const loginUser = async (req, res) => {
  const { email, password } = await req.body;
  if (!email || !password) {
    throw new BadRequestError("Please provide all the missing credentials.");
  }
  const user = await User.findOne({ email });
  if (user) {
    const isPasswordMatch = await user.comparePasswords(password);
    if (isPasswordMatch) {
      const token = await user.createJWT();
      res
        .status(200)
        .cookie("XSRF_TOKEN", token, {
          httpOnly: false,
          secure: true,
          sameSite: "None",
          domain: "blogbuzz.onrender.com",
        })
        .json({ success: true, msg: "Login Successful." });
    } else {
      throw new UnauthenticatedError(
        "Authentication failed, please try again."
      );
    }
  } else {
    throw new UnauthenticatedError("No user found with the given email.");
  }
};

const googleCallback = async (req, res) => {
  const { name, email, picture } = await req.user._json;
  const user = await User.findOne({ email });
  if (user) {
    // existing user
    if (user.password) {
      res.status(500).redirect(process.env.CLIENT_URL);
    }
    const token = await user.createJWT();
    res
      .status(200)
      .cookie("XSRF_TOKEN", token, {
        httpOnly: false,
        secure: true,
        sameSite: "None",
        domain: "blogbuzz.onrender.com",
      })
      .redirect(process.env.CLIENT_URL);
  } else {
    // new user
    const newUser = await User.create({
      name,
      email,
      picture,
    });
    const token = await newUser.createJWT();
    res
      .status(200)
      .cookie("XSRF_TOKEN", token, {
        httpOnly: false,
        secure: true,
        sameSite: "None",
        domain: "blogbuzz.onrender.com",
      })
      .redirect(process.env.CLIENT_URL);
  }
};

const logoutUser = async (req, res) => {
  await res.clearCookie("XSRF_TOKEN");
  await res.clearCookie("user");
  await res.clearCookie("google-auth-session");
  req.body.user = null;
  res.status(200).json({ success: true, msg: "Successfully logged out." });
};

const getToken = async (req, res) => {
  const token = await req.cookies.XSRF_TOKEN;
  const { user } = await req.body;
  res.status(200).json({ success: true, token, user });
};

const getUserInfo = async (req, res) => {
  const { userID } = await req.params;
  const user = await User.findOne({ _id: userID });
  if (user) {
    res.status(200).json({
      success: true,
      user: {
        userID: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        createdAt: user.createdAt,
      },
    });
  } else {
    res.status(500).json({
      success: false,
      msg: "Unable to fetch user details, please try again.",
    });
  }
};

const updateUserInfo = async (req, res) => {
  const { userID } = await req.params;
  const { name, picture } = req.body;
  const updateBody = {};
  if (name) updateBody.name = name;
  if (picture) updateBody.picture = picture;
  const updatedUser = await User.findOneAndUpdate({ _id: userID }, updateBody, {
    new: true,
    runValidators: true,
  });
  if (updatedUser) {
    res.status(200).json({ success: true, updatedUser });
  } else {
    res.status(500).json({
      success: false,
      msg: "Unable to update the user info, please try again later.",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  googleCallback,
  resetPassword,
  verifyEmail,
  logoutUser,
  getToken,
  getUserInfo,
  updateUserInfo,
};
