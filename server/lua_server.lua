-- Multiplayer FPS Game Server in Lua
-- Requires: lua-websockets, lua-cjson, lua-socket

local websocket = require('websocket')
local json = require('cjson')
local socket = require('socket')

-- Server configuration
local SERVER_PORT = 8080
local TICK_RATE = 60  -- Server updates per second
local MAX_PLAYERS = 16
local WORLD_SIZE = 50

-- Game state
local gameState = {
    players = {},
    bullets = {},
    powerups = {},
    gameMode = "ffa", -- "ffa" or "team"
    tickCount = 0,
    lastUpdate = socket.gettime()
}

-- Player class
local Player = {}
Player.__index = Player

function Player:new(id, name, connection)
    local player = {
        id = id,
        name = name,
        connection = connection,
        position = {0, 1.8, 5},
        rotation = {0, 0},
        velocity = {0, 0, 0},
        health = 100,
        maxHealth = 100,
        kills = 0,
        deaths = 0,
        lastShot = 0,
        weaponCooldown = 100, -- milliseconds
        respawnTime = 0,
        team = math.random(1, 2), -- Random team assignment
        lastUpdate = socket.gettime() * 1000
    }
    setmetatable(player, Player)
    return player
end

function Player:update(dt)
    -- Apply gravity and physics
    self.velocity[2] = self.velocity[2] - 25 * dt -- gravity
    
    -- Update position
    self.position[1] = self.position[1] + self.velocity[1] * dt
    self.position[2] = self.position[2] + self.velocity[2] * dt
    self.position[3] = self.position[3] + self.velocity[3] * dt
    
    -- Ground collision
    if self.position[2] <= 1.8 then
        self.position[2] = 1.8
        self.velocity[2] = 0
    end
    
    -- World bounds
    self.position[1] = math.max(-WORLD_SIZE, math.min(WORLD_SIZE, self.position[1]))
    self.position[3] = math.max(-WORLD_SIZE, math.min(WORLD_SIZE, self.position[3]))
    
    -- Handle respawn
    if self.health <= 0 and self.respawnTime > 0 then
        self.respawnTime = self.respawnTime - dt * 1000
        if self.respawnTime <= 0 then
            self:respawn()
        end
    end
end

function Player:takeDamage(damage, attackerId)
    if self.health <= 0 then return false end
    
    self.health = math.max(0, self.health - damage)
    
    if self.health <= 0 then
        self:die(attackerId)
        return true
    end
    
    return false
end

function Player:die(killerId)
    self.deaths = self.deaths + 1
    self.health = 0
    self.respawnTime = 3000 -- 3 seconds
    
    -- Award kill to attacker
    if killerId and gameState.players[killerId] then
        gameState.players[killerId].kills = gameState.players[killerId].kills + 1
    end
    
    -- Broadcast death message
    broadcastToAll({
        type = "player_died",
        playerId = self.id,
        killerId = killerId,
        position = self.position
    })
end

function Player:respawn()
    self.health = self.maxHealth
    self.respawnTime = 0
    
    -- Random spawn position
    self.position = {
        math.random(-20, 20),
        1.8,
        math.random(-20, 20)
    }
    
    -- Broadcast respawn
    broadcastToAll({
        type = "player_respawned",
        playerId = self.id,
        position = self.position,
        health = self.health
    })
end

function Player:canShoot()
    local now = socket.gettime() * 1000
    return now - self.lastShot >= self.weaponCooldown
end

function Player:shoot()
    if not self:canShoot() or self.health <= 0 then
        return false
    end
    
    self.lastShot = socket.gettime() * 1000
    
    -- Create bullet/hitscan
    local bullet = {
        id = generateId(),
        playerId = self.id,
        position = {self.position[1], self.position[2], self.position[3]},
        direction = {
            math.sin(self.rotation[2]) * math.cos(self.rotation[1]),
            math.sin(self.rotation[1]),
            -math.cos(self.rotation[2]) * math.cos(self.rotation[1])
        },
        speed = 100,
        damage = 25,
        lifetime = 2.0, -- seconds
        startTime = socket.gettime()
    }
    
    table.insert(gameState.bullets, bullet)
    
    -- Broadcast shot
    broadcastToAll({
        type = "player_shot",
        playerId = self.id,
        position = self.position,
        rotation = self.rotation,
        bulletId = bullet.id
    })
    
    return true
end

-- Bullet physics
function updateBullets(dt)
    for i = #gameState.bullets, 1, -1 do
        local bullet = gameState.bullets[i]
        local age = socket.gettime() - bullet.startTime
        
        -- Remove expired bullets
        if age >= bullet.lifetime then
            table.remove(gameState.bullets, i)
            goto continue
        end
        
        -- Update bullet position
        local oldPos = {bullet.position[1], bullet.position[2], bullet.position[3]}
        bullet.position[1] = bullet.position[1] + bullet.direction[1] * bullet.speed * dt
        bullet.position[2] = bullet.position[2] + bullet.direction[2] * bullet.speed * dt
        bullet.position[3] = bullet.position[3] + bullet.direction[3] * bullet.speed * dt
        
        -- Check collisions with players
        for playerId, player in pairs(gameState.players) do
            if playerId ~= bullet.playerId and player.health > 0 then
                local distance = math.sqrt(
                    (bullet.position[1] - player.position[1])^2 +
                    (bullet.position[2] - player.position[2])^2 +
                    (bullet.position[3] - player.position[3])^2
                )
                
                -- Hit detection (simple sphere collision)
                if distance <= 1.0 then
                    -- Determine if headshot (higher damage)
                    local headshot = bullet.position[2] > player.position[2] + 0.5
                    local damage = headshot and bullet.damage * 2 or bullet.damage
                    
                    player:takeDamage(damage, bullet.playerId)
                    
                    -- Broadcast hit
                    broadcastToAll({
                        type = "player_hit",
                        playerId = playerId,
                        damage = damage,
                        headshot = headshot,
                        shooterId = bullet.playerId,
                        position = player.position
                    })
                    
                    -- Remove bullet
                    table.remove(gameState.bullets, i)
                    goto continue
                end
            end
        end
        
        -- Check world bounds
        if math.abs(bullet.position[1]) > WORLD_SIZE or 
           math.abs(bullet.position[3]) > WORLD_SIZE or
           bullet.position[2] < 0 or bullet.position[2] > 20 then
            table.remove(gameState.bullets, i)
        end
        
        ::continue::
    end
end

-- Utility functions
function generateId()
    return tostring(socket.gettime()) .. tostring(math.random(1000, 9999))
end

function broadcastToAll(message, excludeId)
    local messageStr = json.encode(message)
    for playerId, player in pairs(gameState.players) do
        if playerId ~= excludeId and player.connection then
            pcall(function()
                player.connection:send(messageStr)
            end)
        end
    end
end

function sendToPlayer(playerId, message)
    local player = gameState.players[playerId]
    if player and player.connection then
        pcall(function()
            player.connection:send(json.encode(message))
        end)
    end
end

-- Message handlers
local messageHandlers = {
    join = function(playerId, message, connection)
        local player = Player:new(playerId, message.name or "Anonymous", connection)
        gameState.players[playerId] = player
        
        -- Send welcome message
        sendToPlayer(playerId, {
            type = "player_joined",
            player = {
                id = player.id,
                name = player.name,
                position = player.position,
                health = player.health,
                kills = player.kills,
                deaths = player.deaths
            },
            yourId = playerId
        })
        
        -- Send current game state
        local players = {}
        for id, p in pairs(gameState.players) do
            players[id] = {
                id = p.id,
                name = p.name,
                position = p.position,
                rotation = p.rotation,
                health = p.health,
                kills = p.kills,
                deaths = p.deaths
            }
        end
        
        sendToPlayer(playerId, {
            type = "game_state",
            players = players
        })
        
        -- Broadcast new player to others
        broadcastToAll({
            type = "player_joined",
            player = {
                id = player.id,
                name = player.name,
                position = player.position,
                health = player.health
            }
        }, playerId)
        
        print("Player joined: " .. player.name .. " (ID: " .. playerId .. ")")
    end,
    
    update = function(playerId, message)
        local player = gameState.players[playerId]
        if not player then return end
        
        -- Update player state
        if message.position then
            player.position = message.position
        end
        if message.rotation then
            player.rotation = message.rotation
        end
        if message.velocity then
            player.velocity = message.velocity
        end
        
        player.lastUpdate = socket.gettime() * 1000
        
        -- Broadcast update to other players
        broadcastToAll({
            type = "player_update",
            player = {
                id = player.id,
                position = player.position,
                rotation = player.rotation,
                velocity = player.velocity,
                health = player.health
            }
        }, playerId)
    end,
    
    shoot = function(playerId, message)
        local player = gameState.players[playerId]
        if not player then return end
        
        player:shoot()
    end,
    
    respawn = function(playerId, message)
        local player = gameState.players[playerId]
        if not player then return end
        
        if message.position then
            player.position = message.position
        end
        player:respawn()
    end
}

-- WebSocket server
local function handleClient(connection)
    local playerId = generateId()
    
    connection:on('message', function(message)
        local success, data = pcall(json.decode, message)
        if not success then
            print("Invalid JSON received from " .. playerId)
            return
        end
        
        local handler = messageHandlers[data.type]
        if handler then
            handler(playerId, data, connection)
        else
            print("Unknown message type: " .. tostring(data.type))
        end
    end)
    
    connection:on('close', function()
        if gameState.players[playerId] then
            print("Player disconnected: " .. gameState.players[playerId].name)
            gameState.players[playerId] = nil
            
            broadcastToAll({
                type = "player_left",
                playerId = playerId
            })
        end
    end)
end

-- Main server loop
function startServer()
    print("Starting FPS Game Server on port " .. SERVER_PORT)
    print("Max players: " .. MAX_PLAYERS)
    print("Tick rate: " .. TICK_RATE .. " Hz")
    
    -- Create WebSocket server
    local server = websocket.server.new {
        port = SERVER_PORT,
        protocols = {'game-protocol'}
    }
    
    server:on('connection', handleClient)
    
    -- Game loop
    local lastTick = socket.gettime()
    local tickInterval = 1.0 / TICK_RATE
    
    while true do
        local now = socket.gettime()
        local dt = now - lastTick
        
        if dt >= tickInterval then
            -- Update game state
            gameState.tickCount = gameState.tickCount + 1
            
            -- Update players
            for playerId, player in pairs(gameState.players) do
                player:update(dt)
            end
            
            -- Update bullets
            updateBullets(dt)
            
            -- Send periodic game state updates (every 10 ticks)
            if gameState.tickCount % 10 == 0 then
                local gameUpdate = {
                    type = "game_tick",
                    tick = gameState.tickCount,
                    players = {}
                }
                
                for id, player in pairs(gameState.players) do
                    gameUpdate.players[id] = {
                        id = player.id,
                        position = player.position,
                        rotation = player.rotation,
                        health = player.health,
                        kills = player.kills,
                        deaths = player.deaths
                    }
                end
                
                broadcastToAll(gameUpdate)
            end
            
            lastTick = now
        end
        
        -- Process WebSocket events
        server:update()
        
        -- Small sleep to prevent 100% CPU usage
        socket.sleep(0.001)
    end
end

-- Start the server
print("=== Multiplayer FPS Game Server ===")
print("Built with Lua WebSockets")
print("")

-- Handle graceful shutdown
local function shutdown()
    print("\nShutting down server...")
    for playerId, player in pairs(gameState.players) do
        if player.connection then
            player.connection:close()
        end
    end
    os.exit(0)
end

-- Set up signal handlers
if pcall(require, 'signal') then
    local signal = require('signal')
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
end

-- Start the server
startServer()