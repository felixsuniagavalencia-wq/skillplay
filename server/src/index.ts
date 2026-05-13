import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
import gameRoutes from "./routes/game";
import walletRoutes from "./routes/wallet";
import adminRoutes from "./routes/admin";
import authRoutes from "./routes/auth";
import emailTrackingRoutes from "./routes/webhooks/emailTracking";

app.use("/api/game", gameRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/webhooks", emailTrackingRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SkillPlay server running on port ${PORT}`);
});

export default app;