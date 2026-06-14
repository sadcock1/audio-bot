FROM node:20-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    make \
    g++ \
    curl \
    unzip \
    && python3 -m venv /opt/ytdlp \
    && /opt/ytdlp/bin/pip install yt-dlp \
    && ln -sf /opt/ytdlp/bin/yt-dlp /usr/local/bin/yt-dlp \
    && curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "index.js"]
