import express from "express";
import cors from "cors";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const app = express();
const PORT = process.env.PORT || 10000;

// 絶対パスの取得設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// bin/yt-dlp への絶対パスを決定
const YTDLP_PATH = path.join(__dirname, "bin", "yt-dlp");

// 起動時に存在確認ログを出力
console.log("Checking yt-dlp binary path:", YTDLP_PATH);
if (fs.existsSync(YTDLP_PATH)) {
  console.log("yt-dlp binary exists: TRUE");
} else {
  console.error("CRITICAL ERROR: yt-dlp binary NOT found at path above!");
}

// CORS の設定
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

// ヘルスチェック用エンドポイント
app.get("/", (req, res) => {
  const exists = fs.existsSync(YTDLP_PATH);
  res.json({
    status: "yt-dlp Stream API is running",
    ytDlpExists: exists,
    ytDlpPath: YTDLP_PATH
  });
});

// 動画メタデータ取得エンドポイント (/api/info)
app.post("/api/info", async (req, res) => {
  const { videoId } = req.body;

  if (!videoId) {
    return res.status(400).json({ error: "videoId is required" });
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const args = [
    "--dump-json",
    "--no-warnings",
    "--extractor-args", "youtube:player_client=android",
    url
  ];

  try {
    const { stdout } = await execFileAsync(YTDLP_PATH, args);
    const info = JSON.parse(stdout);

    res.json({
      status: "success",
      title: info.title,
      duration: info.duration,
      thumbnail: info.thumbnail,
      uploader: info.uploader
    });
  } catch (error) {
    console.error("Error in /api/info:", error.stderr || error.message);
    res.status(500).json({
      error: "Failed to fetch video info",
      details: error.stderr || error.message
    });
  }
});

// ストリームURL取得エンドポイント (/api/stream)
app.post("/api/stream", async (req, res) => {
  const { videoId, format } = req.body;

  if (!videoId) {
    return res.status(400).json({ error: "videoId is required" });
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  
  let formatOption = "best[ext=mp4]/best";
  if (format === "mp3") {
    formatOption = "bestaudio[ext=m4a]/bestaudio";
  }

  const args = [
    "-f", formatOption,
    "-g",
    "--no-warnings",
    "--extractor-args", "youtube:player_client=android",
    url
  ];

  try {
    const { stdout } = await execFileAsync(YTDLP_PATH, args);
    const streamUrl = stdout.trim().split("\n")[0];

    if (!streamUrl) {
      return res.status(500).json({ error: "Stream URL not found" });
    }

    res.json({
      status: "success",
      videoId: videoId,
      streamUrl: streamUrl
    });
  } catch (error) {
    console.error("Error in /api/stream:", error.stderr || error.message);
    res.status(500).json({
      error: "Failed to extract stream URL",
      details: error.stderr || error.message
    });
  }
});

// リダイレクト方式の再生用エンドポイント (/api/play?id=xxx)
app.get("/api/play", async (req, res) => {
  const videoId = req.query.id;

  if (!videoId) {
    return res.status(400).send("videoId query parameter is required");
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const args = [
    "-f", "best[ext=mp4]/best",
    "-g",
    "--no-warnings",
    "--extractor-args", "youtube:player_client=android",
    url
  ];

  try {
    const { stdout } = await execFileAsync(YTDLP_PATH, args);
    const streamUrl = stdout.trim().split("\n")[0];

    if (streamUrl) {
      res.redirect(302, streamUrl);
    } else {
      res.status(500).send("Failed to get stream URL");
    }
  } catch (error) {
    console.error("Error in /api/play:", error.stderr || error.message);
    res.status(500).send("Failed to process play request");
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
