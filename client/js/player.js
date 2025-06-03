import { Vector3 } from './math.js';

export class Player {
    constructor(id, name = 'Player') {
        this.id = id;
        this.name = name;
        this.position = new Vector3(0, 1.8, 5);
        this.rotation = new Vector3(0, 0, 0); // pitch, yaw, roll
        this.velocity = new Vector3(0, 0, 0);
        this.health = 100;
        this.maxHealth = 100;
        this.kills = 0;
        this.deaths = 0;
        this.onGround = true;
        this.lastShot = 0;
        this.shootCooldown = 100; // milliseconds
        this.isAlive = true;
        
        // Physics constants
        this.speed = 10;
        this.jumpSpeed = 8;
        this.gravity = 25;
        this.groundHeight = 1.8;
        this.worldSize = 50;
    }

    update(dt, input) {
        if (!this.isAlive) return;

        this.handleMovement(dt, input);
        this.applyPhysics(dt);
        this.checkBounds();
    }

    handleMovement(dt, input) {
        const rotation = input.getMouseRotation();
        this.rotation.x = rotation.x;
        this.rotation.y = rotation.y;

        // Calculate movement direction
        const forward = new Vector3(
            Math.sin(this.rotation.y),
            0,
            -Math.cos(this.rotation.y)
        );
        
        const right = new Vector3(
            Math.cos(this.rotation.y),
            0,
            Math.sin(this.rotation.y)
        );

        let moveDirection = new Vector3(0, 0, 0);

        // WASD movement
        if (input.isKeyPressed('KeyW')) {
            moveDirection = moveDirection.add(forward);
        }
        if (input.isKeyPressed('KeyS')) {
            moveDirection = moveDirection.subtract(forward);
        }
        if (input.isKeyPressed('KeyA')) {
            moveDirection = moveDirection.subtract(right);
        }
        if (input.isKeyPressed('KeyD')) {
            moveDirection = moveDirection.add(right);
        }

        // Normalize and apply speed
        if (moveDirection.magnitude() > 0) {
            moveDirection = moveDirection.normalized();
            this.velocity.x = moveDirection.x * this.speed;
            this.velocity.z = moveDirection.z * this.speed;
        } else {
            this.velocity.x = 0;
            this.velocity.z = 0;
        }

        // Jumping
        if (input.isKeyPressed('Space') && this.onGround) {
            this.velocity.y = this.jumpSpeed;
            this.onGround = false;
        }
    }

    applyPhysics(dt) {
        // Apply gravity
        this.velocity.y -= this.gravity * dt;
        
        // Update position
        this.position = this.position.add(this.velocity.multiply(dt));
        
        // Ground collision
        if (this.position.y <= this.groundHeight) {
            this.position.y = this.groundHeight;
            this.velocity.y = 0;
            this.onGround = true;
        }
    }

    checkBounds() {
        // Keep player within world bounds
        this.position.x = Math.max(-this.worldSize, Math.min(this.worldSize, this.position.x));
        this.position.z = Math.max(-this.worldSize, Math.min(this.worldSize, this.position.z));
    }

    canShoot() {
        const now = Date.now();
        return this.isAlive && (now - this.lastShot) >= this.shootCooldown;
    }

    shoot() {
        if (!this.canShoot()) return false;

        this.lastShot = Date.now();
        return true;
    }

    takeDamage(amount, attackerId = null) {
        if (!this.isAlive) return false;

        this.health = Math.max(0, this.health - amount);
        
        if (this.health <= 0) {
            this.die(attackerId);
            return true;
        }
        
        return false;
    }

    die(killerId = null) {
        this.isAlive = false;
        this.health = 0;
        this.deaths++;
        
        // Reset velocity
        this.velocity = new Vector3(0, 0, 0);
        
        return killerId;
    }

    respawn(position = null) {
        this.isAlive = true;
        this.health = this.maxHealth;
        
        if (position) {
            this.position = Vector3.fromArray(position);
        } else {
            // Random spawn position
            this.position = new Vector3(
                (Math.random() - 0.5) * 40, // -20 to 20
                this.groundHeight,
                (Math.random() - 0.5) * 40  // -20 to 20
            );
        }
        
        this.velocity = new Vector3(0, 0, 0);
        this.onGround = true;
    }

    addKill() {
        this.kills++;
    }

    getKDRatio() {
        return this.deaths > 0 ? this.kills / this.deaths : this.kills;
    }

    // Get shooting direction
    getShootDirection() {
        return new Vector3(
            Math.sin(this.rotation.y) * Math.cos(this.rotation.x),
            Math.sin(this.rotation.x),
            -Math.cos(this.rotation.y) * Math.cos(this.rotation.x)
        ).normalized();
    }

    // Serialize for network
    serialize() {
        return {
            id: this.id,
            name: this.name,
            position: this.position.toArray(),
            rotation: this.rotation.toArray(),
            velocity: this.velocity.toArray(),
            health: this.health,
            kills: this.kills,
            deaths: this.deaths,
            isAlive: this.isAlive
        };
    }

    // Deserialize from network data
    deserialize(data) {
        if (data.position) this.position = Vector3.fromArray(data.position);
        if (data.rotation) this.rotation = Vector3.fromArray(data.rotation);
        if (data.velocity) this.velocity = Vector3.fromArray(data.velocity);
        if (data.health !== undefined) this.health = data.health;
        if (data.kills !== undefined) this.kills = data.kills;
        if (data.deaths !== undefined) this.deaths = data.deaths;
        if (data.isAlive !== undefined) this.isAlive = data.isAlive;
    }

    // Interpolate position for smooth movement of other players
    interpolateTowards(targetData, factor = 0.1) {
        if (targetData.position) {
            const targetPos = Vector3.fromArray(targetData.position);
            const diff = targetPos.subtract(this.position);
            this.position = this.position.add(diff.multiply(factor));
        }
        
        if (targetData.rotation) {
            const targetRot = Vector3.fromArray(targetData.rotation);
            // Simple linear interpolation for rotation
            this.rotation.x += (targetRot.x - this.rotation.x) * factor;
            this.rotation.y += (targetRot.y - this.rotation.y) * factor;
        }
    }
}
