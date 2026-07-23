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

// CORS 許可設定（GASやフロントエンドからのリクエストを通すため）
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
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
  console.log("SiaTube API server started on port " + PORT);
});
