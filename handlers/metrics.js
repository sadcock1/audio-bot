const http = require('http');
const { Registry, Counter, Gauge, collectDefaultMetrics } = require('prom-client');

const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'discord_bot_' });

const tracksPlayed = new Counter({
  name: 'discord_bot_tracks_played_total',
  help: 'Total number of tracks played',
  labelNames: ['guild_id'],
  registers: [registry],
});

// Populated lazily at scrape time via collect()
const activeGuildsGauge = new Gauge({
  name: 'discord_bot_active_guilds',
  help: 'Number of guilds with an active queue',
  registers: [registry],
});

const queueSizeGauge = new Gauge({
  name: 'discord_bot_queue_size',
  help: 'Remaining tracks in queue per guild',
  labelNames: ['guild_id'],
  registers: [registry],
});

// Called just before each scrape so values are always current
function refreshGauges() {
  const { getAllQueues } = require('./queueManager');
  const queues = getAllQueues();

  activeGuildsGauge.set(queues.size);

  queueSizeGauge.reset();
  for (const [guildId, queue] of queues) {
    const remaining = Math.max(0, queue.tracks.length - queue.currentIndex);
    queueSizeGauge.set({ guild_id: guildId }, remaining);
  }
}

function startMetricsServer(port = 9090) {
  const server = http.createServer(async (req, res) => {
    if (req.url !== '/metrics') {
      res.writeHead(404);
      return res.end();
    }
    refreshGauges();
    res.setHeader('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });

  server.listen(port, () => console.log(`Metrics listening on :${port}/metrics`));
}

module.exports = { startMetricsServer, tracksPlayed };
