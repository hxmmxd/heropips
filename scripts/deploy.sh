#!/bin/bash
# Production Deployment Script for Utho Server

# Exit immediately if a command exits with a non-zero status
set -e

echo "=========================================="
echo "🚀 Starting TradeGPT Deployment..."
echo "=========================================="

# 1. Pull latest changes
echo "📥 Pulling latest updates from GitHub..."
git pull origin main

# 2. Install dependencies (including devDependencies required for compile/build)
echo "📦 Installing npm dependencies..."
npm ci --production=false

# 3. Build Next.js optimized production bundle
echo "🏗️ Building Next.js application..."
npm run build

# 4. Zero-downtime process reload using PM2
echo "🔄 Reloading Node.js process under PM2..."
if pm2 show tradegpt > /dev/null 2>&1; then
    pm2 reload tradegpt
    echo "✅ PM2 process 'tradegpt' successfully reloaded."
else
    pm2 start npm --name "tradegpt" -- run start
    echo "✅ PM2 process 'tradegpt' successfully started."
fi

# 5. Save PM2 list state
pm2 save

echo "=========================================="
echo "🎉 Deployment successfully completed!"
echo "=========================================="
