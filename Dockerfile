FROM docker.io/library/node:20-slim

# アプリケーション実行用ユーザーの作成
RUN groupadd -r siatube && useradd -r -m -d /app -g siatube siatube

WORKDIR /app

# 依存関係定義ファイルのコピー
COPY package*.json ./

# 本番用パッケージのインストール
RUN npm ci --omit=dev

# アプリケーションソースコードのコピー
COPY server.js .
COPY routes ./routes
COPY utils ./utils
COPY scripts ./scripts

# Node.jsパスの確認と、ffmpegを含むシステム依存関係のインストール、yt-dlpバイナリの配置
RUN which node \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
       python3 \
       ca-certificates \
       curl \
       ffmpeg \
    && mkdir -p /app/bin \
    && curl -fL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /app/bin/yt-dlp \
    && chmod +x /app/bin/yt-dlp

# アプリケーションディレクトリの所有権を専用ユーザーに変更
RUN chown -R siatube:siatube /app

USER siatube

EXPOSE 3000

CMD ["node", "server.js"]
