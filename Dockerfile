FROM python:3.11-slim

WORKDIR /app

# Node.js と ffmpeg をインストールして JavaScript 解読環境をセットアップ
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY cookies.txt .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
