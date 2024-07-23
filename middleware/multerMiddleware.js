import multer from "multer";


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp"); //img folder path
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); //uploaded filename
  }
});

// Create multer instance with the storage configuration
export const upload = multer({ storage });

