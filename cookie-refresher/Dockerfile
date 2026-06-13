FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    xvfb \
    x11vnc \
    novnc \
    cron \
    && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app
COPY package.json ./
RUN npm install
COPY refresh.js entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 6080
CMD ["./entrypoint.sh"]
