const express = require("express");
const router = express.Router();
const usersController = require("../controllers/userController");
const verifyJWT = require("../middleware/verifyJWT");

/**
 * @swagger
 *  components:
 *   schemas:
 *    User:
 *      type: object
 *      required:
 *      - username
 *      - email
 *      properties:
 *          id:
 *              type: string
 *              description: The auto generated id of the user
 *          email:
 *              type: string
 *              description: The email adress of the user
 *          username:
 *              type: string
 *              description: The username of the user
 */

router.use(verifyJWT);
router
  .route("/")
  .get(usersController.getAllUsers)
  .post(usersController.createNewUser)
  .patch(usersController.updateUser)
  .delete(usersController.deleteUser);

module.exports = router;
