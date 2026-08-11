import express, { Express } from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import cookieParser from "cookie-parser";
import documentRouter from "./routes/document.route.js";
import { authRouter } from "./routes/auth.route.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app: Express = express();

app.use(cors({
  origin: process.env.CLIENT_URL ?? "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/docs", documentRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);

export default app;