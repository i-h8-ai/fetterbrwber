#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>
#include <memory>
#include <thread>
#include <chrono>
#include <cmath>
#include <random>
#include <algorithm>
#include <mutex>
#include <atomic>
#include <signal.h>

// WebSocket++ includes
#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>

// JSON library (nlohmann/json)
#include <nlohmann/json.hpp>

using json = nlohmann::json;
using namespace std;
using namespace std::chrono;

typedef websocketpp::server<websocketpp::config::asio> server;
typedef server::message_ptr message_ptr;
typedef websocketpp::connection_hdl connection_hdl;

// Game configuration
const int SERVER_PORT = 8080;
const int TICK_RATE = 60;
const int MAX_PLAYERS = 16;
const float WORLD_SIZE = 50.0f;
const float PLAYER_RADIUS = 0.5f;
const float GROUND_HEIGHT = 1.8f;

// Forward declarations
class Player;
class GameServer;

// Vector3 struct for 3D positions/vectors
struct Vector3 {
    float x, y, z;
    
    Vector3() : x(0), y(0), z(0) {}
    Vector3(float x, float y, float z) : x(x), y(y), z(z) {}
    
    Vector3 operator+(const Vector3& other) const {
        return Vector3(x + other.x, y + other.y, z + other.z);
    }
    
    Vector3 operator-(const Vector3& other) const {
        return Vector3(x - other.x, y - other.y, z - other.z);
    }
    
    Vector3 operator*(float scalar) const {
        return Vector3(x * scalar, y * scalar, z * scalar);
    }
    
    float magnitude() const {
        return sqrt(x * x + y * y + z * z);
    }
    
    Vector3 normalized() const {
        float mag = magnitude();
        if (mag == 0) return Vector3();
        return Vector3(x / mag, y / mag, z / mag);
    }
    
    json toJson() const {
        return json::array({x, y, z});
    }
    
    static Vector3 fromJson(const json& j) {
        if (j.is_array() && j.size() >= 3) {
            return Vector3(j[0], j[1], j[2]);
        }
        return Vector3();
    }
};

// Bullet class
class Bullet {
public:
    string id;
    string playerId;
    Vector3 position;
    Vector3 direction;
    float speed;
    float damage;
    float lifetime;
    steady_clock::time_point startTime;
    
    Bullet(const string& id, const string& playerId, const Vector3& pos, 
           const Vector3& dir, float speed = 100.0f, float damage = 25.0f, float lifetime = 2.0f)
        : id(id), playerId(playerId), position(pos), direction(dir.normalized()), 
          speed(speed), damage(damage), lifetime(lifetime), startTime(steady_clock::now()) {}
    
    void update(float dt) {
        position = position + direction * speed * dt;
    }
    
    bool isExpired() const {
        auto now = steady_clock::now();
        auto age = duration_cast<milliseconds>(now - startTime).count() / 1000.0f;
        return age >= lifetime;
    }
    
    bool isOutOfBounds() const {
        return abs(position.x) > WORLD_SIZE || 
               abs(position.z) > WORLD_SIZE || 
               position.y < 0 || position.y > 20;
    }
};

// Player class
class Player {
public:
    string id;
    string name;
    connection_hdl connection;
    Vector3 position;
    Vector3 rotation; // pitch, yaw
    Vector3 velocity;
    float health;
    float maxHealth;
    int kills;
    int deaths;
    steady_clock::time_point lastShot;
    int weaponCooldown; // milliseconds
    steady_clock::time_point respawnTime;
    int team;
    steady_clock::time_point lastUpdate;
    bool isAlive;
    
    Player(const string& id, const string& name, connection_hdl conn)
        : id(id), name(name), connection(conn), position(0, GROUND_HEIGHT, 5),
          rotation(0, 0, 0), velocity(0, 0, 0), health(100), maxHealth(100),
          kills(0), deaths(0), lastShot(steady_clock::now()), weaponCooldown(100),
          respawnTime(steady_clock::now()), team(rand() % 2 + 1), 
          lastUpdate(steady_clock::now()), isAlive(true) {}
    
    void update(float dt) {
        if (!isAlive) {
            auto now = steady_clock::now();
            auto timeSinceDeath = duration_cast<milliseconds>(now - respawnTime).count();
            if (timeSinceDeath >= 3000) { // 3 seconds
                respawn();
            }
            return;
        }
        
        // Apply gravity
        velocity.y -= 25.0f * dt;
        
        // Update position
        position = position + velocity * dt;
        
        // Ground collision
        if (position.y <= GROUND_HEIGHT) {
            position.y = GROUND_HEIGHT;
            velocity.y = 0;
        }
        
        // World bounds
        position.x = max(-WORLD_SIZE, min(WORLD_SIZE, position.x));
        position.z = max(-WORLD_SIZE, min(WORLD_SIZE, position.z));
    }
    
    bool takeDamage(float damage, const string& attackerId) {
        if (!isAlive) return false;
        
        health = max(0.0f, health - damage);
        
        if (health <= 0) {
            die(attackerId);
            return true;
        }
        
        return false;
    }
    
    void die(const string& killerId);
    
    void respawn() {
        health = maxHealth;
        isAlive = true;
        
        // Random spawn position
        random_device rd;
        mt19937 gen(rd());
        uniform_real_distribution<> dis(-20.0, 20.0);
        
        position = Vector3(dis(gen), GROUND_HEIGHT, dis(gen));
        velocity = Vector3(0, 0, 0);
    }
    
    bool canShoot() const {
        auto now = steady_clock::now();
        auto timeSinceLastShot = duration_cast<milliseconds>(now - lastShot).count();
        return timeSinceLastShot >= weaponCooldown && isAlive;
    }
    
    unique_ptr<Bullet> shoot() {
        if (!canShoot()) return nullptr;
        
        lastShot = steady_clock::now();
        
        // Calculate bullet direction from rotation
        Vector3 direction(
            sin(rotation.y) * cos(rotation.x),
            sin(rotation.x),
            -cos(rotation.y) * cos(rotation.x)
        );
        
        // Generate bullet ID
        string bulletId = id + "_" + to_string(duration_cast<milliseconds>(
            steady_clock::now().time_since_epoch()).count());
        
        return make_unique<Bullet>(bulletId, id, position, direction);
    }
    
    json toJson() const {
        return json{
            {"id", id},
            {"name", name},
            {"position", position.toJson()},
            {"rotation", rotation.toJson()},
            {"velocity", velocity.toJson()},
            {"health", health},
            {"kills", kills},
            {"deaths", deaths},
            {"team", team},
            {"isAlive", isAlive}
        };
    }
};

// Game Server class
class GameServer {
private:
    server wsServer;
    thread gameThread;
    atomic<bool> running;
    mutex playersMutex;
    mutex bulletsMutex;
    
    unordered_map<string, shared_ptr<Player>> players;
    vector<unique_ptr<Bullet>> bullets;
    
    steady_clock::time_point lastTick;
    int tickCount;
    
public:
    GameServer() : running(false), lastTick(steady_clock::now()), tickCount(0) {
        // Set logging settings
        wsServer.set_access_channels(websocketpp::log::alevel::all);
        wsServer.clear_access_channels(websocketpp::log::alevel::frame_payload);
        
        // Initialize Asio
        wsServer.init_asio();
        
        // Set message handler
        wsServer.set_message_handler([this](connection_hdl hdl, message_ptr msg) {
            handleMessage(hdl, msg);
        });
        
        // Set connection handlers
        wsServer.set_open_handler([this](connection_hdl hdl) {
            cout << "New connection opened" << endl;
        });
        
        wsServer.set_close_handler([this](connection_hdl hdl) {
            handleDisconnection(hdl);
        });
    }
    
    void start() {
        cout << "=== Multiplayer FPS Game Server ===" << endl;
        cout << "Starting server on port " << SERVER_PORT << endl;
        cout << "Max players: " << MAX_PLAYERS << endl;
        cout << "Tick rate: " << TICK_RATE << " Hz" << endl;
        
        // Set up the server
        wsServer.set_reuse_addr(true);
        wsServer.listen(SERVER_PORT);
        wsServer.start_accept();
        
        running = true;
        
        // Start game loop thread
        gameThread = thread(&GameServer::gameLoop, this);
        
        // Run the server
        wsServer.run();
    }
    
    void stop() {
        running = false;
        if (gameThread.joinable()) {
            gameThread.join();
        }
        wsServer.stop();
    }
    
private:
    void handleMessage(connection_hdl hdl, message_ptr msg) {
        try {
            json data = json::parse(msg->get_payload());
            string messageType = data["type"];
            
            if (messageType == "join") {
                handlePlayerJoin(hdl, data);
            } else if (messageType == "update") {
                handlePlayerUpdate(hdl, data);
            } else if (messageType == "shoot") {
                handlePlayerShoot(hdl, data);
            } else if (messageType == "respawn") {
                handlePlayerRespawn(hdl, data);
            }
        } catch (const exception& e) {
            cerr << "Error handling message: " << e.what() << endl;
        }
    }
    
    void handlePlayerJoin(connection_hdl hdl, const json& data) {
        string playerId = generateId();
        string playerName = data.value("name", "Anonymous");
        
        auto player = make_shared<Player>(playerId, playerName, hdl);
        
        {
            lock_guard<mutex> lock(playersMutex);
            players[playerId] = player;
        }
        
        // Send welcome message
        json welcomeMsg = {
            {"type", "player_joined"},
            {"player", player->toJson()},
            {"yourId", playerId}
        };
        sendToPlayer(hdl, welcomeMsg);
        
        // Send current game state
        json gameStateMsg = {
            {"type", "game_state"},
            {"players", json::object()}
        };
        
        {
            lock_guard<mutex> lock(playersMutex);
            for (const auto& pair : players) {
                gameStateMsg["players"][pair.first] = pair.second->toJson();
            }
        }
        sendToPlayer(hdl, gameStateMsg);
        
        // Broadcast new player to others
        json broadcastMsg = {
            {"type", "player_joined"},
            {"player", player->toJson()}
        };
        broadcastToAll(broadcastMsg, playerId);
        
        cout << "Player joined: " << playerName << " (ID: " << playerId << ")" << endl;
    }
    
    void handlePlayerUpdate(connection_hdl hdl, const json& data) {
        string playerId = findPlayerIdByConnection(hdl);
        if (playerId.empty()) return;
        
        lock_guard<mutex> lock(playersMutex);
        auto it = players.find(playerId);
        if (it == players.end()) return;
        
        auto player = it->second;
        
        if (data.contains("position")) {
            player->position = Vector3::fromJson(data["position"]);
        }
        if (data.contains("rotation")) {
            player->rotation = Vector3::fromJson(data["rotation"]);
        }
        if (data.contains("velocity")) {
            player->velocity = Vector3::fromJson(data["velocity"]);
        }
        
        player->lastUpdate = steady_clock::now();
        
        // Broadcast update to other players
        json updateMsg = {
            {"type", "player_update"},
            {"player", player->toJson()}
        };
        broadcastToAll(updateMsg, playerId);
    }
    
    void handlePlayerShoot(connection_hdl hdl, const json& data) {
        string playerId = findPlayerIdByConnection(hdl);
        if (playerId.empty()) return;
        
        shared_ptr<Player> player;
        {
            lock_guard<mutex> lock(playersMutex);
            auto it = players.find(playerId);
            if (it == players.end()) return;
            player = it->second;
        }
        
        auto bullet = player->shoot();
        if (bullet) {
            {
                lock_guard<mutex> lock(bulletsMutex);
                bullets.push_back(move(bullet));
            }
            
            // Broadcast shot
            json shotMsg = {
                {"type", "player_shot"},
                {"playerId", playerId},
                {"position", player->position.toJson()},
                {"rotation", player->rotation.toJson()}
            };
            broadcastToAll(shotMsg);
        }
    }
    
    void handlePlayerRespawn(connection_hdl hdl, const json& data) {
        string playerId = findPlayerIdByConnection(hdl);
        if (playerId.empty()) return;
        
        lock_guard<mutex> lock(playersMutex);
        auto it = players.find(playerId);
        if (it == players.end()) return;
        
        it->second->respawn();
    }
    
    void handleDisconnection(connection_hdl hdl) {
        string playerId = findPlayerIdByConnection(hdl);
        if (playerId.empty()) return;
        
        string playerName;
        {
            lock_guard<mutex> lock(playersMutex);
            auto it = players.find(playerId);
            if (it != players.end()) {
                playerName = it->second->name;
                players.erase(it);
            }
        }
        
        if (!playerName.empty()) {
            cout << "Player disconnected: " << playerName << endl;
            
            json disconnectMsg = {
                {"type", "player_left"},
                {"playerId", playerId}
            };
            broadcastToAll(disconnectMsg);
        }
    }
    
    void gameLoop() {
        const auto tickInterval = microseconds(1000000 / TICK_RATE);
        
        while (running) {
            auto now = steady_clock::now();
            auto dt = duration_cast<microseconds>(now - lastTick).count() / 1000000.0f;
            lastTick = now;
            
            tickCount++;
            
            // Update players
            {
                lock_guard<mutex> lock(playersMutex);
                for (auto& pair : players) {
                    pair.second->update(dt);
                }
            }
            
            // Update bullets and check collisions
            updateBullets(dt);
            
            // Send periodic game state updates (every 10 ticks)
            if (tickCount % 10 == 0) {
                sendGameTick();
            }
            
            // Sleep to maintain tick rate
            this_thread::sleep_until(now + tickInterval);
        }
    }
    
    void updateBullets(float dt) {
        lock_guard<mutex> bulletLock(bulletsMutex);
        
        for (auto it = bullets.begin(); it != bullets.end();) {
            auto& bullet = *it;
            
            // Remove expired or out-of-bounds bullets
            if (bullet->isExpired() || bullet->isOutOfBounds()) {
                it = bullets.erase(it);
                continue;
            }
            
            // Update bullet position
            bullet->update(dt);
            
            // Check collisions with players
            bool hitPlayer = false;
            {
                lock_guard<mutex> playerLock(playersMutex);
                for (auto& playerPair : players) {
                    auto& player = playerPair.second;
                    
                    if (player->id == bullet->playerId || !player->isAlive) {
                        continue;
                    }
                    
                    // Simple sphere collision
                    Vector3 diff = bullet->position - player->position;
                    float distance = diff.magnitude();
                    
                    if (distance <= PLAYER_RADIUS) {
                        // Determine if headshot
                        bool headshot = bullet->position.y > player->position.y + 0.5f;
                        float damage = headshot ? bullet->damage * 2 : bullet->damage;
                        
                        player->takeDamage(damage, bullet->playerId);
                        
                        // Broadcast hit
                        json hitMsg = {
                            {"type", "player_hit"},
                            {"playerId", player->id},
                            {"damage", damage},
                            {"headshot", headshot},
                            {"shooterId", bullet->playerId},
                            {"position", player->position.toJson()}
                        };
                        broadcastToAll(hitMsg);
                        
                        hitPlayer = true;
                        break;
                    }
                }
            }
            
            if (hitPlayer) {
                it = bullets.erase(it);
            } else {
                ++it;
            }
        }
    }
    
    void sendGameTick() {
        json gameUpdate = {
            {"type", "game_tick"},
            {"tick", tickCount},
            {"players", json::object()}
        };
        
        {
            lock_guard<mutex> lock(playersMutex);
            for (const auto& pair : players) {
                gameUpdate["players"][pair.first] = pair.second->toJson();
            }
        }
        
        broadcastToAll(gameUpdate);
    }
    
    string generateId() {
        auto now = steady_clock::now();
        auto timestamp = duration_cast<milliseconds>(now.time_since_epoch()).count();
        return to_string(timestamp) + to_string(rand() % 10000);
    }
    
    string findPlayerIdByConnection(connection_hdl hdl) {
        lock_guard<mutex> lock(playersMutex);
        for (const auto& pair : players) {
            if (pair.second->connection.lock() == hdl.lock()) {
                return pair.first;
            }
        }
        return "";
    }
    
    void sendToPlayer(connection_hdl hdl, const json& message) {
        try {
            wsServer.send(hdl, message.dump(), websocketpp::frame::opcode::text);
        } catch (const exception& e) {
            cerr << "Error sending message to player: " << e.what() << endl;
        }
    }
    
    void broadcastToAll(const json& message, const string& excludeId = "") {
        string messageStr = message.dump();
        
        lock_guard<mutex> lock(playersMutex);
        for (const auto& pair : players) {
            if (pair.first != excludeId) {
                try {
                    wsServer.send(pair.second->connection, messageStr, 
                                 websocketpp::frame::opcode::text);
                } catch (const exception& e) {
                    cerr << "Error broadcasting to player " << pair.first 
                         << ": " << e.what() << endl;
                }
            }
        }
    }
};

// Implementation of Player::die (needed GameServer reference)
void Player::die(const string& killerId) {
    deaths++;
    health = 0;
    isAlive = false;
    respawnTime = steady_clock::now();
    
    // Award kill to attacker would be handled in GameServer
    // This is a simplified version
}

// Global server instance for signal handling
GameServer* globalServer = nullptr;

void signalHandler(int signal) {
    cout << "\nReceived signal " << signal << ", shutting down..." << endl;
    if (globalServer) {
        globalServer->stop();
    }
    exit(0);
}

int main() {
    // Set up signal handling
    signal(SIGINT, signalHandler);
    signal(SIGTERM, signalHandler);
    
    try {
        GameServer server;
        globalServer = &server;
        
        server.start();
    } catch (const exception& e) {
        cerr << "Server error: " << e.what() << endl;
        return 1;
    }
    
    return 0;
}