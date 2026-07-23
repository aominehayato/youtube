FROM node:20

WORKDIR /app

# 依存関係定義ファイルを先にコピー
COPY package*.json ./

# scriptsフォルダをビルド前に確実に配置
COPY scripts ./scripts

# npm依存関係のインストール（yt-dlpのpostinstallスクリプト実行を排除し、Dockerレイヤーで堅牢にビルド）
RUN npm install --production

# アプリケーションソースコードを配置
COPY server.js .
COPY routes ./routes
COPY utils ./utils

# 実行ファイル格納ディレクトリを作成し、Linux用yt-dlpを安全にダウンロード・権限付与
RUN mkdir -p /app/bin \
    && apt-get update && apt-get install -y curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /app/bin/yt-dlp \
    && chmod +x /app/bin/yt-dlp \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 3000

CMD ["npm", "start"]
