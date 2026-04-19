(function () {
    const LivePlayerState = {
        socket: null,
        pinCode: null,
        player: null,
        score: 0,
        setSocket(socket) { this.socket = socket || null; },
        setPinCode(pinCode) { this.pinCode = pinCode || null; },
        setPlayer(player) { this.player = player || null; },
        setScore(score) { this.score = Number(score || 0); },
    };
    window.LivePlayerState = window.LivePlayerState || LivePlayerState;
})();
