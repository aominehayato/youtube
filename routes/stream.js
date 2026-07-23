import express from "express";
import fs from "fs";
import { execFile } from "child_process";
import path from "path";
import { streamLimiter } from "../utils/limiter.js";
import logger from "../utils/logger.js";

const router = express.Router();

// ストリームURLの有効期限（YouTubeの仕様を考慮し、安全のため4分間でキャッシュ破棄）
const streamCache = new Map();
const CACHE_TTL_MS = 4 * 60 * 1000;

/**
 * GET /api/stream/:id
 * yt-dlp を用いてYouTubeのストリームURLを取得し、キャッシュを活用して高速リダイレクトする
 */
router.get("/:id", streamLimiter, (req, res) => {
  const videoId = req.params.id;

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: "Invalid video id format." });
  }

  const cached = streamCache.get(videoId);
  const now = Date.now();
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return res.redirect(302, cached.url);
  }

  const isWindows = process.platform === "win32";
  const ytDlpFileName = isWindows ? "yt-dlp.exe" : "yt-dlp";
  const ytDlpPath = path.join(process.cwd(), "bin", ytDlpFileName);

  if (!fs.existsSync(ytDlpPath)) {
    logger.error("Critical error: yt-dlp binary not found at " + ytDlpPath);
    return res.status(500).json({ error: "Server configuration error: yt-dlp is not installed." });
  }

  const videoUrl = "https://www.youtube.com/watch?v=" + videoId;

  execFile(ytDlpPath, ["-g", "--no-warnings", videoUrl], { timeout: 15000 }, (error, stdout, stderr) => {
    if (error) {
      logger.error({ err: error, videoId }, "yt-dlp stream execution error");
      return res.status(500).json({ error: "Failed to extract stream URL via yt-dlp: " + error.message });
    }

    const urls = stdout.trim().split("\n");
    const streamUrl = urls[0];

    if (!streamUrl) {
      return res.status(500).json({ error: "No stream URL returned from yt-dlp." });
    }

    streamCache.set(videoId, { url: streamUrl, timestamp: Date.now() });

    return res.redirect(302, streamUrl);
  });
});

export default router;
