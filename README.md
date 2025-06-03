# Multiplayer FPS Game

A real-time multiplayer first-person shooter built with WebGL (frontend) and C++ WebSocket server (backend).

## Features

### 🎮 **Gameplay**
- **Fast-paced FPS action** with Quake-style movement
- **Real-time multiplayer** support for up to 16 players
- **Hitscan weapons** with headshot multipliers (2x damage)
- **Physics simulation** with gravity, jumping, and collision detection
- **Respawn system** with 3-second countdown
- **Kill/Death tracking** and live scoreboard

### 🌐 **Networking**
- **High-performance C++ server** using WebSocket++
- **60 FPS server tick rate** for smooth gameplay
- **Client-side prediction** with server reconciliation
- **Lag compensation** and interpolation
- **Automatic reconnection** on connection loss

### 🎨 **Graphics & Effects**
- **Custom WebGL renderer** with 3D shaders
- **Dynamic lighting** and shadows
- **Visual effects** (muzzle flash, damage indicators, hit markers)
- **Responsive UI** with real-time health/ammo display
- **Kill feed** and scoreboard overlay

### 🔊 **Audio**
- **Procedural sound effects** for shooting and hits
- **Web Audio API** implementation
- **Positional audio** support

## Quick Start

### 🖥️ **Server Setup**

1. **Install dependencies:**
   ```bash
   # Ubuntu/Debian
   sudo apt install build-essential cmake
   
   # macOS
   brew install cmake
   ```

2. **Build the server:**
   ```bash
   cd server
   mkdir build && cd build
   cmake ..
   make
   ```

3. **Run the server:**
   ```bash
   ./fps_server
   ```

### 🌐 **Client Setup**

1. **Serve the client files:**
   ```bash
   # Using Python
   cd client
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   ```

2. **Open in browser:**
   ```
   http://localhost:8000
   ```

3. **Play:**
   - Enter server URL: `ws://localhost:8080`
   - Choose a player name
   - Click "Join Server" or "Practice Offline"

## 🎮 Controls

| Key | Action |
|-----|--------|
| **WASD** | Move |
| **Mouse** | Look around |
| **Left Click** | Shoot |
| **Space** | Jump |
| **Tab** | Show scoreboard (hold) |
| **Escape** | Return to menu |

## 📁 Project Structure

```
multiplayer-fps/
├── client/                 # WebGL Frontend
│   ├── index.html         # Main HTML file
│   ├── styles.css         # Game styles
│   └── js/                # JavaScript modules
│       ├── main.js        # Entry point
│       ├── game.js        # Game logic
│       ├── renderer.js    # WebGL rendering
│       ├── input.js       # Input handling
│       ├── network.js     # WebSocket client
│       ├── effects.js     # Visual/audio effects
│       ├── ui.js          # User interface
│       ├── player.js      # Player class
│       └── math.js        # 3D math utilities
├── server/                # C++ Backend
│   ├── server.cpp         # Main server code
│   ├── CMakeLists.txt     # CMake build script
│   ├── download_deps.cmake # Dependency downloader
│   ├── build.sh           # Simple build script
│   └── build.bat          # Windows build script
└── README.md              # This file
```

## 🏗️ Architecture

### **Client Architecture**
- **Modular ES6 design** with separate concerns
- **Component-based systems** (Renderer, Input, Network, etc.)
- **Entity-component model** for players and game objects
- **Efficient rendering pipeline** with culling and batching

### **Server Architecture**
- **Multi-threaded C++ server** with thread-safe operations
- **High-frequency game loop** (60 FPS) with fixed timestep
- **Authoritative server** with client prediction
- **Efficient collision detection** and physics simulation

### **Network Protocol**
```json
{
  "type": "player_update",
  "player": {
    "id": "player123",
    "position": [x, y, z],
    "rotation": [pitch, yaw, roll],
    "velocity": [vx, vy, vz],
    "health": 75
  },
  "timestamp": 1234567890
}
```

## 🔧 Configuration

### **Server Configuration** (`server.cpp`)
```cpp
const int SERVER_PORT = 8080;
const int TICK_RATE = 60;
const int MAX_PLAYERS = 16;
const float WORLD_SIZE = 50.0f;
```

### **Client Configuration** (`js/game.js`)
```javascript
this.networkUpdateRate = 50; // 20fps network updates
const TICK_RATE = 60;        // Game update rate
const WORLD_SIZE = 50;       // World boundaries
```

## 🛠️ Development

### **Adding New Weapons**
1. Update `Player.js` with weapon properties
2. Add weapon data to network protocol
3. Implement server-side validation
4. Add visual/audio effects

### **Adding Game Modes**
1. Extend server game state
2. Add mode-specific logic in `game.js`
3. Update UI for mode selection

### **Performance Optimization**
- **Client**: Use object pooling for bullets/effects
- **Server**: Optimize collision detection with spatial partitioning
- **Network**: Implement delta compression for updates

## 🐛 Troubleshooting

### **Connection Issues**
```bash
# Check if server is running
netstat -ln | grep 8080

# Test WebSocket connection
wscat -c ws://localhost:8080
```

### **Build Issues**
```bash
# Missing dependencies
sudo apt install libwebsocketpp-dev nlohmann-json3-dev

# CMake not found
sudo apt install cmake
```

### **Performance Issues**
- Lower server tick rate for weak hardware
- Reduce network update frequency
- Disable visual effects in browser

## 📈 Roadmap

- [ ] **Weapons System** - Multiple weapon types
- [ ] **Power-ups** - Health packs, speed boosts
- [ ] **Team Modes** - Team Deathmatch, Capture the Flag
- [ ] **Map System** - Multiple levels with different layouts
- [ ] **Spectator Mode** - Watch games in progress
- [ ] **Matchmaking** - Automatic game lobbies
- [ ] **Statistics** - Persistent player stats
- [ ] **Anti-cheat** - Server-side validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **WebSocket++** - C++ WebSocket library
- **nlohmann/json** - JSON for Modern C++
- **WebGL** - 3D graphics in the browser
- **Quake** - Inspiration for movement mechanics

---

**Ready to frag? Join the battle! 🔫**
