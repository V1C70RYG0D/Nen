const { EventEmitter } = require('events');

// Singleton event bus for intra-process notifications
class RoomEventBus extends EventEmitter {}
const bus = new RoomEventBus();

module.exports = bus;
