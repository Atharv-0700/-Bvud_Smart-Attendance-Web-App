#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "  Smart Attendance System - Image Setup Check"
echo "================================================"
echo ""

# Check if assets folder exists
if [ -d "src/assets" ]; then
    echo -e "${GREEN}✓${NC} src/assets/ folder exists"
else
    echo -e "${RED}✗${NC} src/assets/ folder NOT FOUND"
    echo -e "  ${YELLOW}→ Run: mkdir -p src/assets${NC}"
fi

echo ""

# Check for clg_logo.png
if [ -f "src/assets/clg_logo.png" ]; then
    SIZE=$(du -h "src/assets/clg_logo.png" | cut -f1)
    echo -e "${GREEN}✓${NC} clg_logo.png exists (Size: $SIZE)"
else
    echo -e "${RED}✗${NC} clg_logo.png NOT FOUND"
    echo -e "  ${YELLOW}→ Add your college logo to: src/assets/clg_logo.png${NC}"
fi

# Check for clg_campus.png
if [ -f "src/assets/clg_campus.png" ]; then
    SIZE=$(du -h "src/assets/clg_campus.png" | cut -f1)
    echo -e "${GREEN}✓${NC} clg_campus.png exists (Size: $SIZE)"
else
    echo -e "${RED}✗${NC} clg_campus.png NOT FOUND"
    echo -e "  ${YELLOW}→ Add your campus photo to: src/assets/clg_campus.png${NC}"
fi

echo ""

# Check if images.d.ts exists
if [ -f "src/types/images.d.ts" ]; then
    echo -e "${GREEN}✓${NC} src/types/images.d.ts exists"
else
    echo -e "${RED}✗${NC} src/types/images.d.ts NOT FOUND"
fi

# Check if Login.tsx has been updated
if grep -q "clgLogo" "src/app/components/Login.tsx" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Login.tsx updated with new imports"
else
    echo -e "${RED}✗${NC} Login.tsx NOT updated"
fi

echo ""
echo "================================================"

# Final verdict
if [ -f "src/assets/clg_logo.png" ] && [ -f "src/assets/clg_campus.png" ] && [ -f "src/types/images.d.ts" ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED!${NC}"
    echo -e "  ${GREEN}You can now run: npm run dev${NC}"
else
    echo -e "${YELLOW}⚠ SETUP INCOMPLETE${NC}"
    echo -e "  Please add the missing files as shown above."
    echo -e "  See ${YELLOW}IMAGE_SETUP_INSTRUCTIONS.md${NC} for details."
fi

echo "================================================"
