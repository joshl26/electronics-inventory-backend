// require("dotenv").config();
// const cloudinary = require("cloudinary").v2;
// const { CloudinaryStorage } = require("multer-storage-cloudinary");

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_KEY,
//   api_secret: process.env.CLOUDINARY_SECRET,
// });

// // console.log(cloudinary.config().cloud_name);
// // console.log(cloudinary.config().api_key);
// // console.log(cloudinary.config().api_secret);

// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: "ElectronicsInventory",
//     allowedFormats: ["jpeg", "png", "jpg"],
//   },
// });

// module.exports = {
//   cloudinary,
//   storage,
// };
