FROM node:20-slim

WORKDIR /app

# カレントディレクトリからすべてのファイルをそのままコンテナにコピー
COPY . .

# コピーされたファイルとサイズをすべて強制表示してビルドを停止させる
RUN ls -la /app && exit 1
