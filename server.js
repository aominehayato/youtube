import express from "express";
import crypto from "crypto";
import videoRouter from "./routes/video.js";
import searchRouter from "./routes/search.js";
import streamRouter from "./routes/stream.js";
import commentRouter from "./routes/comment.js";
import channelRouter from "./routes/channel.js";
import playlistRouter from "./routes/playlist.js";

const app = express();

app.use(express.json());

// 環境変数 ALLOWED_ORIGINS から許可するオリジンを取得（未設定時はセキュリティのためすべて拒否）
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || "";
const allowedOrigins = allowedOriginsEnv ? allowedOriginsEnv.split(",").map(o => o.trim()) : [];

// 本番向けの厳格なCORS制御ミドルウェア（許可されていないオリジンは完全に拒否）
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (allowedOrigins.length === 0) {
    return res.status(403).json({ error: "CORS Error: ALLOWED_ORIGINS is not configured on the server." });
  }

  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: "Forbidden: Origin not allowed by CORS policy." });
  }

  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-api-key, x-signature, x-timestamp");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

/**
 * 厳格なHMAC署名およびAPIキー認証ミドルウェア
 * 不正なリクエストやリプレイ攻撃を防ぐため、API_KEYに加え、x-signatureおよびx-timestampの送信を完全に必須化する
 */
app.use((req, res, next) => {
  if (req.path === "/health") {
    return next();
  }

  const serverApiKey = process.env.API_KEY;
  if (!serverApiKey) {
    return res.status(500).json({ error: "Server configuration error: API_KEY is not configured on the server." });
  }

  // 1. APIキーの検証
  const clientApiKey = req.headers["x-api-key"];
  if (clientApiKey !== serverApiKey) {
    return res.status(403).json({ error: "Forbidden: Invalid or missing API key." });
  }

  // 2. HMAC署名とタイムスタンプの完全必須化
  const clientSignature = req.headers["x-signature"];
  const clientTimestamp = req.headers["x-timestamp"];

  if (!clientSignature || !clientTimestamp) {
    return res.status(401).json({ error: "Unauthorized: Missing request signature or timestamp." });
  }

  // タイムスタンプの有効期限は5分以内とする（リプレイ攻撃防止）
  const now = Date.now();
  const reqTime = parseInt(clientTimestamp, 10);
  if (isNaN(reqTime) || Math.abs(now - reqTime) > 5 * 60 * 1000) {
    return res.status(401).json({ error: "Unauthorized: Request timestamp expired or invalid." });
  }

  const payload = clientTimestamp + ":" + req.method + ":" + req.path;
  const expectedSignature = crypto
    .createHmac("sha256", serverApiKey)
    .update(payload)
    .digest("hex");

  if (clientSignature !== expectedSignature) {
    return res.status(403).json({ error: "Forbidden: Invalid request signature." });
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

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("SiaTube Production API server started on port " + PORT);
});
