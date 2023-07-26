const express = require("express");
const router = express.Router();
const notesController = require("../controllers/notesController");
const verifyJWT = require("../middleware/verifyJWT");

/**
 * @swagger
 *  components:
 *   schemas:
 *    Notes:
 *      type: object
 *      required:
 *      - username
 *      - password
 *      properties:
 *          _id:
 *             type: string
 *             format: uuid
 *             description: The unique id auto generated by mongoose for the user
 *          username:
 *              type: string
 *              description: The username of the user
 *          password:
 *              type: string
 *              description: The username of the user
 *          roles:
 *              type: array
 *              description: Array of roles for this user
 *              items:
 *                  type: object
 *                  properties:
 *                      role:
 *                          type: string
 *                          description: The role of the user
 *          __V:
 *              type: number
 *              format: int32
 *              description: Version of the user settings, starting at 0 and incremented by +1 with each change saved
 *          colorMode:
 *              type: string
 *              description: The colorMode of the User
 *          partsListView:
 *              type: string
 *              description: The style of tables selected by user
 *
 */

/**
 * @swagger
 * /notes/:
 *   get:
 *     tags:
 *     - Notes
 *
 */

/**
 * @swagger
 * /notes/:
 *   get:
 *     summary: Get all notes from DB
 *     description: Return all notes in database
 *     responses:
 *       200:
 *         description: List of notes
 */

/**
 * @swagger
 * /notes/:
 *   post:
 *     tags:
 *     - Notes
 *
 */

/**
 * @swagger
 * /notes/:
 *   post:
 *     summary: Create new note
 *     description: Create new note
 *     responses:
 *       200:
 *         description: Create new note
 */

/**
 * @swagger
 * /notes/:
 *   patch:
 *     tags:
 *     - Notes
 *
 */

/**
 * @swagger
 * /notes/:
 *   patch:
 *     summary: Update note details
 *     description: Update note details
 *     responses:
 *       200:
 *         description: Update note details
 */

/**
 * @swagger
 * /notes/:
 *   delete:
 *     tags:
 *     - Notes
 *
 */

/**
 * @swagger
 * /notes/:
 *   delete:
 *     summary: Delete note
 *     description: Delete note
 *     responses:
 *       200:
 *         description: Delete note
 */

router.use(verifyJWT);

router
  .route("/")
  .get(notesController.getAllNotes)
  .post(notesController.createNewNote)
  .patch(notesController.updateNote)
  .delete(notesController.deleteNote);

module.exports = router;
