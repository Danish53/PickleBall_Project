// import { where } from "sequelize";
import { asyncErrors } from "../middleware/asyncErrors.js";
import ErrorHandler from "../middleware/error.js";
import { sendToken } from "../utils/jwtToken.js";
import { Users } from "../model/userModel.js";
import bcrypt from "bcrypt";
import { Op } from "sequelize";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
// import { sendResetEmail } from "../utils/sendMailer.js";

// User
export const register = asyncErrors(async (req, res, next) => {
  const {
    userName,
    email,
    phoneNumber,
    userType,
    courtName,
    latitude,
    longitude,
    password,
    confirmPassword,
  } = req.body;

  if (
    !userName ||
    !email ||
    !phoneNumber ||
    !userType ||
    // !courtName ||
    !latitude ||
    !longitude ||
    !password ||
    !confirmPassword
  ) {
    return next(new ErrorHandler("Please fill full details!", 400));
  }

  if (userName.length < 3) {
    return next(
      new ErrorHandler("Username must contain at least 3 characters!", 400)
    );
  }

  if (courtName && courtName.length < 3) {
    return next(
      new ErrorHandler("courtName must contain at least 3 characters!", 400)
    );
  }

  if (userType === "admin") {
    return next(
      new ErrorHandler("Admin cannot register through this form!", 400)
    );
  }

  if (password !== confirmPassword) {
    return next(new ErrorHandler("Password do not matched!", 400));
  }

  try {
    let user = await Users.findOne({ where: { email } });
    if (user) {
      return next(new ErrorHandler("User already exists", 400));
    }

    user = await Users.create({
      userName,
      email,
      password,
      phoneNumber,
      userType,
      courtName,
      latitude,
      longitude,
    });

    //   res.status(200).json({
    //     success: true,
    //     message: "User registered successfully",
    //   });
    sendToken(user, 200, "User registered successfully", res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

export const login = asyncErrors(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ErrorHandler("Please fill full form!", 400));
  }
  const user = await Users.findOne({
    where: { email },
    attributes: [
      "id",
      "userName",
      "email",
      "password",
      "phoneNumber",
      "userType",
      "courtName",
      "latitude",
      "longitude",
      "createdAt",
      "updatedAt",
    ],
  });
  if (!user) {
    return next(new ErrorHandler("Invalid email or password!", 400));
  }

  if (user.banned) {
    return next(new ErrorHandler("Your account has been banned", 403));
  }

  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid email or password", 400));
  }

  sendToken(user, 200, "User logged in successfully", res);
});

export const forgotPassword = asyncErrors(async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await Users.findOne({ where: { email } });
    console.log(user);

    if (!user) {
      console.log("User not found for email:", email);
      return res.status(404).send("User not found");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    req.session.otp = otp;
    req.session.email = email;
    req.session.otpExpires = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes

    // const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, {
    //   expiresIn: "30d",
    // });

    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.PASS,
      },
    });

    // var mailOptions = {
    //   from: process.env.USER_EMAIL,
    //   to: user.email,
    //   subject: "Reset Password",
    //   text: `${process.env.FRONTEND_URL}/api/v1/user/reset-password/${user.id}/${token}`,
    // };

    var mailOptions = {
      from: process.env.USER_EMAIL,
      to: user.email,
      subject: "Password Reset OTP",
      text: `Your password reset OTP is: ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
        return next(new ErrorHandler("Error sending email!", 400));
      } else {
        console.log("Email sent:", info.response);
        return res.status(200).json({
          success: true,
          message: "Email sent with OTP",
        });
      }
    });
  } catch (error) {
    console.error(
      "Error processing password reset request for email:",
      email,
      error
    );
    res.status(500).send("Internal server error");
  }
});

export const verifyOtp = asyncErrors(async (req, res, next) => {
  const { otp } = req.body;
  if (!req.session.otp) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired OTP",
    });
  }

  if (req.session.otp === otp && req.session.otpExpires > Date.now()) {
    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } else {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired OTP",
    });
  }
});

export const resendOtp = asyncErrors(async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await Users.findOne({ where: { email } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    req.session.otp = otp;
    req.session.email = email;
    req.session.otpExpires = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes

    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.PASS,
      },
    });

    var mailOptions = {
      from: process.env.USER_EMAIL,
      to: user.email,
      subject: "Password Reset OTP",
      text: `Your password reset OTP is: ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return next(new ErrorHandler("Error sending email!", 400));
      } else {
        return res.status(200).json({
          success: true,
          message: "Email sent with OTP",
        });
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export const resetPassword = asyncErrors(async (req, res, next) => {
  const { userId, otp } = req.params;
  const { password, confirmPassword } = req.body;

  // Validate passwords
  if (password !== confirmPassword) {
    return next(new ErrorHandler("Passwords do not match!", 400));
  }

  // Check if OTP was verified
  if (
    !req.session.otp ||
    req.session.otp !== otp ||
    req.session.otpExpires < Date.now()
  ) {
    return next(new ErrorHandler("Invalid or expired OTP.", 400));
  }

  try {
    // Find the user by id
    const user = await Users.findOne({ where: { id: userId } });

    if (!user) {
      console.log("User not found");
      return next(new ErrorHandler("User not found.", 400));
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password
    user.password = hashedPassword;

    await user.save({ hooks: false });

    const updatedUser = await Users.findOne({ where: { id: userId } });
    // Verify if the hashed password matches the updated hashed password in DB
    if (hashedPassword === updatedUser.password) {
      console.log("Password has been correctly updated in the database.");
    } else {
      console.error("Password mismatch after saving!");
    }

    res.status(200).json({
      success: true,
      message: "Password has been updated.",
    });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).send("Internal server error");
  }
});

export const logout = asyncErrors((req, res, next) => {
  res
    .status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .json({
      success: true,
      message: "User logged out!",
    });
});

export const getProfile = asyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const users = await Users.findByPk(userId);

  res.status(200).json({
    success: true,
    message: "Profile get on Authentic User",
    users,
  });
});

export const updateProfile = asyncErrors(async (req, res, next) => {
  const userId = req.params.id;
  const {
    userName,
    email,
    phoneNumber,
    userType,
    courtName,
    latitude,
    longitude,
    password,
    confirmPassword,
  } = req.body;

  // Ensure all required fields are provided
  if (!latitude || !longitude) {
    return next(new ErrorHandler("Fill in all required fields", 400));
  }

  // Validate passwords match
  if (password && password !== confirmPassword) {
    return next(new ErrorHandler("Passwords do not match", 400));
  }

  // Fetch the user to update
  let user = await Users.findByPk(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Update user fields only if they are provided in the request body
  if (userName) user.userName = userName;
  if (email) user.email = email;
  if (phoneNumber) user.phoneNumber = phoneNumber;
  if (userType) user.userType = userType;
  if (courtName) user.courtName = courtName;
  if (latitude) user.latitude = latitude;
  if (longitude) user.longitude = longitude;

  // Hash password if provided
  if (password) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    user.password = hashedPassword;
  }

  // File upload
  const filePath = req.file ? req.file.path : user.profileAvatar; // Fallback to existing avatar if not provided
  user.profileAvatar = filePath;

  // Log before saving
  console.log("Before saving, User object: ", user);

  // Save the updated user
  await user.save({ hooks: false });

  // Fetch the updated user from the database
  const updatedUser = await Users.findByPk(userId);
  console.log("Updated Hashed Password in DB: ", updatedUser.password);

  // Verify if the hashed password matches the updated hashed password in DB
  if (password) {
    const isPasswordMatch = await bcrypt.compare(
      password,
      updatedUser.password
    );
    console.log("Password Match after update: ", isPasswordMatch);
    if (!isPasswordMatch) {
      console.error("Password mismatch after saving!");
    }
  }

  // Respond with success
  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user: updatedUser,
  });
});

// Admin
export const adminLogin = asyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await Users.findOne({
      where: {
        email,
        userType: {
          [Op.in]: ["admin"], // Only 'admin' can log in
        },
        isAdmin: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email or password is invalid!",
      });
    }

    if (password !== user.password) {
      return res.status(401).json({
        success: false,
        message: "Email or password is invalid!!",
      });
    }

    // const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
    // // res.json({ success: true, token });
    // res.status(200).json({
    //   success: true,
    //   message: "Admin login successful",
    //   user,
    // });
    sendToken(user, 200, "Admin login successful", res);
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

export const adminLogout = async (req, res, next) => {
  res
    .status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .json({
      success: true,
      message: "Admin logged out!",
    });
};

export const getAdminProfile = asyncErrors(async (req, res, next) => {
  try {
    const admin = await Users.findOne({
      where: {
        userType: "admin",
      },
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin profile not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Admin profile successfully Get!",
      admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

export const updateAdminProfile = asyncErrors(async (req, res, next) => {
  const { userName, phoneNumber, email, password } = req.body;

  if (!userName || !phoneNumber || !email || !password) {
    return next(new ErrorHandler("Fill in all required fields", 400));
  }

  if (userName.length < 3) {
    return next(
      new ErrorHandler("Username must be at least 3 characters long", 400)
    );
  }

  let admin = await Users.findOne({
    where: {
      userType: "admin",
    },
  });
  if (!admin) {
    return next(new ErrorHandler("Admin not found", 404));
  }

  // Update user fields
  admin.userName = userName;
  admin.email = email;
  admin.password = password;
  admin.phoneNumber = phoneNumber;

  //file upload
  const filePath = req.file.path;
  admin.profileAvatar = filePath;

  // Save the updated user
  const newAdmin = await admin.save();

  // Respond with success
  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    admin: newAdmin,
  });
});

export const getAllUsers = asyncErrors(async (req, res, next) => {
  try {
    const users = await Users.findAll();

    let totalUsers = users.length;

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      totalUsers,
      users,
    });
  } catch (error) {
    console.error("Error retrieving users:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

export const deleteUser = asyncErrors(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new ErrorHandler("User ID is required", 400));
  }

  try {
    const user = await Users.findOne({ where: { id: userId } });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    await Users.destroy({ where: { id: userId } });

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

export const banUser = asyncErrors(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new ErrorHandler("User ID is required", 400));
  }

  try {
    const user = await Users.findOne({ where: { id: userId } });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    user.banned = true;
    await user.save();

    // send Ban notification
    const sendBanNotification = async (user) => {
      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.USER_EMAIL,
          pass: process.env.PASS,
        },
      });

      const mailOptions = {
        from: process.env.USER_EMAIL,
        to: user.email,
        subject: "Account Banned",
        text: `Hello ${user.userName},\n\nYour account has been banned due to violating our terms of service.\n\nRegards,\nTeam`,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log("Ban notification email sent");
      } catch (error) {
        console.error("Error sending ban notification email:", error);
      }
    };

    await sendBanNotification(user);

    res.status(200).json({
      success: true,
      message: "User banned successfully",
      user,
    });
  } catch (error) {
    console.error("Error banning user:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

export const unbanUser = asyncErrors(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new ErrorHandler("User ID is required", 400));
  }

  try {
    const user = await Users.findOne({ where: { id: userId } });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    user.banned = false;
    await user.save();

    // send UnBan account notification
    const sendUnBanNotification = async (user) => {
      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.USER_EMAIL,
          pass: process.env.PASS,
        },
      });

      const mailOptions = {
        from: process.env.USER_EMAIL,
        to: user.email,
        subject: "Account UnBan",
        text: `Hello ${user.userName},\n\nYour account has UnBan.\n\nRegards,\nTeam`,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log("UnBan notification email sent");
      } catch (error) {
        console.error("Error sending unban notification email:", error);
      }
    };

    await sendUnBanNotification(user);


    res.status(200).json({
      success: true,
      message: "User unbanned successfully",
      user,
    });
  } catch (error) {
    console.error("Error unbanning user:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});
