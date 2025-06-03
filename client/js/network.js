export class NetworkManager {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.callbacks = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
    }

    connect(url, playerName) {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(url);
                
                this.ws.onopen = () => {
                    console.log('Connected to server');
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    
                    // Send join message
                    this.send({
                        type: 'join',
                        name: playerName
                    });
                    
                    this.trigger('connected');
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.trigger('message', data);
                        this.trigger(`message:${data.type}`, data);
                    } catch (e) {
                        console.error('Error parsing message:', e);
                    }
                };
                
                this.ws.onclose = () => {
                    console.log('Disconnected from server');
                    this.connected = false;
                    this.trigger('disconnected');
                    
                    // Attempt to reconnect
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        setTimeout(() => {
                            this.reconnectAttempts++;
                            console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                            this.connect(url, playerName);
                        }, this.reconnectDelay * this.reconnectAttempts);
                    }
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.connected = false;
                    this.trigger('error', error);
                    reject(error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }

    send(message) {
        if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(message));
                return true;
            } catch (e) {
                console.error('Error sending message:', e);
                return false;
            }
        }
        return false;
    }

    sendPlayerUpdate(position, rotation, velocity, health) {
        return this.send({
            type: 'update',
            position: position,
            rotation: rotation,
            velocity: velocity,
            health: health,
            timestamp: Date.now()
        });
    }

    sendShoot(position, rotation) {
        return this.send({
            type: 'shoot',
            position: position,
            rotation: rotation,
            timestamp: Date.now()
        });
    }

    sendRespawn(position) {
        return this.send({
            type: 'respawn',
            position: position,
            timestamp: Date.now()
        });
    }

    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    off(event, callback) {
        if (this.callbacks[event]) {
            const index = this.callbacks[event].indexOf(callback);
            if (index > -1) {
                this.callbacks[event].splice(index, 1);
            }
        }
    }

    trigger(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error('Error in network callback:', e);
                }
            });
        }
    }

    isConnected() {
        return this.connected;
    }
}
