// src/sockets/buzzer.socket.js

const { buzzerService } = require('../services/buzzer.service');

function registerBuzzerSocket(io, socket) {
  socket.on('buzzer:subscribe', () => {
    const snapshot = buzzerService.getSnapshot();
    socket.emit('buzzer:status', snapshot);
    socket.emit('buzzer:devices', { devices: snapshot.devices || [] });
    socket.emit('buzzer:assignments', { assignments: snapshot.assignments || [] });
    socket.emit('buzzer:mode', snapshot.runtime || buzzerService.getRuntime());
    socket.emit('buzzer:lock', {
      isLocked: snapshot.runtime?.isLocked || false,
      firstPress: snapshot.runtime?.firstPress || null,
    });
  });
}

module.exports = { registerBuzzerSocket };