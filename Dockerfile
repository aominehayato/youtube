FROM node:20-slim

# アプリケーション用 non-root グループおよびユーザーを先に作成
RUN groupadd -r siatube && useradd -r -g siatube siatube

WORKDIR /app

# 依存関係定義ファイルおよびロックファイルをコピー
COPY package*.json ./

# npmキャッシュディレクトリを /tmp に設定して権限問題を完全に回避
ENV npm_config_cache=/tmp/.npm

# 本番用依存関係を厳格にインストール（npm ci を利用）
RUN npm ci --omit=dev

# アプリケーションソースコードをコピー
COPY server.js .
COPY routes ./routes
COPY utils ./utils

# yt-dlpの特定バージョンを指定し、curlを用いて安全にダウンロード・権限付与後、ビルド用パッケージを削除してイメージを軽量化
ARG YTDLP_VERSION=2026.07.21
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && mkdir -p /app/bin \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp_linux -o /app/bin/yt-dlp \
    && chmod +x /app/bin/yt-dlp \
    && /app/bin/yt-dlp --version \
    && apt-get remove -y curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# アプリケーションディレクトリの所有権を non-root ユーザーに変更
RUN chown -R siatube:siatube /app

# non-root ユーザーに切り替え
USER siatube

EXPOSE 3000

CMD ["npm", "start"]
