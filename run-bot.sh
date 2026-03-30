#!/bin/bash
# JuroBot Runner Script
# Automatically restarts the bot if it crashes.

# Ensure we are in the correct directory
cd "$(dirname "$0")"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

while true; do
    echo "🟢 Starting JuroBot..."
    
    # Run bot.js
    # We suppress PartialReadError spam which is common in Mineflayer
    node bot.js 2>/dev/null
    
    echo "❌ Bot stopped or crashed. Restarting in 5 seconds..."
    sleep 5
done
