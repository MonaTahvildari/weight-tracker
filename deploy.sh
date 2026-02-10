#!/bin/bash

# Deployment script for Weight Tracker
# Deploys to GitHub Pages

echo "🚀 Deploying Weight Tracker to GitHub Pages..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not initialized. Please run:"
    echo "   git init"
    echo "   git remote add origin YOUR_REPO_URL"
    exit 1
fi

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "📦 Committing changes..."
    git add .
    git commit -m "Deploy: $(date +%Y-%m-%d\ %H:%M:%S)"
else
    echo "✓ No changes to commit"
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✓ Successfully deployed to GitHub Pages!"
    echo ""
    echo "📍 Your site should be available at:"
    echo "   https://YOUR_USERNAME.github.io/weight-tracker/"
    echo ""
    echo "⏳ It may take a few minutes for changes to appear."
else
    echo "❌ Push failed. Please check your repository settings."
    exit 1
fi
