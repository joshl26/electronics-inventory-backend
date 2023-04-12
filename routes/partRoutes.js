const express = require("express");
const router = express.Router();
const partsController = require("../controllers/partsController");
const verifyJWT = require("../middleware/verifyJWT");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");
const Multer = require("multer");

cloudinary.config({
  cloud_name: "dv6keahg3",
  api_key: "352394212659861",
  api_secret: "isdfykrP_KuNXZz8oHx0Tzd6lCY",
});

// console.log(cloudinary.config().cloud_name);
// console.log(cloudinary.config().api_key);
// console.log(cloudinary.config().api_secret);

const storage = new Multer.memoryStorage();
const upload = Multer({
  storage,
});

async function handleUpload(file) {
  const res = await cloudinary.uploader.upload(file, {
    resource_type: "image",
    folder: "ElectronicsInventory",
    use_filename: true,
  });
  return res;
}

// router.use(verifyJWT);

router
  .route("/")
  .get(partsController.getAllParts)
  .post(partsController.createNewPart)
  .patch(partsController.updatePart)
  // .patch(upload.array("newImages"), partsController.updatePart)
  .delete(partsController.deletePart);

// router.route("/upload").post(upload.single("my_file"));

module.exports = router;
