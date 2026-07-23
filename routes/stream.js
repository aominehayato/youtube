import express from "express";
import fs from "fs";
import { execFile } from "child_process";
import path from "path";
import { streamLimiter } from "../utils/limiter.js";
import logger from "../utils/logger.js";

const router = express.Router();

// ストリームURLの有効期限（4分）とメモリリーク防止のためのキャッシュ上限管理
const streamCache = new Map();
const CACHE_TTL_MS = 4 * 60 * 1000;
const MAX_CACHE_SIZE = 1000;

// 同時実行数制限セマフォ（最大3プロセスまで）
let activeYtDlpProcesses = 0;
const MAX_CONCURRENT_YTDLP = 3;
const executionQueue = [];

function processQueue() {
  if (executionQueue.length > 0 && activeYtDlpProcesses < MAX_CONCURRENT_YTDLP) {
    const task = executionQueue.shift();
    task();
  }
}

/**
 * GET /api/stream/:id
 * yt-dlp を用いてYouTubeのストリームURLを取得し、同時実行制御とキャッシュを活用して高速リダイレクトする
 */
router.get("/:id", streamLimiter, (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Cross-Origin-Resource-Policy", "cross-origin");

  const videoId = req.params.id;

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: "Invalid video id format." });
  }

  const format = req.query.format || "default";
  const cacheKey = `${videoId}_${format}`;

  const cached = streamCache.get(cacheKey);
  const now = Date.now();
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return res.redirect(302, cached.url);
  }

  const isWindows = process.platform === "win32";
  const ytDlpFileName = isWindows ? "yt-dlp.exe" : "yt-dlp";
  const ytDlpPath = path.join(process.cwd(), "bin", ytDlpFileName);

  if (!fs.existsSync(ytDlpPath)) {
    logger.error("Critical error: yt-dlp binary not found at " + ytDlpPath);
    return res.status(500).json({ error: "Internal Server Error" });
  }

  const videoUrl = "https://www.youtube.com/watch?v=" + videoId;

  const runYtDlp = () => {
    activeYtDlpProcesses++;

    execFile(ytDlpPath, ["-g", "--no-warnings", "--no-playlist", videoUrl], { timeout: 15000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      activeYtDlpProcesses--;
      processQueue();

      if (error) {
        logger.error({
          error: error.message,
          stderr,
          stdout,
          videoId
        }, "yt-dlp failed");

        return res.status(500).json({
          error: "yt-dlp failed"
        });
      }

      const urls = stdout.trim().split("\n");
      const streamUrl = urls[0];

      if (!streamUrl) {
        logger.error({ stderr, stdout, videoId }, "yt-dlp returned empty stream URL");
        return res.status(500).json({ error: "Internal Server Error" });
      }

      if (streamCache.size >= MAX_CACHE_SIZE) {
        streamCache.clear();
      }
      streamCache.set(cacheKey, { url: streamUrl, timestamp: Date.now() });

      return res.redirect(302, streamUrl);
    });
  };

  if (activeYtDlpProcesses >= MAX_CONCURRENT_YTDLP) {
    if (executionQueue.length >= 50) {
      return res.status(429).json({ error: "Too many stream extraction requests, please try again later." });
    }
    executionQueue.push(runYtDlp);
  } else {
    runYtDlp();
  }
});

export default router;
