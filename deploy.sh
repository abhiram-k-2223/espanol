#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "==> Deploying Gotham Grammar to GitHub Pages..."

# Init git if not already
if [ ! -d .git ]; then
  git init
  echo "  git initialized"
fi

# Add and commit
git add -A
git commit -m "deploy $(date +%Y-%m-%d_%H:%M)" 2>/dev/null || echo "  nothing new to commit"

# Check if remote exists
if ! git remote get-url origin &>/dev/null; then
  if command -v gh &>/dev/null; then
    echo "==> Creating GitHub repo..."
    gh repo create espanol --public --push --source=. --remote=origin
    echo "==> Done! https://github.com/$(gh api user -q .login)/espanol"
  else
    echo "==> No remote 'origin' set."
    echo "    1. Create a repo at https://github.com/new  (name: espanol)"
    echo "    2. Then run:"
    echo "       git remote add origin https://github.com/YOUR_USER/espanol.git"
    echo "       git push -u origin main"
    echo "    3. Enable Pages: Settings → Pages → deploy from main branch / (root)"
    exit 1
  fi
else
  git push -u origin main
  echo "==> Pushed to $(git remote get-url origin)"
fi

echo ""
echo "==> Enable GitHub Pages:"
echo "    Settings → Pages → Source: Deploy from main branch → / (root)"
echo "    Site will be at: https://$(gh api user -q .login 2>/dev/null || echo "YOUR_USER").github.io/espanol/"
