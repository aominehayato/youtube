import express from "express";
import videoRouter from "./routes/video.js";
import searchRouter from "./routes/search.js";
import streamRouter from "./routes/stream.js";
import commentRouter from "./routes/comment.js";
import channelRouter from "./routes/channel.js";
import playlistRouter from "./routes/playlist.js";

const app = express();

// JSON ボディパーサーのミドルウェアを設定
app.use(express.json());

// CORS 許可設定（本番環境では適宜ドメインを制限してください）
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-api-key");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// 厳格なAPIキー認証ミドルウェア（サーバー側にAPI_KEYの設定を強制し不正アクセスを完全ブロック）
app.use((req, res, next) => {
  // ヘルスチェックは認証除外
  if (req.path === "/health") {
    return next();
  }

  const serverApiKey = process.env.API_KEY;
  if (!serverApiKey) {
    return res.status(500).json({ error: "Server configuration error: API_KEY is not configured on the server." });
  }

  const clientApiKey = req.headers["x-api-key"];
  if (clientApiKey !== serverApiKey) {
    return res.status(403).json({ error: "Forbidden: Invalid or missing API key." });
  }

  next();
});

// 各種ルート（APIエンドポイント）のマッピング
app.use("/api/video", videoRouter);
app.use("/api/search", searchRouter);
app.use("/api/stream", streamRouter);
app.use("/api/comment", commentRouter);
app.use("/api/channel", channelRouter);
app.use("/api/playlist", playlistRouter);

// Render のスリープ対策（5分ごとのヘルスチェック用）
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// サーバーの起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("SiaTube Production API server started on port " + PORT);
});
