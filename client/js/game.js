import { Renderer } from './renderer.js';
import { InputManager } from './input.js';
import { NetworkManager } from './network.js';
import { EffectsManager } from './effects.js';
import { UIManager } from './ui.js';
import { Player } from './player.js';
import { Mat4, Vector3 } from './math.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.input = new InputManager(this.canvas);
        this.network = new NetworkManager();
        this.effects = new EffectsManager();
        this.ui = new UIManager();
        
        this.players = {};
        this.myPlayer = null;
        this.myId = null;
        this.isOnline = false;
        this.running = false;
        this.lastTime = 0;
        this.lastNetworkUpdate = 0;
        this.networkUpdateRate = 50; // 20fps network updates
        
        this.initEventListeners();
        this.createLocalPlayer();
    }

    initEventListeners() {
        // Input events
        this.input.on('click', () => this.handleShoot());
        this.input.on('keydown', (e) => this.handleKeyDown(e));
        this.input.on('keyup', (e) => this.handleKeyUp(e));
        
        // Network events
        this.network.on('connected', () => this.onConnected());
        this.network.on('disconnected', () => this.onDisconnected());
        this.network.on('message:player_joined', (data) => this.onPlayerJoined(data));
        this.network.on('message:player_left', (data) => this.onPlayerLeft(data));
        this.network.on('message:player_update', (data) => this.onPlayerUpdate(data));
        this.network.on('message:player_shot', (data) => this.onPlayerShot(data));
        this.network.on('message:player_hit', (data) => this.onPlayerHit(data));
        this.network.on('message:player_died', (data) => this.onPlayerDied(data));
        this.network.on('message:player_respawned', (data) => this.onPlayerRespawned(data));
        this.network.on('message:game_state', (data) => this.onGameState(data));
        this.network.on('message:game_tick', (data) => this.onGameTick(data));
    }

    createLocalPlayer() {
        this.myId = 'local_player';
        this.myPlayer = new Player(this.myId, 'LocalPlayer');
        this.players[this.myId] = this.myPlayer;
    }

    async joinServer() {
        const serverUrl = this.ui.getServerUrl();
        const playerName = this.ui.getPlayerName();
        
        try {
            this.ui.showConnectionStatus('Connecting...');
            await this.network.connect(serverUrl, playerName);
            this.isOnline = true;
            this.ui.hideMainMenu();
            this.start();
        } catch (error) {
            console.error('Failed to connect:', error);
            this.ui.showNotification('Failed to connect to server', 'error');
            this.ui.showConnectionStatus('Disconnected');
        }
    }

    startOffline() {
        this.isOnline = false;
        this.ui.hideMainMenu();
        this.ui.showNotification('Started offline mode', 'info');
        this.start();
    }

    start() {
        if (this.running) return;
        
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    stop() {
        this.running = false;
        if (this.isOnline) {
            this.network.disconnect();
        }
        this.ui.showMainMenu();
    }

    gameLoop() {
        if (!this.running) return;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        // Update local player
        if (this.myPlayer) {
            this.myPlayer.update(deltaTime, this.input);
            
            // Send network updates
            if (this.isOnline && this.network.isConnected()) {
                const now = Date.now();
                if (now - this.lastNetworkUpdate > this.networkUpdateRate) {
                    this.network.sendPlayerUpdate(
                        this.myPlayer.position.toArray(),
                        this.myPlayer.rotation.toArray(),
                        this.myPlayer.velocity.toArray(),
                        this.myPlayer.health
                    );
                    this.lastNetworkUpdate = now;
                }
            }
        }
        
        // Update other players (interpolation)
        Object.values(this.players).forEach(player => {
            if (player.id !== this.myId) {
                // Simple interpolation for smoother movement
                // In a real game, you'd use more sophisticated prediction
            }
        });
        
        // Update UI
        this.updateUI();
    }

    render() {
        this.renderer.startFrame();
        
        // Set up camera from player position and rotation
        const viewMatrix = this.createViewMatrix();
        
        // Draw ground
        const groundMatrix = new Mat4();
        groundMatrix.translate(0, -0.5, 0);
        groundMatrix.multiply(viewMatrix);
        this.renderer.drawGround(groundMatrix);
        
        // Draw other players
        Object.values(this.players).forEach(player => {
            if (player.id !== this.myId && player.isAlive) {
                const playerMatrix = new Mat4();
                playerMatrix.translate(player.position.x, player.position.y, player.position.z);
                playerMatrix.multiply(viewMatrix);
                
                // Color based on health
                const healthRatio = player.health / player.maxHealth;
                const color = [1, healthRatio, healthRatio]; // Red to white based on health
                
                this.renderer.drawCube(playerMatrix, color);
            }
        });
        
        // Draw some static objects for reference
        this.drawStaticObjects(viewMatrix);
    }

    createViewMatrix() {
        const viewMatrix = new Mat4();
        if (this.myPlayer) {
            viewMatrix.rotateX(this.myPlayer.rotation.x);
            viewMatrix.rotateY(-this.myPlayer.rotation.y);
            viewMatrix.translate(-this.myPlayer.position.x, -this.myPlayer.position.y, -this.myPlayer.position.z);
        }
        return viewMatrix;
    }

    drawStaticObjects(viewMatrix) {
        // Draw some reference cubes around the world
        for (let i = 0; i < 10; i++) {
            const objectMatrix = new Mat4();
            objectMatrix.translate(
                Math.sin(i * 2) * 10,
                2,
                Math.cos(i * 2) * 10
            );
            objectMatrix.multiply(viewMatrix);
            this.renderer.drawCube(objectMatrix, [0.8, 0.4, 0.2]);
        }
    }

    updateUI() {
        if (this.myPlayer) {
            this.ui.updateHealthBar(this.myPlayer.health);
            this.ui.updateAmmo(-1, -1); // Infinite ammo
        }
        
        this.ui.updatePlayerList(this.players, this.myId);
        
        if (this.ui.scoreboardVisible) {
            this.ui.updateScoreboard(this.players, this.myId);
        }
    }

    handleShoot() {
        if (!this.myPlayer || !this.myPlayer.canShoot()) return;
        
        if (this.myPlayer.shoot()) {
            this.effects.playShootSound();
            
            if (this.isOnline && this.network.isConnected()) {
                this.network.sendShoot(
                    this.myPlayer.position.toArray(),
                    this.myPlayer.rotation.toArray()
                );
            } else {
                // Offline mode - create simple hit detection
                this.handleOfflineShoot();
            }
        }
    }

    handleOfflineShoot() {
        // Simple raycast for offline mode
        const direction = this.myPlayer.getShootDirection();
        const startPos = this.myPlayer.position;
        
        // For demo purposes, just show effects
        this.effects.createMuzzleFlash(startPos.toArray(), this.myPlayer.rotation.toArray());
    }

    handleKeyDown(e) {
        if (e.code === 'Tab') {
            e.preventDefault();
            this.ui.showScoreboard();
        }
        
        if (e.code === 'Escape') {
            this.stop();
        }
    }

    handleKeyUp(e) {
        if (e.code === 'Tab') {
            this.ui.hideScoreboard();
        }
    }

    // Network event handlers
    onConnected() {
        this.ui.showConnectionStatus('Connected');
        this.ui.showNotification('Connected to server!', 'success');
    }

    onDisconnected() {
        this.ui.showConnectionStatus('Disconnected');
        this.ui.showNotification('Disconnected from server', 'error');
        
        // Clear other players
        Object.keys(this.players).forEach(id => {
            if (id !== this.myId) {
                delete this.players[id];
            }
        });
    }

    onPlayerJoined(data) {
        if (data.yourId) {
            // This is us
            this.myId = data.yourId;
            this.myPlayer.id = data.yourId;
            this.myPlayer.name = data.player.name;
            delete this.players['local_player'];
            this.players[this.myId] = this.myPlayer;
        } else if (data.player && data.player.id !== this.myId) {
            // Another player joined
            const player = new Player(data.player.id, data.player.name);
            player.deserialize(data.player);
            this.players[data.player.id] = player;
            
            this.ui.showNotification(`${data.player.name} joined the game`, 'info');
        }
    }

    onPlayerLeft(data) {
        const player = this.players[data.playerId];
        if (player) {
            this.ui.showNotification(`${player.name} left the game`, 'info');
            delete this.players[data.playerId];
        }
    }

    onPlayerUpdate(data) {
        const player = this.players[data.player.id];
        if (player && data.player.id !== this.myId) {
            player.deserialize(data.player);
        }
    }

    onPlayerShot(data) {
        this.effects.createMuzzleFlash(data.position, data.rotation);
        this.effects.playShootSound();
    }

    onPlayerHit(data) {
        if (data.playerId === this.myId) {
            // We got hit
            this.myPlayer.takeDamage(data.damage);
            this.effects.showDamageEffect(data.headshot);
            
            if (this.myPlayer.health <= 0) {
                this.effects.showDeathScreen();
                
                setTimeout(() => {
                    this.myPlayer.respawn();
                    this.effects.hideDeathScreen();
                    
                    if (this.network.isConnected()) {
                        this.network.sendRespawn(this.myPlayer.position.toArray());
                    }
                }, 3000);
            }
        } else {
            // Someone else got hit
            this.effects.createHitMarker(data.position, data.headshot);
            
            if (data.shooterId === this.myId) {
                // We hit someone
                this.effects.playHitSound();
            }
        }
    }

    onPlayerDied(data) {
        const victim = this.players[data.playerId];
        const killer = this.players[data.killerId];
        
        if (victim) {
            victim.die();
        }
        
        if (killer && victim) {
            killer.addKill();
            this.effects.addKillFeedItem(killer.name, victim.name);
        }
    }

    onPlayerRespawned(data) {
        const player = this.players[data.playerId];
        if (player) {
            player.respawn(data.position);
        }
    }

    onGameState(data) {
        // Initial game state
        this.players = {};
        
        if (data.players) {
            Object.entries(data.players).forEach(([id, playerData]) => {
                if (id === this.myId) {
                    this.myPlayer.deserialize(playerData);
                    this.players[id] = this.myPlayer;
                } else {
                    const player = new Player(id, playerData.name);
                    player.deserialize(playerData);
                    this.players[id] = player;
                }
            });
        }
    }

    onGameTick(data) {
        // Server authoritative updates
        if (data.players) {
            Object.entries(data.players).forEach(([id, playerData]) => {
                const player = this.players[id];
                if (player && id !== this.myId) {
                    // Update other players with server data
                    player.interpolateTowards(playerData, 0.3);
                }
            });
        }
    }
}
