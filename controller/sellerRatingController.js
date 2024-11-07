import { asyncErrors } from "../middleware/asyncErrors.js";
import ErrorHandler from "../middleware/error.js";
import { SellerRating } from "../model/sellerRating.js";
import { uploadProduct } from "../model/uploadProductModel.js";

export const addSellerRating = asyncErrors(async (req, res, next) => {
  const { sellerId } = req.params;
  const { rating } = req.body;

  if (!sellerId || !rating) {
    return next(new ErrorHandler("Seller ID and Rating must be provided", 400));
  }

  if (rating < 1.0 || rating > 5.0) {
    return next(new ErrorHandler("Rating must be between 1.0 and 5.0", 400));
  }

  try {
    let seller = await uploadProduct.findOne({
      where: {
        userId: sellerId,
      },
    });

    if (!seller) {
      return next(new ErrorHandler("seller not found", 404));
    }

    const existingRating = await SellerRating.findOne({
      where: {
        userId: req.user.id,
        sellerId,
      },
    });

    if (existingRating) {
      return next(new ErrorHandler("You have already rated this seller", 400));
    }

    const newRating = await SellerRating.create({
      userId: req.user.id,
      sellerId,
      rating,
    });

    res.status(200).json({
      success: true,
      message: "Rating added successfully",
      rating: newRating,
    });
  } catch (error) {
    console.error("Error adding Rating:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});



