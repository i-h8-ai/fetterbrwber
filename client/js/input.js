export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.pointerLocked = false;
        this.callbacks = {};
        
        this.initEventListeners();
    }

    initEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.trigger('keydown', e);
            
            // Prevent default for game keys
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'Tab'].includes(e.code)) {
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.trigger('keyup', e);
        });

        // Mouse events
        this.canvas.addEventListener('click', () => {
            if (!this.pointerLocked) {
                this.canvas.requestPointerLock();
            }
            this.trigger('click');
        });

        document.addEventListener('pointerlockchange', () => {
            this.pointerLocked = document.pointerLockElement === this.canvas;
            this.trigger('pointerlockchange', this.pointerLocked);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.pointerLocked) {
                this.mouseX += e.movementX * 0.002;
                this.mouseY -= e.movementY * 0.002;
                this.mouseY = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.mouseY));
                
                this.trigger('mousemove', {
                    mouseX: this.mouseX,
                    mouseY: this.mouseY,
                    movementX: e.movementX,
                    movementY: e.movementY
                });
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (this.pointerLocked && e.button === 0) {
                this.trigger('mousedown', e);
            }
        });

        document.addEventListener('mouseup', (e) => {
            this.trigger('mouseup', e);
        });

        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
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
            this.callbacks[event].forEach(callback => callback(data));
        }
    }

    isKeyPressed(key) {
        return !!this.keys[key];
    }

    getMouseRotation() {
        return { x: this.mouseY, y: this.mouseX };
    }

    reset() {
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
    }
}
