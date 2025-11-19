const express = require("express");
const router = express.Router();
const partsController = require("../controllers/partsController");
const verifyJWT = require("../middleware/verifyJWT");
const csrfProtection = require("../middleware/csrfProtection");

router.use(verifyJWT);

router
  .route("/")
  .get(partsController.getAllParts)
  .post(csrfProtection, partsController.createNewPart) // CSRF for POST
  .patch(csrfProtection, partsController.updatePart)   // CSRF for PATCH
  .delete(csrfProtection, partsController.deletePart); // CSRF for DELETE

module.exports = router;