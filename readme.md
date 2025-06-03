Frontend Features:

3D WebGL Renderer with custom shaders for lighting and geometry
First-person controls with mouse look and WASD movement
Physics system with gravity, jumping, and collision detection
Shooting mechanics with infinite ammo pistol and rate limiting
Health system with visual health bar and respawn mechanics
Multiplayer networking via WebSockets
UI elements including crosshair, player list, and main menu

Backend Features:

Lua WebSocket server handling multiple concurrent players
Real-time physics simulation running at 60 FPS
Hit detection with headshot multipliers
Player management with health, kills/deaths tracking
Bullet physics with collision detection and lifetime management
Game modes support (currently FFA, expandable to team-based)
Respawn system with 3-second delay after death

Game Mechanics:

Movement: WASD keys + mouse look + spacebar jumping
Combat: Left-click shooting with 100ms cooldown
Health: 100 HP, 25 damage per hit, 50 for headshots
Physics: Quake-style fast movement with gravity
World: 100x100 unit world with bounds checking

To Run:

Server: Install lua-websockets, lua-cjson, lua-socket, then run the Lua server
Client: Open the HTML file in a browser and connect to ws://localhost:8080
Controls: Click to lock mouse pointer, then use standard FPS controls

The game supports offline practice mode and multiplayer with up to 16 players. The architecture is designed to be easily extensible - you can add weapons, powerups, different game modes, and more complex level geometry by modifying the respective systems.
Would you like me to add any specific features like different weapons, team modes, or more complex level geometry?
