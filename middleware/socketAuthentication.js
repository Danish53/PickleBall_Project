import { Users } from "../model/userModel.js";
import jwt from 'jsonwebtoken';
import ErrorHandler from "./error.js";


export const isSocketAuthenticated = (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    const err = new ErrorHandler("User is not authenticated!", 400);
    return next(err);
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
    if (err) {
      const err = new ErrorHandler("Invalid token", 400);
      return next(err);
    }
    
    try {
      const user = await Users.findByPk(decoded.id);
      if (!user) {
        const err = new ErrorHandler("User not found", 404);
        return next(err);
      }
      
      socket.user = user;
      next();
    } catch (err) {
      return next(err);
    }
  });
};

