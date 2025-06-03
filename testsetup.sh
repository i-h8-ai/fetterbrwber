# Clone your new repository
git clone https://github.com/yourusername/multiplayer-fps.git
cd multiplayer-fps

# Build and start the server
cd server
chmod +x build.sh
./build.sh
./fps_server

# In another terminal, start the client
cd client
python -m http.server 8000
# Or: npx serve . --port 8000
