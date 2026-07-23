import express from "express";
import { execFile } from "child_process";
import path from "path";

const router = express.Router();

/**
 * GET /api/stream/:id
 * yt-dlp を用いてYouTubeのストリーム情報をJSON形式で安全に取得する
 */
router.get("/:id", (req, res) => {
  const videoId = req.params.id;

  // 動画IDの形式検証（インジェクション対策）
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: "Invalid video id format." });
  }

  const ytDlpPath = path.join(process.cwd(), "bin", "yt-dlp");
  const videoUrl = "https://www.youtube.com/watch?v=" + videoId;

  // -j オプションを用いてJSONでメタデータおよび最適なプレイバックURLを取得
  execFile(ytDlpPath, ["-j", "--no-warnings", videoUrl], { timeout: 15000 }, (error, stdout, stderr) => {
    if (error) {
      console.error("yt-dlp stream execution error for ID " + videoId + ":", error);
      return res.status(500).json({ error: "Failed to extract stream info via yt-dlp: " + error.message });
    }

    try {
      const info = JSON.parse(stdout.trim());
      res.json({
        id: videoId,
        url: info.url || "",
        audioUrl: info.audio_url || null,
        width: info.width || null,
        height: info.height || null,
        fps: info.fps || null,
        ext: info.ext || "mp4"
      });
    } catch (parseError) {
      console.error("Failed to parse yt-dlp JSON output for ID " + videoId + ":", parseError);
      return res.status(500).json({ error: "Failed to parse stream metadata." });
    }
  });
});

export default router;
