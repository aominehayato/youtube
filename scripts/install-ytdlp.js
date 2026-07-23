import fs from "fs";
import https from "https";
import { execSync } from "child_process";
import path from "path";

const binDir = path.join(process.cwd(), "bin");
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

const isWindows = process.platform === "win32";
const fileName = isWindows ? "yt-dlp.exe" : "yt-dlp";
const filePath = path.join(binDir, fileName);

// すでに存在する場合は再ダウンロードをスキップ
if (fs.existsSync(filePath)) {
  console.log("yt-dlp is already installed at " + filePath);
} else {
  const url = isWindows
    ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
    : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux";

  console.log("Downloading yt-dlp from " + url);
  downloadFile(url);
}

function downloadFile(targetUrl) {
  https.get(targetUrl, (response) => {
    // 300番台のリダイレクト（301, 302, 307, 308等）を安全に処理
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      console.log("Following redirect to: " + response.headers.location);
      downloadFile(response.headers.location);
      return;
    }

    if (response.statusCode !== 200) {
      console.error("Failed to download yt-dlp. Status code: " + response.statusCode);
      return;
    }

    const file = fs.createWriteStream(filePath);
    response.pipe(file);

    file.on("finish", () => {
      file.close();
      finalizeInstallation();
    });

    file.on("error", (err) => {
      console.error("File stream error during yt-dlp download:", err);
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // 途中失敗時の空ファイル残存を防ぐ
      }
    });
  }).on("error", (err) => {
    console.error("Failed to connect for yt-dlp download:", err);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
}

function finalizeInstallation() {
  if (!isWindows) {
    try {
      execSync("chmod +x " + filePath);
      console.log("Successfully made yt-dlp executable.");
    } catch (e) {
      console.error("Failed to set executable permission for yt-dlp:", e);
    }
  } else {
    console.log("yt-dlp installation completed for Windows.");
  }
}
