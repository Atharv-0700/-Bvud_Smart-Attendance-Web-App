#!/bin/bash

# Smart Attendance System - Placeholder Image Creator
# This script creates placeholder images if you want to test the app quickly
# Replace these with real images later!

echo "================================================"
echo "  Creating Placeholder Images for Testing"
echo "================================================"
echo ""

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found."
    echo ""
    echo "To create placeholder images, install ImageMagick:"
    echo "  • macOS: brew install imagemagick"
    echo "  • Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "  • Windows: Download from https://imagemagick.org/script/download.php"
    echo ""
    echo "Alternative: Download images manually and place them in src/assets/"
    echo ""
    exit 1
fi

# Create assets folder if it doesn't exist
mkdir -p src/assets

echo "Creating placeholder images..."
echo ""

# Create clg_logo.png (500x500, blue background with white text)
convert -size 500x500 xc:'#2563EB' \
    -gravity center \
    -fill white \
    -pointsize 40 \
    -annotate +0-50 'BVDU' \
    -pointsize 24 \
    -annotate +0+0 'Bharati Vidyapeeth' \
    -pointsize 20 \
    -annotate +0+40 'University' \
    -pointsize 16 \
    -annotate +0+70 'BCA Department' \
    src/assets/clg_logo.png 2>/dev/null

if [ -f "src/assets/clg_logo.png" ]; then
    SIZE=$(du -h "src/assets/clg_logo.png" | cut -f1)
    echo "✓ Created clg_logo.png ($SIZE)"
else
    echo "✗ Failed to create clg_logo.png"
fi

# Create clg_campus.png (1920x1080, gradient background with text)
convert -size 1920x1080 \
    gradient:'#1e3a8a'-'#06b6d4' \
    -gravity center \
    -fill white \
    -pointsize 80 \
    -annotate +0-100 'Bharati Vidyapeeth University' \
    -pointsize 50 \
    -annotate +0+0 'Kharghar Campus' \
    -pointsize 30 \
    -annotate +0+80 'Sector 3, Belpada, Navi Mumbai' \
    src/assets/clg_campus.png 2>/dev/null

if [ -f "src/assets/clg_campus.png" ]; then
    SIZE=$(du -h "src/assets/clg_campus.png" | cut -f1)
    echo "✓ Created clg_campus.png ($SIZE)"
else
    echo "✗ Failed to create clg_campus.png"
fi

echo ""
echo "================================================"

# Verify
if [ -f "src/assets/clg_logo.png" ] && [ -f "src/assets/clg_campus.png" ]; then
    echo "✓ Placeholder images created successfully!"
    echo ""
    echo "⚠️  IMPORTANT: These are PLACEHOLDER images for testing."
    echo "   Replace them with real college images before deployment!"
    echo ""
    echo "Files created:"
    ls -lh src/assets/
    echo ""
    echo "Next steps:"
    echo "  1. Restart your dev server: npm run dev"
    echo "  2. Test the login page"
    echo "  3. Replace with real images when available"
else
    echo "⚠️  Some images failed to create."
    echo "   Please add images manually to src/assets/"
fi

echo "================================================"
