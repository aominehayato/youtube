FROM node:20-slim

# Create a non-privileged user and group
RUN groupadd -r siatube && useradd -r -m -d /app -g siatube siatube

# Set working directory
WORKDIR /app

# Install system dependencies (Python3, ca-certificates, curl, and Node.js for yt-dlp JS runtime)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 ca-certificates curl nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY server.js .
COPY routes ./routes
COPY utils ./utils
COPY scripts ./scripts

# Create bin directory and download the latest stable yt-dlp binary
RUN mkdir -p /app/bin \
    && curl -fL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /app/bin/yt-dlp \
    && chmod +x /app/bin/yt-dlp

# Change ownership of the app directory to the non-privileged user
RUN chown -R siatube:siatube /app

# Switch to non-privileged user
USER siatube

EXPOSE 3000

CMD ["node", "server.js"]
