const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const partSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    qty: {
      type: Number,
      default: 0,
      required: true,
    },
    partType: {
      type: String,
      required: true,
    },
    images: {
      type: Array,
      default: [],
      required: false,
    },
    partLocation: {
      type: String,
      default: "",
      required: false,
    },
    partPackage: {
      type: String,
      default: "",
      required: false,
    },
    partNumber: {
      type: String,
      default: "",
      required: false,
    },
    serialNumber: {
      type: String,
      default: "",
      required: false,
    },
    manufacturer: {
      type: String,
      default: "",
      required: false,
    },
    vendorName: {
      type: String,
      default: "",
      required: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: "User",
    },
    mfgDate: {
      type: String,
      default: "",
      required: false,
    },
    backOrder: {
      type: String,
      default: "",
      required: false,
    },
  },
  {
    timestamps: true, //Adds createdAt and updatedAt timestamp fields to part record
  }
);

partSchema.plugin(AutoIncrement, {
  inc_field: "ticket2",
  id: "ticket2Nums",
  start_seq: 500,
});

module.exports = mongoose.model("Part", partSchema);
