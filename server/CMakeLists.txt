cmake_minimum_required(VERSION 3.12)
project(FPSGameServer)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find packages
find_package(Threads REQUIRED)

# Add executable
add_executable(fps_server server.cpp)

# Include directories for header-only libraries
target_include_directories(fps_server PRIVATE 
    ${CMAKE_CURRENT_SOURCE_DIR}/third_party/websocketpp
    ${CMAKE_CURRENT_SOURCE_DIR}/third_party/nlohmann
)

# Link libraries
target_link_libraries(fps_server 
    Threads::Threads
)

# Compiler-specific options
if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU" OR CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
    target_compile_options(fps_server PRIVATE -Wall -Wextra -O3)
endif()

# For Windows
if(WIN32)
    target_link_libraries(fps_server ws2_32 wsock32)
endif()

# Download dependencies script
add_custom_target(download_deps
    COMMAND ${CMAKE_COMMAND} -P ${CMAKE_CURRENT_SOURCE_DIR}/download_deps.cmake
    COMMENT "Downloading dependencies"
)

# Make sure dependencies are downloaded before building
add_dependencies(fps_server download_deps)