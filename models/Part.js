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
  },
  {
    timestamps: true,
  }
);

partSchema.plugin(AutoIncrement, {
  inc_field: "ticket2",
  id: "ticket2Nums",
  start_seq: 500,
});

module.exports = mongoose.model("Part", partSchema);
