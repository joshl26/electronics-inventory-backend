require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const { logger, logEvents } = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const corsOptions = require("./config/corsOptions");
const connectDB = require("./config/dbConn");
const mongoose = require("mongoose");
const PORT = process.env.PORT || 3500;

const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Outdoorsy",
      version: "0.1.0",
      description:
        "This is a Campsite review application made with Express and documented with Swagger",
      license: {
        name: "MIT",
        url: "https://github.com/joshl26/electronics-inventory-backend/blob/master/LICENSE",
      },
      contact: {
        name: "Joshua Lehman",
        url: "https://joshlehman.ca",
        email: "joshlehman.dev@gmail.com",
      },
    },
    servers: [
      {
        url: process.env.SERVER_URL,
      },
    ],
  },
  apis: ["./routes/*.js"],
};

// Initialize swagger-jsdoc -> returns validated swagger spec in json format
const swaggerSpec = swaggerJSDoc(options);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

mongoose.set("strictQuery", false);

const cloudinary = require("cloudinary").v2;
const Multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
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
    allowedFormats: ["jpeg", "png", "jpg"],
    folder: "ElectronicsInventory",
    use_filename: true,
  });
  return res;
}

// console.log(process.env.NODE_ENV);

connectDB();

app.use(logger);

app.use(cors(corsOptions));

app.use(express.json());

app.use(cookieParser());

app.use("/", express.static(path.join(__dirname, "public")));

app.use("/", require("./routes/root"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/parts", require("./routes/partRoutes"));
app.use("/notes", require("./routes/noteRoutes"));
app.use("/users", require("./routes/userRoutes"));

app.post("/parts/upload", upload.single("my_file"), async (req, res) => {
  // console.log(req);
  try {
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    const cldRes = await handleUpload(dataURI);
    res.json(cldRes);
  } catch (error) {
    console.log(error);
    res.send({
      message: error.message,
    });
  }
});

app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ message: "404 Not Found" });
  } else {
    res.type("txt").send("404 Not Found");
  }
});

app.use(errorHandler);

mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB");
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

mongoose.connection.on("error", (err) => {
  console.log(err);
  logEvents(
    `${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`,
    "mongoErrLog.log"
  );
});
