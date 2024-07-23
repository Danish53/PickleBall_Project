
import jwt from 'jsonwebtoken';
import { asyncErrors } from "../middleware/asyncErrors.js";
import ErrorHandler from "../middleware/error.js";
import { Users } from "../model/userModel.js";

//AUTHENTICATION
export const isAuthenticated = asyncErrors(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return next(new ErrorHandler("User is not authenticated!", 400));
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  req.user = await Users.findByPk(decoded.id);

  next();
});

// Middleware admin 
export const isAdmin = async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return next(new ErrorHandler("Admin is not authenticated!", 400));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await Users.findOne({ where: { id: decoded.id, isAdmin: true } });

    if (!user) {
      return res.status(400).json({ success: false, message: 'User is not admin!' });
    }

    // req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};



//AUTHORIZATION
export const isAuthorized = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `User with this role(${req.user.role}) not allowed to access this resource`
        )
      );
    }
    next();
  };
};
