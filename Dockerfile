FROM node:20-slim

WORKDIR /app

# セキュリティ強化のため専用の non-root ユーザー（siatube）を作成
RUN groupadd -r siatube && useradd -r -g siatube -m -d /app siatube

# 依存関係定義ファイルをコピー
COPY package*.json ./

# 本番用依存関係を厳格にインストール
RUN npm ci --omit=dev

# アプリケーションソースコードをコピー
COPY server.js .
COPY routes ./routes
COPY utils ./utils

# yt-dlpの特定バージョンを指定し、curlを用いて安全にダウンロード・権限付与
ARG YTDLP_VERSION=2026.07.21
RUN mkdir -p /app/bin \
    && apt-get update && apt-get install -y curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp_linux -O /app/bin/yt-dlp \
    && chmod +x /app/bin/yt-dlp \
    && /app/bin/yt-dlp --version \
    && rm -rf /var/lib/apt/lists/*

# アプリケーションディレクトリの所有権を non-root ユーザーに変更
RUN chown -R siatube:siatube /app

# non-root ユーザーに切り替え
USER siatube

EXPOSE 3000

CMD ["npm", "start"]
