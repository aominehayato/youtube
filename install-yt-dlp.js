import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 保存先の指定 (プロジェクトルート / bin / yt-dlp)
const binDir = path.join(__dirname, '../bin');
const targetPath = path.join(binDir, 'yt-dlp');

// bin ディレクトリが存在しない場合は作成
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

/**
 * リダイレクトを追跡しながらファイルをダウンロードする関数
 */
function downloadFile(url, dest, callback) {
  const file = fs.createWriteStream(dest);

  https.get(url, (response) => {
    // リダイレクト (301, 302 等) のハンドリング
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      file.close();
      fs.unlinkSync(dest); // 不完全なファイルを削除
      return downloadFile(response.headers.location, dest, callback);
    }

    if (response.statusCode !== 200) {
      file.close();
      fs.unlinkSync(dest);
      return callback(new Error(`Download failed with status code: ${response.statusCode}`));
    }

    response.pipe(file);

    file.on('finish', () => {
      file.close(() => {
        callback(null);
      });
    });
  }).on('error', (err) => {
    fs.unlink(dest, () => {});
    callback(err);
  });
}

console.log('Downloading latest yt-dlp binary...');

downloadFile(YTDLP_URL, targetPath, (err) => {
  if (err) {
    console.error('Failed to download yt-dlp:', err.message);
    process.exit(1);
  }

  // Linux/macOS 用に実行権限 (chmod +x) を付与
  try {
    fs.chmodSync(targetPath, 0o755);
    console.log(`yt-dlp downloaded successfully to: ${targetPath}`);
    console.log('Execution permissions granted (0755).');
  } catch (chmodErr) {
    console.error('Failed to set execution permissions:', chmodErr.message);
    process.exit(1);
  }
});
