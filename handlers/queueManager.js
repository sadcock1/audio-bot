const queues = new Map();

function getQueue(guildId) {
  return queues.get(guildId) ?? null;
}

function createQueue(guildId, { player, connection }) {
  const queue = {
    tracks: [],
    currentIndex: 0,
    player,
    connection,
    controlMessage: null,
    paused: false,
    currentResource: null,
    trackStartedAt: null,
    seekOffset: 0,
  };
  queues.set(guildId, queue);
  return queue;
}

function deleteQueue(guildId) {
  queues.delete(guildId);
}

function getAllQueues() {
  return queues;
}

module.exports = { getQueue, createQueue, deleteQueue, getAllQueues };
