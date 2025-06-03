export class EffectsManager {
    constructor() {
        this.audioContext = null;
        this.initAudio();
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Audio not supported');
        }
    }

    createMuzzleFlash(position, rotation) {
        // Visual muzzle flash effect
        console.log('Muzzle flash at', position, 'rotation', rotation);
        
        // Could add particle effects here
        // For now, just a simple console log
    }

    playShootSound() {
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'square';
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        } catch (e) {
            console.warn('Error playing shoot sound:', e);
        }
    }

    playHitSound() {
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = 400;
            oscillator.type = 'sawtooth';
            
            gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        } catch (e) {
            console.warn('Error playing hit sound:', e);
        }
    }

    showDamageEffect(isHeadshot = false) {
        const damageFlash = document.getElementById('damageFlash');
        if (!damageFlash) return;
        
        damageFlash.style.background = isHeadshot ? 
            'rgba(255, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.5)';
        damageFlash.style.opacity = '1';
        
        setTimeout(() => {
            damageFlash.style.opacity = '0';
        }, 150);
        
        if (isHeadshot) {
            this.playHitSound();
        }
    }

    createHitMarker(position, isHeadshot = false) {
        const hitMarker = document.createElement('div');
        hitMarker.className = 'hit-marker';
        hitMarker.textContent = isHeadshot ? 'HEADSHOT!' : '-25';
        hitMarker.style.color = isHeadshot ? '#ffff00' : '#ffffff';
        
        // Convert 3D position to screen coordinates (simplified)
        // In a real implementation, you'd use the camera matrix
        hitMarker.style.left = '50%';
        hitMarker.style.top = '50%';
        
        document.body.appendChild(hitMarker);
        
        setTimeout(() => {
            if (document.body.contains(hitMarker)) {
                document.body.removeChild(hitMarker);
            }
        }, 1000);
    }

    showDeathScreen() {
        const deathScreen = document.getElementById('deathScreen');
        if (!deathScreen) return;
        
        deathScreen.style.display = 'flex';
        
        let countdown = 3;
        const timer = document.getElementById('respawnTimer');
        
        if (timer) {
            const countdownInterval = setInterval(() => {
                countdown--;
                timer.textContent = countdown;
                
                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                }
            }, 1000);
        }
    }

    hideDeathScreen() {
        const deathScreen = document.getElementById('deathScreen');
        if (deathScreen) {
            deathScreen.style.display = 'none';
        }
    }

    addKillFeedItem(killerName, victimName, isHeadshot = false) {
        const killFeed = document.getElementById('killFeed');
        if (!killFeed) return;
        
        const item = document.createElement('div');
        item.className = 'kill-feed-item';
        
        const weapon = isHeadshot ? '🎯' : '🔫';
        item.textContent = `${killerName} ${weapon} ${victimName}`;
        
        killFeed.appendChild(item);
        
        // Remove old items if too many
        while (killFeed.children.length > 5) {
            killFeed.removeChild(killFeed.firstChild);
        }
        
        // Fade out after 5 seconds
        setTimeout(() => {
            item.style.opacity = '0';
            setTimeout(() => {
                if (killFeed.contains(item)) {
                    killFeed.removeChild(item);
                }
            }, 500);
        }, 5000);
    }

    createExplosion(position) {
        // Simple explosion effect
        console.log('Explosion at', position);
        
        // Could add particle system here
        // For now, just screen shake
        this.screenShake(300);
    }

    screenShake(duration = 200) {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        
        const originalTransform = canvas.style.transform;
        const shakeIntensity = 5;
        
        const startTime = Date.now();
        const shake = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 1) {
                const intensity = shakeIntensity * (1 - progress);
                const x = (Math.random() - 0.5) * intensity;
                const y = (Math.random() - 0.5) * intensity;
                
                canvas.style.transform = `translate(${x}px, ${y}px)`;
                requestAnimationFrame(shake);
            } else {
                canvas.style.transform = originalTransform;
            }
        };
        
        shake();
    }
}
