import express from "express";
import crypto from "crypto";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import logger from "./utils/logger.js";
import videoRouter from "./routes/video.js";
import searchRouter from "./routes/search.js";
import streamRouter from "./routes/stream.js";
import commentRouter from "./routes/comment.js";
import channelRouter from "./routes/channel.js";
import playlistRouter from "./routes/playlist.js";

const app = express();

app.use(express.json());

// セキュリティヘッダーおよびレスポンス圧縮の適用
app.use(helmet());
app.use(compression());
app.use(pinoHttp({ logger }));

// グローバルベースレートリミット
const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again later." }
});
app.use("/api/", globalApiLimiter);

// 1. /health エンドポイントは認証やCORSの前に配置
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || "";
const allowedOrigins = allowedOriginsEnv ? allowedOriginsEnv.split(",").map(o => o.trim()) : [];

// 2. CORS制御ミドルウェア
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (origin) {
    if (allowedOrigins.length === 0 || !allowedOrigins.includes(origin)) {
      return res.status(403).json({ error: "Forbidden: Origin not allowed by CORS policy." });
    }
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    res.header("Access-Control-Allow-Origin", allowedOrigins.length > 0 ? allowedOrigins[0] : "*");
  }

  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-api-key, x-signature, x-timestamp");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

/**
 * オブジェクトのキーをアルファベット順にソートしてCanonical JSON文字列を生成する関数
 */
function stableStringify(obj) {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(stableStringify).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  let result = "{";
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    result += JSON.stringify(key) + ":" + stableStringify(obj[key]);
    if (i < keys.length - 1) {
      result += ",";
    }
  }
  result += "}";
  return result;
}

/**
 * 3. Canonical JSON対応の厳格なHMAC署名検証ミドルウェア
 */
app.use((req, res, next) => {
  const serverApiKey = process.env.API_KEY;
  if (!serverApiKey) {
    return res.status(500).json({ error: "Server configuration error: API_KEY is not configured on the server." });
  }

  const clientApiKey = req.headers["x-api-key"];
  if (clientApiKey !== serverApiKey) {
    return res.status(403).json({ error: "Forbidden: Invalid or missing API key." });
  }

  const clientSignature = req.headers["x-signature"];
  const clientTimestamp = req.headers["x-timestamp"];

  if (!clientSignature || !clientTimestamp) {
    return res.status(401).json({ error: "Unauthorized: Missing request signature or timestamp." });
  }

  const now = Date.now();
  const reqTime = parseInt(clientTimestamp, 10);
  if (isNaN(reqTime) || Math.abs(now - reqTime) > 5 * 60 * 1000) {
    return res.status(401).json({ error: "Unauthorized: Request timestamp expired or invalid." });
  }

  let parsedBody = {};
  if (req.body && Object.keys(req.body).length > 0) {
    parsedBody = req.body;
  }
  const rawBody = Object.keys(parsedBody).length > 0 ? stableStringify(parsedBody) : "";
  const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex");

  let parsedQuery = {};
  if (req.query && Object.keys(req.query).length > 0) {
    parsedQuery = req.query;
  }
  const rawQuery = Object.keys(parsedQuery).length > 0 ? stableStringify(parsedQuery) : "{}";
  const queryHash = crypto.createHash("sha256").update(rawQuery).digest("hex");

  const payload = [clientTimestamp, req.method, req.originalUrl, bodyHash, queryHash].join(":");

  const expectedSignature = crypto
    .createHmac("sha256", serverApiKey)
    .update(payload)
    .digest("hex");

  if (clientSignature !== expectedSignature) {
    return res.status(403).json({ error: "Forbidden: Invalid request signature or tampered payload." });
  }

  next();
});

// 各種ルートのマッピング
app.use("/api/video", videoRouter);
app.use("/api/search", searchRouter);
app.use("/api/stream", streamRouter);
app.use("/api/comment", commentRouter);
app.use("/api/channel", channelRouter);
app.use("/api/playlist", playlistRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info("SiaTube Production API server v2.9.1 started on port " + PORT);
});
