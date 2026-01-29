# 🖼️ Image Setup Instructions

## ✅ What's Already Done

1. ✅ Created `/src/types/images.d.ts` - TypeScript declarations for image imports
2. ✅ Updated `/src/app/components/Login.tsx` - Changed imports to use new image paths
3. ✅ Verified path alias `@` is configured in `vite.config.ts`

## 🚨 CRITICAL: You Must Add These Files

### Required Image Files

You need to **manually add** these two image files to your project:

```
📁 src/
  📁 assets/              ← CREATE THIS FOLDER
    📄 clg_logo.png       ← ADD THIS FILE
    📄 clg_campus.png     ← ADD THIS FILE
```

### Step-by-Step Instructions

#### 1. Create the assets folder
```bash
mkdir -p src/assets
```

#### 2. Add the images

**Option A: Copy your own images**
- Copy `clg_logo.png` (your college logo) to `src/assets/`
- Copy `clg_campus.png` (your campus building photo) to `src/assets/`

**Option B: Use placeholder images temporarily**

You can download these from Unsplash or use any images:

- **clg_logo.png**: University logo or emblem (recommended: square aspect ratio, transparent background)
- **clg_campus.png**: College campus building photo (recommended: landscape orientation, 1920x1080 or higher)

#### 3. Verify the structure

After adding the files, your structure should look like:

```
src/
├── assets/
│   ├── clg_logo.png      ✓
│   └── clg_campus.png    ✓
├── app/
├── config/
├── types/
│   ├── images.d.ts       ✓ (Already created)
│   └── ...
└── ...
```

#### 4. Restart your dev server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
# or
pnpm dev
# or
yarn dev
```

## 📝 What Changed in Login.tsx

**Old imports (figma:asset):**
```tsx
import image_8f475c60ab263c84a45860a35d503e1c9950bfed from 'figma:asset/8f475c60ab263c84a45860a35d503e1c9950bfed.png';
import collegeBuilding from 'figma:asset/4ecc0a096fb49911b0e38a5b217846369b4c7854.png';
```

**New imports:**
```tsx
import clgLogo from '@/assets/clg_logo.png';
import clgCampus from '@/assets/clg_campus.png';
```

**Usage in JSX:**
```tsx
// Background image
<img src={clgCampus} alt="..." />

// Logo
<ImageWithFallback src={clgLogo} alt="..." />
```

## 🔧 Troubleshooting

### Error: "Cannot find module '@/assets/clg_logo.png'"

**Cause**: The image files don't exist yet.

**Solution**: 
1. Make sure the folder name is exactly `assets` (lowercase)
2. Make sure the image files are named exactly `clg_logo.png` and `clg_campus.png`
3. Restart your dev server

### Error: "Module not found"

**Cause**: Folder structure or file names are incorrect.

**Solution**: 
- Verify folder path: `src/assets/` (NOT `src/Assets/` or `src/asset/`)
- Verify file names are exact: `clg_logo.png` and `clg_campus.png`

### Images not loading in browser

**Cause**: Vite might not have picked up the new assets.

**Solution**: 
1. Stop the dev server
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Restart: `npm run dev`

## ✨ Recommended Image Specs

### clg_logo.png
- **Type**: University/College Logo
- **Format**: PNG with transparent background (preferred)
- **Size**: 500x500px or similar square dimensions
- **Max file size**: < 500KB

### clg_campus.png
- **Type**: Campus building or university exterior
- **Format**: PNG or JPG
- **Size**: 1920x1080px or higher
- **Aspect ratio**: 16:9 (landscape)
- **Max file size**: < 2MB

## 🎯 Quick Check

Before restarting, ensure:
- [ ] `src/assets/` folder exists
- [ ] `clg_logo.png` file is in `src/assets/`
- [ ] `clg_campus.png` file is in `src/assets/`
- [ ] File names are exactly as specified (case-sensitive)
- [ ] TypeScript declaration file exists: `src/types/images.d.ts`

## 🚀 After Setup

Once you've added the images and restarted the dev server:

1. Navigate to the login page
2. You should see:
   - Campus building as full-screen background
   - College logo in the circular badge at the top of the login card
3. No TypeScript or module errors in the console

## 📌 Important Notes

- **Folder name must be exactly**: `assets` (not `Assets`, `asset`, or `ASSETS`)
- **The `@` alias**: Already configured in `vite.config.ts` to point to `/src`
- **TypeScript support**: Already configured via `src/types/images.d.ts`

---

**Need Help?** Make sure you're following the exact file paths and names as specified above.
