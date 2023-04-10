const Part = require("../models/Part");
const User = require("../models/User");

// @desc Get all parts
// @route GET /parts
// @access Private
const getAllParts = async (req, res) => {
  // Get all parts from MongoDB
  const parts = await Part.find().lean();

  // console.log(req);
  // console.log(parts);
  // console.log("Get all parts");

  // If no parts
  if (!parts?.length) {
    return res.status(400).json({ message: "No parts found" });
  }

  // Add username to each part before sending the response
  // See Promise.all with map() here: https://youtu.be/4lqJBBEpjRE
  // You could also do this with a for...of loop
  const partsWithUser = await Promise.all(
    parts.map(async (part) => {
      const user = await User.findById(part.user).lean().exec();
      return { ...part, username: user.username };
    })
  );
  // console.log(partsWithUser);
  res.json(partsWithUser);
};

// @desc Create new part
// @route POST /parts
// @access Private
const createNewPart = async (req, res) => {
  // console.log("Create new part");

  const { user, name, description, qty, partType } = req.body;

  // Confirm data
  if (!user || !name || !description) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check for duplicate name
  const duplicate = await Part.findOne({ name })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();

  if (duplicate) {
    return res.status(409).json({ message: "Duplicate part name" });
  }

  // Create and store the new user
  const part = await Part.create({ user, name, description, qty, partType });

  if (part) {
    // Created
    return res.status(201).json({ message: "New part created" });
  } else {
    return res.status(400).json({ message: "Invalid part data received" });
  }
};

// @desc Update a part
// @route PATCH /parts
// @access Private
const updatePart = async (req, res) => {
  console.log(req.body);
  const { id, user, name, description, qty, partType } = req.body;

  // console.log("Update Part with following data:");
  // console.log(id);
  // console.log(user);
  // console.log(name);
  // console.log(description);
  // console.log(qty);
  // console.log(partType);

  // Confirm data
  if (!id || !user || !name || !description || !qty || !partType) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Confirm part exists to update
  const part = await Part.findById(id).exec();

  // console.log(part);

  if (!part) {
    return res.status(400).json({ message: "Part not found" });
  }

  // Check for duplicate name
  const duplicate = await Part.findOne({ name })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();

  // Allow renaming of the original part
  if (duplicate && duplicate?._id.toString() !== id) {
    return res.status(409).json({ message: "Duplicate part name" });
  }

  part.user = user;
  part.name = name;
  part.description = description;
  part.qty = qty;
  part.partType = partType;

  const updatedPart = await part.save();

  // console.log(updatedPart);

  res.json(`'${updatedPart.name}' updated`);
};

// @desc Delete a part
// @route DELETE /parts
// @access Private
const deletePart = async (req, res) => {
  const { id } = req.body;

  // Confirm data
  if (!id) {
    return res.status(400).json({ message: "Part ID required" });
  }

  // Confirm part exists to delete
  const part = await Part.findById(id).exec();

  if (!part) {
    return res.status(400).json({ message: "Part not found" });
  }

  const result = await part.deleteOne();

  const reply = `Part '${result.name}' with ID ${result._id} deleted`;

  res.json(reply);
};

module.exports = {
  getAllParts,
  createNewPart,
  updatePart,
  deletePart,
};
