(function () {
    function renderLeaderboard(players = []) {
        const escape = window.DomUtils?.escapeHtml || ((value) => String(value ?? ''));
        return players.map((player, index) => `
            <div class="leaderboard-item top-${index + 1}">
                <span class="leaderboard-rank">#${index + 1}</span>
                <span class="leaderboard-name">${escape(player.nickname || player.name || 'Игрок')}</span>
                <span class="leaderboard-score">${Number(player.score || 0)}</span>
            </div>`).join('');
    }
    window.LeaderboardComponent = window.LeaderboardComponent || { render: renderLeaderboard };
})();
