const Part = require("../models/Part");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;

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

  // const partUser = await User.findById(part.user).lean().exec();

  const {
    user,
    name,
    description,
    qty,
    partType,
    createdBy,
    backOrder,
    images,
    newImages,
    deletedImages,
    partNumber,
    lotId,
    serialNumber,
    manufacturer,
    mfgDate,
    vendorName,
    partPackage,
    partLocation,
    cost,
  } = req.body;

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

  // Create and store the new part
  const part = await Part.create({
    user,
    name,
    description,
    qty,
    partType,
    createdBy,
    backOrder,
    images,
    newImages,
    deletedImages,
    partNumber,
    lotId,
    serialNumber,
    manufacturer,
    mfgDate,
    vendorName,
    partPackage,
    partLocation,
    cost,
  });

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
  console.log(req);
  const {
    id,
    user,
    name,
    description,
    qty,
    partType,
    createdBy,
    backOrder,
    updatedBy,
    images,
    newImages,
    deletedImages,
    partNumber,
    lotId,
    serialNumber,
    manufacturer,
    mfgDate,
    vendorName,
    partPackage,
    partLocation,
    cost,
  } = req.body;

  // console.log("Update Part with following data:");
  // console.log(id);
  // console.log(user);
  // console.log(name);
  // console.log(description);
  // console.log(qty);
  // console.log(partType);
  console.log(newImages);

  // Confirm data
  if (!id || !user || !name || !description) {
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
  part.partNumber = partNumber;
  part.partType = partType;
  part.createdBy = createdBy;
  part.description = description;
  part.qty = qty;
  part.backOrder = backOrder;
  part.cost = cost;
  part.partLocation = partLocation;
  part.partPackage = partPackage;
  part.lotId = lotId;
  part.serialNumber = serialNumber;
  part.mfgDate = mfgDate;
  part.manufacturer = manufacturer;
  part.vendorName = vendorName;
  part.updatedBy = updatedBy;
  part.images = images;
  part.deletedImages = deletedImages;

  if (req.body.deletedImages) {
    // console.log(req.body.deletedImages);

    for (let fileName of req.body.deletedImages) {
      // console.log(fileName.fileName);
      await cloudinary.uploader.destroy(fileName.fileName);
    }
    part.deletedImages = [];
  }

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
