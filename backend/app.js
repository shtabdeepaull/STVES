
const authRoutes = require("./routes/auth.routes");
const vehicleRoutes = require("./routes/vehicle.routes");

const express = require("express");
const cors = require("cors");

const env = require("./config/env");
const {
  notFoundMiddleware,
  errorMiddleware,
} = require("./middlewares/errorMiddleware");

const app = express();

const allowedOrigins = [
  env.clientUrl,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "STVES Industrial API is running",
    mode: env.nodeEnv,
    brtaMode: env.brtaMode,
    brtaProvider: env.brtaProviderName,
    timestamp: new Date().toISOString(),
  });
});


app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);


app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;