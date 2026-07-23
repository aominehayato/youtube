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

  const file = fs.createWriteStream(filePath);
  https.get(url, (response) => {
    if (response.statusCode === 301 || response.statusCode === 302) {
      // リダイレクトに対応
      https.get(response.headers.location, (redirectedRes) => {
        redirectedRes.pipe(file);
        file.on("finish", () => {
          file.close();
          finalizeInstallation();
        });
      }).on("error", (err) => {
        console.error("Failed to download yt-dlp on redirect:", err);
      });
      return;
    }

    response.pipe(file);
    file.on("finish", () => {
      file.close();
      finalizeInstallation();
    });
  }).on("error", (err) => {
    console.error("Failed to download yt-dlp:", err);
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
