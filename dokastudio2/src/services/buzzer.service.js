// src/services/buzzer.service.js

const { bridgeClient } = require('./bridge-client.service');

class BuzzerService {
  constructor() {
    this.io = null;
    this.state = {
      online: false,
      wsConnected: false,
      status: null,
      devices: [],
      lastEvent: null,
      lastError: null,
    };
    this.assignments = new Map();
    this.teamRoster = {
      pinCode: null,
      teams: [],
      byId: new Map(),
    };
    this.runtime = {
      mode: 'IDLE',
      modeSource: 'manual',
      pinCode: null,
      questionId: null,
      isLocked: false,
      firstPress: null,
      pressedQueue: [],
      answeredTeams: [],
    };
    this.started = false;
  }

  setIo(io) {
    this.io = io;
    this.ensureStarted();
  }

  ensureStarted() {
    if (this.started) return;
    this.started = true;
    bridgeClient.start();
    bridgeClient.on('status', (snapshot) => {
      this.state = { ...this.state, ...snapshot };
      this.emitStatus();
    });

    bridgeClient.on('devices', (payload) => {
      this.state.devices = payload.devices || [];
      this.emitDevices();
    });

    bridgeClient.on('pressed', (event) => {
      this.state.lastEvent = event;
      this.handlePressed(event);
    });
  }

  getSnapshot() {
    return {
      online: this.state.online,
      wsConnected: this.state.wsConnected,
      status: this.state.status,
      devices: this.state.devices,
      lastEvent: this.state.lastEvent,
      lastError: this.state.lastError,
      assignments: this.getAssignments(),
      runtime: this.getRuntime(),
    };
  }

  getAssignments() {
    return Array.from(this.assignments.values());
  }

  setTeamsForSession(pinCode, teams = []) {
    this.teamRoster = {
      pinCode: pinCode || null,
      teams: teams || [],
      byId: new Map((teams || []).map((team) => [team.id, team])),
    };
    this.syncAssignmentsWithTeams();
  }

  getTeamById(teamId) {
    if (!teamId) return null;
    return this.teamRoster.byId.get(teamId) || null;
  }

  syncAssignmentsWithTeams() {
    for (const [key, assignment] of this.assignments.entries()) {
      const team = this.getTeamById(assignment.teamId);
      this.assignments.set(key, {
        ...assignment,
        teamName: team?.name || assignment.teamName || null,
        teamColor: team?.color || assignment.teamColor || null,
      });
    }
    this.emitAssignments();
  }

  upsertAssignment(payload) {
    const receiverId = String(payload.receiverId || '').trim();
    const keyPad = payload.keyPad !== undefined && payload.keyPad !== null
      ? Number(payload.keyPad)
      : null;
    const buttonId = String(payload.buttonId || '').trim();
    const teamId = payload.teamId ? String(payload.teamId).trim() : null;
    const label = payload.label ? String(payload.label).trim() : null;
    const teamName = payload.teamName ? String(payload.teamName).trim() : null;
    const teamColor = payload.teamColor ? String(payload.teamColor).trim() : null;

    if (!receiverId || keyPad === null || Number.isNaN(keyPad)) {
      throw new Error('receiverId и keyPad обязательны');
    }

    const rosterTeam = this.getTeamById(teamId);
    const key = `${receiverId}:${keyPad}`;
    const assignment = {
      receiverId,
      keyPad,
      buttonId,
      teamId: teamId || null,
      label: label || rosterTeam?.name || teamName || null,
      teamName: rosterTeam?.name || teamName || null,
      teamColor: rosterTeam?.color || teamColor || null,
    };

    this.assignments.set(key, assignment);
    this.emitAssignments();
    this.emitAssignmentUpdated(assignment);
    return assignment;
  }

  setMode(mode, options = {}) {
    const normalized = String(mode || 'IDLE').toUpperCase();
    if (!['IDLE', 'FASTEST_FINGER', 'EVERYONE_ANSWERS'].includes(normalized)) {
      throw new Error('Недоступный режим');
    }
    const source = options.source || 'manual';
    const shouldReset = options.reset !== false;

    if (shouldReset) {
      this.resetRuntimeState({ emit: false });
    }

    this.runtime.mode = normalized;
    this.runtime.modeSource = source;

    if (options.pinCode !== undefined) {
      this.runtime.pinCode = options.pinCode || null;
    }

    if (options.questionId !== undefined) {
      this.runtime.questionId = options.questionId || null;
    }

    if (normalized === 'IDLE' && source !== 'manual') {
      this.runtime.questionId = options.questionId ?? null;
    }

    if (normalized === 'IDLE') {
      this.runtime.pinCode = options.pinCode ?? this.runtime.pinCode;
    }

    this.emitLock();
    this.emitMode();
    return this.getRuntime();
  }

  resetLockState() {
    this.resetRuntimeState();
  }

  resetRuntimeState({ emit = true } = {}) {
    this.runtime.isLocked = false;
    this.runtime.firstPress = null;
    this.runtime.pressedQueue = [];
    this.runtime.answeredTeams = [];
    if (emit) {
      this.emitLock();
      this.emitMode();
    }
  }

  applyQuestionMode({ pinCode, questionId, mode }) {
    return this.setMode(mode, {
      source: 'question',
      pinCode,
      questionId,
      reset: true,
    });
  }

  getRuntime() {
    return {
      mode: this.runtime.mode,
      modeSource: this.runtime.modeSource,
      pinCode: this.runtime.pinCode,
      questionId: this.runtime.questionId,
      isLocked: this.runtime.isLocked,
      firstPress: this.runtime.firstPress,
      pressedQueue: [...this.runtime.pressedQueue],
      answeredTeams: [...this.runtime.answeredTeams],
    };
  }

  async fetchStatus() {
    const status = await bridgeClient.fetchStatus();
    this.state.status = status;
    this.state.online = true;
    this.emitStatus();
    return status;
  }

  async fetchDevices() {
    const devices = await bridgeClient.fetchDevices();
    this.state.devices = devices;
    this.emitDevices();
    return devices;
  }

  async testStart() {
    const payload = await bridgeClient.testStart();
    await this.fetchStatus().catch(() => null);
    return payload;
  }

  async testStop() {
    const payload = await bridgeClient.testStop();
    await this.fetchStatus().catch(() => null);
    return payload;
  }

  async testPress(body) {
    const payload = await bridgeClient.testPress(body);
    this.emitTestEvent(payload);
    return payload;
  }

  async reset(body) {
    const payload = await bridgeClient.reset(body);
    await this.fetchStatus().catch(() => null);
    this.emitReset(payload);
    return payload;
  }

  handlePressed(event) {
    const assignment = this.assignments.get(`${event.receiverId}:${event.keyPad}`) || null;
    const team = this.getTeamById(assignment?.teamId);
    const enriched = {
      ...event,
      assignment,
      teamId: assignment?.teamId || null,
      teamName: assignment?.teamName || team?.name || null,
      teamColor: assignment?.teamColor || team?.color || null,
      label: assignment?.label || team?.name || assignment?.teamName || null,
    };

    this.emitPressed(enriched);

    if (this.runtime.mode === 'FASTEST_FINGER') {
      if (!this.runtime.isLocked && assignment?.teamId) {
        this.runtime.firstPress = enriched;
        this.runtime.isLocked = true;
        this.runtime.pressedQueue.push({ ...enriched, ignored: false });
        this.emitFirstPress(enriched);
        this.emitLock();
        this.emitMode();
      } else {
        this.runtime.pressedQueue.push({ ...enriched, ignored: true });
        this.emitMode();
      }
    } else if (this.runtime.mode === 'EVERYONE_ANSWERS') {
      this.runtime.pressedQueue.push({ ...enriched, ignored: false });
      if (assignment?.teamId) {
        const exists = this.runtime.answeredTeams.find(
          (item) => item.teamId === assignment.teamId
        );
        if (!exists) {
          this.runtime.answeredTeams.push({
            teamId: assignment.teamId,
            teamName: assignment.teamName || team?.name || assignment.teamId,
            teamColor: assignment.teamColor || team?.color || null,
            label: assignment.label || assignment.teamName || team?.name || assignment.teamId,
            receiverId: assignment.receiverId,
            keyPad: assignment.keyPad,
            buttonId: assignment.buttonId,
            pressedAt: enriched.pressedAt,
          });
        }
      }
      this.emitMode();
    }
  }

  emitStatus() {
    if (!this.io) return;
    this.io.emit('buzzer:status', this.getSnapshot());
  }

  emitDevices() {
    if (!this.io) return;
    this.io.emit('buzzer:devices', { devices: this.state.devices });
  }

  emitPressed(event) {
    if (!this.io) return;
    this.io.emit('buzzer:pressed', event);
  }

  emitAssignments() {
    if (!this.io) return;
    this.io.emit('buzzer:assignments', { assignments: this.getAssignments() });
  }

  emitAssignmentUpdated(assignment) {
    if (!this.io) return;
    this.io.emit('buzzer:assignment-updated', assignment);
  }

  emitMode() {
    if (!this.io) return;
    this.io.emit('buzzer:mode', this.getRuntime());
  }

  emitLock() {
    if (!this.io) return;
    this.io.emit('buzzer:lock', {
      isLocked: this.runtime.isLocked,
      firstPress: this.runtime.firstPress,
    });
  }

  emitFirstPress(payload) {
    if (!this.io) return;
    this.io.emit('buzzer:first-press', payload);
  }

  emitTestEvent(payload) {
    if (!this.io) return;
    this.io.emit('buzzer:test-event', payload);
  }

  emitReset(payload) {
    if (!this.io) return;
    this.io.emit('buzzer:reset', payload);
  }
}

const buzzerService = new BuzzerService();

module.exports = { buzzerService };