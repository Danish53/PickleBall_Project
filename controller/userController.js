// import { where } from "sequelize";
import { asyncErrors } from "../middleware/asyncErrors.js";
import ErrorHandler from "../middleware/error.js";
import { sendToken } from "../utils/jwtToken.js";
import { Users } from "../model/userModel.js";
import bcrypt from "bcrypt";
import { Op } from "sequelize";
import nodemailer from "nodemailer";
import { Notifications } from "../model/NotificationAdmin.js";
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
    facebook_link,
    twitter_link,
    instagram_link,
    tiktok_link,
    password,
    confirmPassword,
  } = req.body;

  if (
    !userName ||
    !email ||
    !phoneNumber ||
    !userType ||
    !latitude ||
    !longitude ||
    !password ||
    !confirmPassword
  ) {
    return next(new ErrorHandler("Please fill full details!", 400));
  }

  // File upload
  //   const government_issue_image = req.files?.government_issue_image?.[0];
  //   const certificate = req.files?.certificate?.[0];

  // if (userType === "Coach") {
  //   if (!government_issue_image) {
  //     return next(new ErrorHandler("Please select government_issue_image!", 400));
  //   }
  //   if (!certificate) {
  //     return next(new ErrorHandler("Please choose certificate!", 400));
  //   }
  // }

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
      facebook_link,
      twitter_link,
      instagram_link,
      tiktok_link,
    });

    // if (government_issue_image) {
    //   user.government_issue_image = government_issue_image.path;
    // }
    // if (certificate) {
    //   user.certificate = certificate.path;
    // }

    await user.save();

    await Notifications.create({
      userId: user.id,
      message: `New user registered: ${userName} (${email})`,
    });

    // res.status(200).json({
    //   success: true,
    //   message: "User registered successfully",
    // });
    sendToken(user, 200, "User registered successfully", res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

export const documentUpload = asyncErrors(async (req, res, next) => {
  const { userId } = req.params;
  const government_issue_image = req.files?.government_issue_image?.[0];
  const certificate = req.files?.certificate?.[0];

  try {
    const user = await Users.findOne({
      where: { id: userId, userType: "Coach" },
    });
    if (!user) {
      return next(new ErrorHandler("User not found or not a coach", 404));
    }

    let actionMessage;
    if (user.government_issue_image && user.certificate) {
      if (government_issue_image) {
        user.government_issue_image = government_issue_image.path;
      }
      if (certificate) {
        user.certificate = certificate.path;
      }
      actionMessage = "Documents updated successfully!";
    } else {
      // First-time upload of documents
      if (!government_issue_image && !certificate) {
        return next(
          new ErrorHandler(
            "Both government issue image and certificate are required!",
            400
          )
        );
      }
      user.government_issue_image = government_issue_image.path;
      user.certificate = certificate.path;
      actionMessage = "Documents uploaded successfully!";
    }

    await user.save();

    await Notifications.create({
      userId: user.id,
      message: `Documents uploaded by user: ${user.userName} (${user.email})`,
    });

    // const io = req.app.get("io");
    // io.emit("documentUploadNotification", {
    //   userId: user.id,
    //   userName: user.userName,
    //   email: user.email,
    //   message: "Documents uploaded",
    // });

    res.status(200).json({
      success: true,
      message: actionMessage,
      documents: {
        userId: user.id,
        government_issue_image: user.government_issue_image,
        certificate: user.certificate,
      },
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

export const getDocumentsVerify = asyncErrors(async (req, res, next) => {
  const { userId } = req.params;
  try {
    const user = await Users.findOne({
      where: { id: userId, userType: "Coach" },
    });

    if (!user) {
      return next(new ErrorHandler("User not found or not a coach", 404));
    }

    if (!user.government_issue_image && !user.certificate) {
      return next(
        new ErrorHandler(
          "Both government issue image and certificate are required!",
          400
        )
      );
    }

    let responseMessage;
    switch (user.approved_document) {
      case 0:
        responseMessage = "Document is pending state!";
        break;
      case 1:
        responseMessage = "Document approved by admin.";
        break;
      case 2:
        responseMessage = "Document rejected by admin.";
        break;
      default:
        responseMessage = "Invalid document status.";
        break;
    }

    // Send a response with the user documents and the corresponding message
    res.status(200).json({
      success: true,
      message: responseMessage,
      status: user.approved_document,
    });
    
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
    // Find the user by email
    const user = await Users.findOne({ where: { email } });

    if (!user) {
      return next(new ErrorHandler("User not found!", 400));
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000); // OTP valid for 1 minute

    // Update the user's OTP and expiration time
    await user.update({
      otp, // store OTP in user table
      expires_at: expiresAt, // store expiration time
    });


    // Validate email configuration
    if (!process.env.USER_EMAIL || !process.env.PASS) {
      return next(new ErrorHandler("Email configuration is missing!", 500));
    }

    // Create transport for sending email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.PASS,
      },
      debug: true, // Enable debug output
      logger: true,
    });

    // Prepare email options
    const mailOptions = {
      from: process.env.USER_EMAIL,
      to: user.email,
      subject: "Password Reset OTP",
      text: `Your password reset OTP is: ${user.otp}`,
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
        return next(new ErrorHandler("Error sending email!", 400));
      } else {
        return res.status(200).json({
          success: true,
          message: "Email sent with OTP",
        });
      }
    });
  } catch (error) {
    console.error("Error processing password reset request:", error);
    return next(new ErrorHandler("Internal server error", 500));
  }
});

export const verifyOtp = asyncErrors(async (req, res, next) => {
  const { otp } = req.body;
  try {
    const otpRecord = await Users.findOne({
      where: { otp }
    });

    if (!otpRecord) {
      return next(new ErrorHandler("Invalid or expired OTP!", 400));
    }

    // Check if the OTP has expired
    if (otpRecord.expires_at < new Date()) {
      return next(new ErrorHandler("OTP has expired!", 400));
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return next(new ErrorHandler("Internal server error", 500));
  }
});

export const resendOtp = asyncErrors(async (req, res, next) => {
  const { email } = req.body;

  try {
    // Find the user by email
    const user = await Users.findOne({ where: { email } });
    console.log(user);

    if (!user) {
      return next(new ErrorHandler("User not found!", 400));
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000); // OTP valid for 1 minute

    // Update the user's OTP and expiration time
    await user.update({
      otp, // store OTP in user table
      expires_at: expiresAt, // store expiration time
    });

    console.log(user.otp, user.expires_at);

    // Validate email configuration
    if (!process.env.USER_EMAIL || !process.env.PASS) {
      return next(new ErrorHandler("Email configuration is missing!", 500));
    }

    // Create transport for sending email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.PASS,
      },
      debug: true, // Enable debug output
      logger: true,
    });

    // Prepare email options
    const mailOptions = {
      from: process.env.USER_EMAIL,
      to: user.email,
      subject: "Password Reset OTP",
      text: `Your password reset OTP is: ${user.otp}`,
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
        return next(new ErrorHandler("Error sending email!", 400));
      } else {
        return res.status(200).json({
          success: true,
          message: "Email sent with OTP",
        });
      }
    });
  } catch (error) {
    console.error("Error processing password reset request:", error);
    return next(new ErrorHandler("Internal server error", 500));
  }
});

export const resetPassword = asyncErrors(async (req, res, next) => {
  const { email, password, confirmPassword } = req.body;

  // Validate passwords
  if (password !== confirmPassword) {
    return next(new ErrorHandler("Passwords do not match!", 400));
  }

  if(!email || !password || !confirmPassword){
    return next(new ErrorHandler("Please fill full details!", 400));
  }


  try {
    // Find the user by id
    const user = await Users.findOne({ where: { email } });

    if (!user) {
      console.log("User not found");
      return next(new ErrorHandler("User not found.", 400));
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password
    user.password = hashedPassword;

    await user.save({ hooks: false });

    const updatedUser = await Users.findOne({ where: { email } });
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
    about_me,
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
  if (about_me) user.about_me = about_me;

  // Hash password if provided
  if (password) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    user.password = hashedPassword;
  }

  // File upload
  const filePath = req.file ? req.file.path.replace(/^public\//, '') : user.profileAvatar; 
  user.profileAvatar = filePath;

  if(!user.profileAvatar){
    return next(new ErrorHandler("Please provide profile avatar", 400));
  }

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
  const filePath = req.file.path.replace(/^public\//, '');
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

export const getAllIndividual = asyncErrors(async (req, res, next) => {
  try {
    const Individual = await Users.findAll({
      where: { userType: "individual" },
    });

    let totalIndividualUser = Individual.length;

    if (Individual.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No coaches found",
      });
    }

    res.status(200).json({
      success: true,
      message: "totalIndividualUser retrieved successfully",
      totalIndividualUser,
      Individual,
    });
  } catch (error) {
    console.error("Error retrieving IndividualUser:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

export const getAllCoaches = asyncErrors(async (req, res, next) => {
  try {
    const coaches = await Users.findAll({
      where: { userType: "Coach" },
    });

    let totalCoaches = coaches.length;

    if (coaches.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No coaches found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Coaches retrieved successfully",
      totalCoaches,
      coaches,
    });
  } catch (error) {
    console.error("Error retrieving coaches:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

export const getSingleCoache = asyncErrors(async (req, res, next) => {
  const { coachId } = req.params;

  if (!coachId) {
    return next(new ErrorHandler("coachId must be provided", 400));
  }

  try {
    const coach = await Users.findOne({ where: { id: coachId, userType: "Coach" } });

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: "Coach not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Coach retrieved successfully",
      coach,
    });
  } catch (error) {
    console.error("Error retrieving coach:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

export const deleteUserIndividual = asyncErrors(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new ErrorHandler("User ID is required", 400));
  }

  try {
    const user = await Users.findOne({ where: { id: userId, userType: "individual" } });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    await Users.destroy({ where: { id: userId, userType: "individual" } });

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

export const deleteCoach = asyncErrors(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new ErrorHandler("User ID is required", 400));
  }

  try {
    const user = await Users.findOne({ where: { id: userId, userType: "Coach" } });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    await Users.destroy({ where: { id: userId, userType: "Coach" } });

    res.status(200).json({
      success: true,
      message: "Coach deleted successfully",
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
    const user = await Users.findOne({ where: { id: userId, userType: "individual" } });

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
    const user = await Users.findOne({ where: { id: userId, userType: "individual" } });

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

export const banCoach = asyncErrors(async (req, res, next) => {
  const { coachId } = req.params;

  if (!coachId) {
    return next(new ErrorHandler("coach ID is required", 400));
  }

  try {
    const coach = await Users.findOne({ where: { id: coachId, userType: "Coach" } });

    if (!coach) {
      return next(new ErrorHandler("coach not found", 404));
    }

    coach.banned = true;
    await coach.save();

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

    await sendBanNotification(coach);

    res.status(200).json({
      success: true,
      message: "coach banned successfully",
      coach,
    });
  } catch (error) {
    console.error("Error banning user:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

export const unbanCoach = asyncErrors(async (req, res, next) => {
  const { coachId } = req.params;

  if (!coachId) {
    return next(new ErrorHandler("coach ID is required", 400));
  }

  try {
    const coach = await Users.findOne({ where: { id: coachId, userType: "Coach" } });

    if (!coach) {
      return next(new ErrorHandler("coach not found", 404));
    }

    coach.banned = false;
    await coach.save();

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

    await sendUnBanNotification(coach);

    res.status(200).json({
      success: true,
      message: "coach unbanned successfully",
      coach,
    });
  } catch (error) {
    console.error("Error unbanning user:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

export const getNotificationsAdmin = asyncErrors(async (req, res, next) => {
  try {
    const notifications = await Notifications.findAll({
      where: { isRead: false },
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      countNotifications: notifications.length,
      notifications,
    });
  } catch (error) {
    // return next(new ErrorHandler(error.message, 500));
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

export const markNotificationAsRead = asyncErrors(async (req, res, next) => {
  try {
    const { id } = req.body;

    const notification = await Notifications.findOne({ where: { id } });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await Notifications.update({ isRead: true }, { where: { id } });

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

export const approveOrRejectDocument = asyncErrors(async (req, res, next) => {
  const { userId } = req.params;
  const { status } = req.body; 

  try {
    const user = await Users.findOne({
      where: { id: userId, userType: "Coach" },
    });

    if (!user) {
      return next(new ErrorHandler("User not found or not a coach", 404));
    }

    if (!user.government_issue_image && !user.certificate) {
      return next(
        new ErrorHandler(
          "Coach has not uploaded Documents!",
          400
        )
      );
    }

    if (![1, 2].includes(status)) {
      return next(new ErrorHandler("Invalid status value.", 400));
    }

    user.approved_document = status;
    await user.save();

      let notificationMessage;
      if(notificationMessage = status === 1){
        `Your document has been approved by the admin.`
      }else if(notificationMessage = status === 2){
        `Your document has been rejected by the admin.`
      }else{
        return next(new ErrorHandler("Invalid status value.", 400));  
      }

    // Notify the user of the document status update
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.PASS,
      },
    });

    const mailOptions = {
      from: process.env.USER_EMAIL,
      to: user.email,
      subject: status === 1 ? "Document Approved" : status === 2 ? "Document Rejected" : "Not Valid Status",
      text: `Dear ${user.userName},\n\n${notificationMessage}\n\nRegards,\nAdmin Team`,
    };

    // Send email notification to user
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
        return next(new ErrorHandler("Error sending email!", 400));
      } else {
        console.log("Email sent:", info.response);
      }
    });
   
    res.status(200).json({
      success: true,
      message: `Document ${status === 1 ? "approved" : status === 2 ? "rejected" : "not valid status"} successfully.`,
      status,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

export const statusCheckDocument = asyncErrors(async (req, res, next) => {
  const { userId } = req.params;

  try {
    const user = await Users.findOne({
      where: { id: userId, userType: "Coach" },
    });

    if (!user) {
      return next(new ErrorHandler("User not found or not a coach", 404));
    }


    const status = user.approved_document;
    await user.save();
   
    res.status(200).json({
      success: true,
      message: 'Document status checked successfully.',
      status,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});
