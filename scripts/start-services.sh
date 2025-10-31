#!/bin/bash

# Start MongoDB and Redis containers for dindin-app
echo "🚀 Starting MongoDB and Redis containers..."

# Start MongoDB if not running
if ! docker ps | grep -q mongodb; then
    echo "Starting MongoDB container..."
    docker run -d --name mongodb \
        -p 27017:27017 \
        -e MONGO_INITDB_ROOT_USERNAME=admin \
        -e MONGO_INITDB_ROOT_PASSWORD=password \
        mongo:latest
else
    echo "MongoDB already running"
fi

# Start Redis if not running
if ! docker ps | grep -q redis; then
    echo "Starting Redis container..."
    docker run -d --name redis \
        -p 6379:6379 \
        redis:latest
else
    echo "Redis already running"
fi

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 3

# Check MongoDB connection
echo "Checking MongoDB..."
docker exec mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ MongoDB is ready"
else
    echo "❌ MongoDB is not ready"
fi

# Check Redis connection
echo "Checking Redis..."
docker exec redis redis-cli ping > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Redis is ready"
else
    echo "❌ Redis is not ready"
fi

echo "Services startup complete!"