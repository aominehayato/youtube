FROM node:20

WORKDIR /app

# 依存関係定義ファイルを先にコピー
COPY package*.json ./

# npm依存関係のインストール（不要になったscriptsフォルダのコピーを排除）
RUN npm install --production

# アプリケーションソースコードを配置
COPY server.js .
COPY routes ./routes
COPY utils ./utils

# 実行ファイル格納ディレクトリを作成し、wgetを用いてLinux用yt-dlpを安全にダウンロード・権限付与およびビルド時存在確認
RUN mkdir -p /app/bin \
    && apt-get update && apt-get install -y wget \
    && wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -O /app/bin/yt-dlp \
    && chmod +x /app/bin/yt-dlp \
    && /app/bin/yt-dlp --version \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 3000

CMD ["npm", "start"]
