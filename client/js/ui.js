export class UIManager {
    constructor() {
        this.scoreboardVisible = false;
        this.initElements();
    }

    initElements() {
        this.healthFill = document.getElementById('healthFill');
        this.ammoDisplay = document.getElementById('ammo');
        this.playerList = document.getElementById('playerList');
        this.scoreboard = document.getElementById('scoreboard');
        this.scoreboardBody = document.getElementById('scoreboardBody');
        this.mainMenu = document.getElementById('mainMenu');
    }

    updateHealthBar(health) {
        if (!this.healthFill) return;
        
        this.healthFill.style.width = `${Math.max(0, health)}%`;
        
        if (health <= 25) {
            this.healthFill.style.background = '#ff0000';
        } else if (health <= 50) {
            this.healthFill.style.background = '#ff8800';
        } else {
            this.healthFill.style.background = '#00ff00';
        }
    }

    updateAmmo(current, max) {
        if (!this.ammoDisplay) return;
        
        if (max === Infinity || max === -1) {
            this.ammoDisplay.textContent = '∞';
        } else {
            this.ammoDisplay.textContent = `${current}/${max}`;
        }
    }

    updatePlayerList(players, myId) {
        if (!this.playerList) return;
        
        const playerCount = Object.keys(players).length;
        let html = `<div><strong>Players: ${playerCount}</strong></div>`;
        
        Object.values(players).forEach(player => {
            const isMe = player.id === myId ? ' (You)' : '';
            const healthBar = this.createMiniHealthBar(player.health || 100);
            html += `
                <div style="margin: 2px 0;">
                    ${player.name}${isMe}
                    ${healthBar}
                </div>
            `;
        });
        
        this.playerList.innerHTML = html;
    }

    createMiniHealthBar(health) {
        const width = Math.max(0, health);
        const color = health > 50 ? '#00ff00' : health > 25 ? '#ff8800' : '#ff0000';
        
        return `
            <div style="
                width: 50px; 
                height: 4px; 
                background: rgba(255,255,255,0.3); 
                display: inline-block; 
                margin-left: 5px;
                vertical-align: middle;
            ">
                <div style="
                    width: ${width}%; 
                    height: 100%; 
                    background: ${color};
                "></div>
            </div>
        `;
    }

    showScoreboard() {
        if (!this.scoreboard) return;
        this.scoreboard.style.display = 'block';
        this.scoreboardVisible = true;
    }

    hideScoreboard() {
        if (!this.scoreboard) return;
        this.scoreboard.style.display = 'none';
        this.scoreboardVisible = false;
    }

    toggleScoreboard() {
        if (this.scoreboardVisible) {
            this.hideScoreboard();
        } else {
            this.showScoreboard();
        }
    }

    updateScoreboard(players, myId) {
        if (!this.scoreboardBody || !this.scoreboardVisible) return;
        
        // Sort players by kills (descending), then by deaths (ascending)
        const sortedPlayers = Object.values(players).sort((a, b) => {
            if (b.kills !== a.kills) {
                return b.kills - a.kills;
            }
            return a.deaths - b.deaths;
        });
        
        this.scoreboardBody.innerHTML = '';
        
        sortedPlayers.forEach((player, index) => {
            const row = document.createElement('tr');
            const kd = player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toString();
            
            row.innerHTML = `
                <td>${index + 1}. ${player.name}${player.id === myId ? ' (You)' : ''}</td>
                <td>${player.kills || 0}</td>
                <td>${player.deaths || 0}</td>
                <td>${kd}</td>
            `;
            
            if (player.id === myId) {
                row.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
            }
            
            this.scoreboardBody.appendChild(row);
        });
    }

    showMainMenu() {
        if (!this.mainMenu) return;
        this.mainMenu.style.display = 'block';
    }

    hideMainMenu() {
        if (!this.mainMenu) return;
        this.mainMenu.style.display = 'none';
    }

    getServerUrl() {
        const input = document.getElementById('serverUrl');
        return input ? input.value : 'ws://localhost:8080';
    }

    getPlayerName() {
        const input = document.getElementById('playerName');
        return input ? input.value : 'Player';
    }

    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4444ff'};
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            font-weight: bold;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, duration);
    }

    showConnectionStatus(status) {
        const statusEl = document.getElementById('connectionStatus') || this.createConnectionStatus();
        
        statusEl.textContent = status;
        statusEl.className = `connection-status ${status.toLowerCase().replace(' ', '-')}`;
        
        if (status === 'Connected') {
            statusEl.style.color = '#00ff00';
        } else if (status === 'Connecting...') {
            statusEl.style.color = '#ffff00';
        } else {
            statusEl.style.color = '#ff0000';
        }
    }

    createConnectionStatus() {
        const statusEl = document.createElement('div');
        statusEl.id = 'connectionStatus';
        statusEl.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            color: #fff;
            font-weight: bold;
            z-index: 200;
            background: rgba(0,0,0,0.5);
            padding: 5px 10px;
            border-radius: 3px;
        `;
        
        document.body.appendChild(statusEl);
        return statusEl;
    }

    showPing(ping) {
        const pingEl = document.getElementById('pingDisplay') || this.createPingDisplay();
        pingEl.textContent = `Ping: ${ping}ms`;
        
        if (ping < 50) {
            pingEl.style.color = '#00ff00';
        } else if (ping < 100) {
            pingEl.style.color = '#ffff00';
        } else {
            pingEl.style.color = '#ff0000';
        }
    }

    createPingDisplay() {
        const pingEl = document.createElement('div');
        pingEl.id = 'pingDisplay';
        pingEl.style.cssText = `
            position: absolute;
            bottom: 60px;
            right: 20px;
            color: #fff;
            font-size: 12px;
            background: rgba(0,0,0,0.5);
            padding: 2px 5px;
            border-radius: 3px;
        `;
        
        document.body.appendChild(pingEl);
        return pingEl;
    }
}
