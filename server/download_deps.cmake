# Download dependencies for FPS Game Server

# Create third_party directory
file(MAKE_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/third_party)

# Download WebSocket++
if(NOT EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/third_party/websocketpp)
    message(STATUS "Downloading WebSocket++...")
    file(DOWNLOAD 
        https://github.com/zaphoyd/websocketpp/archive/refs/tags/0.8.2.tar.gz
        ${CMAKE_CURRENT_SOURCE_DIR}/third_party/websocketpp.tar.gz
    )
    
    execute_process(
        COMMAND ${CMAKE_COMMAND} -E tar xzf websocketpp.tar.gz
        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/third_party
    )
    
    file(RENAME 
        ${CMAKE_CURRENT_SOURCE_DIR}/third_party/websocketpp-0.8.2
        ${CMAKE_CURRENT_SOURCE_DIR}/third_party/websocketpp
    )
    
    file(REMOVE ${CMAKE_CURRENT_SOURCE_DIR}/third_party/websocketpp.tar.gz)
endif()

# Download nlohmann/json
if(NOT EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/third_party/nlohmann)
    message(STATUS "Downloading nlohmann/json...")
    file(MAKE_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/third_party/nlohmann)
    file(DOWNLOAD 
        https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp
        ${CMAKE_CURRENT_SOURCE_DIR}/third_party/nlohmann/json.hpp
    )
endif()

message(STATUS "Dependencies downloaded successfully!")