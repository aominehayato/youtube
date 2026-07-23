FROM node:20-slim

WORKDIR /app

# package-lock.json を含めて依存関係定義ファイルをコピー
COPY package*.json ./

# npm ci を用いて厳格かつ高速に本番用依存関係をインストール
RUN npm ci --omit=dev

# アプリケーションソースコードを配置
COPY server.js .
COPY routes ./routes
COPY utils ./utils

# yt-dlpの特定バージョンを指定し、curlを用いて安全にダウンロード・権限付与およびビルド時存在確認
ARG YTDLP_VERSION=2026.07.21
RUN mkdir -p /app/bin \
    && apt-get update && apt-get install -y curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp_linux -O /app/bin/yt-dlp \
    && chmod +x /app/bin/yt-dlp \
    && /app/bin/yt-dlp --version \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 3000

CMD ["npm", "start"]
