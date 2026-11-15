
#!/bin/bash

# Knowledge Archive - GitHub Auto Updater

set -e

echo "=================================="
echo "   KNOWLEDGE ARCHIVE AUTO PUSH"
echo "=================================="

# Check repository
git rev-parse --is-inside-work-tree >/dev/null

# Add all changes
echo "[+] Adding changes..."
git add -A

# Check for changes
if git diff --cached --quiet; then
    echo "[!] No changes to commit."
else
    MESSAGE="${1:-Update Knowledge Archive}"

    echo "[+] Creating commit..."
    git commit -m "$MESSAGE"
fi

# Push to GitHub
echo "[+] Pushing to GitHub..."
git push origin main

echo "=================================="
echo "[SUCCESS] GitHub updated!"
echo "=================================="
