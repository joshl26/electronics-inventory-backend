const express = require("express");
const router = express.Router();
const usersController = require("../controllers/userController");
const verifyJWT = require("../middleware/verifyJWT");

/**
 * @swagger
 *  components:
 *   schemas:
 *    Users:
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

/**
 * @swagger
 * /register/:
 *   get:
 *     tags:
 *     - Users
 *
 */

/**
 * @swagger
 * /users/:
 *   get:
 *     summary: Register new user form
 *     description: Register new user form
 *     responses:
 *       200:
 *         description: update campground listing contents
 */

router.use(verifyJWT);
router
  .route("/")
  .get(usersController.getAllUsers)
  .post(usersController.createNewUser)
  .patch(usersController.updateUser)
  .delete(usersController.deleteUser);

module.exports = router;
