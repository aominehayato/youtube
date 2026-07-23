FROM node:20-slim

# アプリケーション用 non-root グループおよびホームディレクトリ付き専用ユーザーを作成
RUN groupadd -r siatube && useradd -r -m -d /app -g siatube siatube

WORKDIR /app

# 依存関係定義ファイルおよび完全なロックファイルをコピー
COPY package*.json ./

# npmキャッシュディレクトリを /tmp に設定して権限問題を完全に回避
ENV npm_config_cache=/tmp/.npm

# 本番用依存関係を厳格にインストール（package-lock.jsonを利用した安全な npm ci）
RUN npm ci --omit=dev

# アプリケーションソースコードをコピー
COPY server.js .
COPY routes ./routes
COPY utils ./utils

# yt-dlpの動作に必要な python3, ca-certificates, curl をインストールし、最新の yt-dlp を安全に取得
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 ca-certificates curl \
    && mkdir -p /app/bin \
    && curl -fL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /app/bin/yt-dlp \
    && chmod 755 /app/bin/yt-dlp \
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
