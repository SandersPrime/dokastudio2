(function () {
    const LiveHostState = {
        session: null,
        socket: null,
        players: [],
        leaderboard: [],
        setSession(session) { this.session = session || null; },
        setSocket(socket) { this.socket = socket || null; },
        setPlayers(players) { this.players = Array.isArray(players) ? players : []; },
        setLeaderboard(leaderboard) { this.leaderboard = Array.isArray(leaderboard) ? leaderboard : []; },
    };
    window.LiveHostState = window.LiveHostState || LiveHostState;
})();
