import { Users } from "../model/userModel.js";
import { asyncErrors } from "./asyncErrors.js";
import ErrorHandler from "./error.js";

export const checkBannedUser = asyncErrors(async (req, res, next) => {
    const { id } = req.user;
  
    try {
      const user = await Users.findOne({ where: { id } });
  
      if (user.banned) {
        return next(new ErrorHandler("Your account has been banned", 403));
      }
  
      next();
    } catch (error) {
      console.error("Error checking banned user:", error);
      res.status(500).json({ message: "Internal Server Error", error });
    }
  });
  