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

// 1. /health エンドポイントは認証やCORSの前に配置し、Render等の死活監視が確実に200を返すようにする
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// 環境変数 ALLOWED_ORIGINS から許可するオリジンを取得
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || "";
const allowedOrigins = allowedOriginsEnv ? allowedOriginsEnv.split(",").map(o => o.trim()) : [];

// 2. CORS制御ミドルウェア（サーバー間通信やcurl等のOriginが存在しないリクエストは許可し、不正な外部Originのみ厳格に拒否）
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (origin) {
    if (allowedOrigins.length === 0 || !allowedOrigins.includes(origin)) {
      return res.status(403).json({ error: "Forbidden: Origin not allowed by CORS policy." });
    }
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    // Originが存在しないサーバー間通信やCLIツール等の場合はワイルドカードまたは最初の許可オリジンを適用
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
 * 3. 厳格なHMAC署名およびAPIキー認証ミドルウェア（リクエストボディの改ざん防止ハッシュを完備）
 */
app.use((req, res, next) => {
  const serverApiKey = process.env.API_KEY;
  if (!serverApiKey) {
    return res.status(500).json({ error: "Server configuration error: API_KEY is not configured on the server." });
  }

  // APIキーの検証
  const clientApiKey = req.headers["x-api-key"];
  if (clientApiKey !== serverApiKey) {
    return res.status(403).json({ error: "Forbidden: Invalid or missing API key." });
  }

  // HMAC署名とタイムスタンプの完全必須化
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

  // リクエストボディのハッシュ値を計算してペイロードに含め、ボディ改ざんを完全に封じる
  const rawBody = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : "";
  const bodyHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const payload = clientTimestamp + ":" + req.method + ":" + req.path + ":" + bodyHash;

  const expectedSignature = crypto
    .createHmac("sha256", serverApiKey)
    .update(payload)
    .digest("hex");

  if (clientSignature !== expectedSignature) {
    return res.status(403).json({ error: "Forbidden: Invalid request signature or tampered body." });
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
  console.log("SiaTube Production API server v2.7.0 started on port " + PORT);
});
