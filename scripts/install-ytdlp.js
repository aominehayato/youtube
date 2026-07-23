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

// 50MBを超える不正な肥大化やDoSを防ぐための最大ダウンロードサイズ制限
const MAX_FILE_SIZE = 50 * 1024 * 1024;

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
    // 300番台のリダイレクトを安全に追跡
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      console.log("Following redirect to: " + response.headers.location);
      downloadFile(response.headers.location);
      return;
    }

    if (response.statusCode !== 200) {
      console.error("Failed to download yt-dlp. Status code: " + response.statusCode);
      return;
    }

    let downloadedBytes = 0;
    const file = fs.createWriteStream(filePath);

    response.on("data", (chunk) => {
      downloadedBytes += chunk.length;
      if (downloadedBytes > MAX_FILE_SIZE) {
        response.destroy();
        file.close();
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        console.error("Download aborted: File size exceeded the 50MB safety limit.");
      }
    });

    response.pipe(file);

    file.on("finish", () => {
      file.close();
      if (downloadedBytes <= MAX_FILE_SIZE) {
        finalizeInstallation();
      }
    });

    file.on("error", (err) => {
      console.error("File stream error during yt-dlp download:", err);
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
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
