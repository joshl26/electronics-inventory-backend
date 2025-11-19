// description: Main server file for Electronics Inventory Management System
// file: server.js

require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { logger, logEvents } = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const corsOptions = require("./config/corsOptions");
const connectDB = require("./config/dbConn");
const mongoose = require("mongoose");
const PORT = process.env.PORT || 3500;

mongoose.set("strictQuery", false);

// Connect to MongoDB
connectDB();

// ============ SECURITY MIDDLEWARE ============

// 1. Helmet - Security headers (must be early in middleware chain)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// 2. Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Too many API requests, please try again later.",
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: "Upload limit reached, please try again later.",
});

// Apply global limiter to all routes
app.use(globalLimiter);

// 3. Logging
app.use(logger);

// 4. CORS
app.use(cors(corsOptions));

// 5. Body Parsing with size limits
app.use(express.json({ 
  limit: '10kb', 
  strict: true 
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10kb' 
}));

// 6. Cookie Parser
app.use(cookieParser());

// 7. Input Sanitization
const { 
  xssProtection, 
  noSQLInjectionProtection 
} = require('./middleware/sanitization');

app.use(xssProtection);
app.use(noSQLInjectionProtection);

// ============ CLOUDINARY CONFIG ============
const cloudinary = require("cloudinary").v2;
const Multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const storage = new Multer.memoryStorage();
const upload = Multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 1, // Maximum 1 file per upload
  },
  fileFilter: (req, file, cb) => {
    // Whitelist allowed file types
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF allowed.'));
    }
  },
});

async function handleUpload(file) {
  const res = await cloudinary.uploader.upload(file, {
    resource_type: "image",
    allowedFormats: ["jpeg", "png", "jpg", "pdf"],
    folder: "ElectronicsInventory",
    use_filename: true,
  });
  return res;
}

// ============ SWAGGER DOCS ============
const fs = require("fs");
const YAML = require("yaml");
const file = fs.readFileSync("./postman/schemas/index.yaml", "utf8");
const swaggerDocument = YAML.parse(file);
const swaggerUi = require("swagger-ui-express");

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ============ CSRF PROTECTION ============
// Optional: Only if you need CSRF for cookie-based auth
// Uncomment if you want CSRF protection
/*
const csrfProtection = require('./middleware/csrfProtection');

app.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
*/

// ============ STATIC FILES ============
app.use("/", express.static(path.join(__dirname, "public")));

// ============ ROUTES ============
app.use("/", require("./routes/root"));
app.use("/auth", require("./routes/authRoutes"));

// Apply API rate limiter to protected routes
app.use("/parts", apiLimiter, require("./routes/partRoutes"));
app.use("/notes", apiLimiter, require("./routes/noteRoutes"));
app.use("/users", apiLimiter, require("./routes/userRoutes"));

// Optional: API Key management routes (for admins)
app.use("/api-keys", require("./routes/apiKeyRoutes"));

// File upload endpoint with strict rate limiting
app.post(
  "/parts/upload", 
  uploadLimiter, 
  upload.single("my_file"), 
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const b64 = Buffer.from(req.file.buffer).toString("base64");
      let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      const cldRes = await handleUpload(dataURI);
      res.json(cldRes);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// ============ ERROR HANDLING ============

// Handle Multer errors
app.use((error, req, res, next) => {
  if (error instanceof Multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Too many files. Maximum is 1 file per upload.'
      });
    }
  }
  
  // Handle file type errors
  if (error.message === 'Invalid file type. Only JPEG, PNG, and PDF allowed.') {
    return res.status(400).json({ message: error.message });
  }
  
  next(error);
});

// 404 Handler
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

// Global Error Handler
app.use(errorHandler);

// ============ DATABASE CONNECTION ============
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