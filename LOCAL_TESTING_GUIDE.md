# Smart Attendance System - Local Testing Guide

This guide will help you test the Smart Attendance System locally on your computer with zero errors.

## Prerequisites

- Node.js (v18 or higher) - [Download here](https://nodejs.org/)
- npm or pnpm package manager
- A Firebase project - [Create one here](https://console.firebase.google.com/)

## Step 1: Install Dependencies

```bash
# Using npm
npm install

# OR using pnpm (recommended)
pnpm install
```

## Step 2: Configure Firebase

### Option A: Direct Configuration (Currently Active)

Your Firebase configuration is already set up directly in `/src/config/firebase.ts` at line 13. The API key is already added.

**Current Firebase Config:**
- Project ID: `athgo-5b01d`
- API Key: Already configured
- Database URL: `https://athgo-5b01d-default-rtdb.firebaseio.com`

### Option B: Environment Variables (Alternative Method)

If you prefer using environment variables instead:

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and add your Firebase credentials
3. Comment out the direct config in `/src/config/firebase.ts` and use the env config instead

## Step 3: Set Up Firebase Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`athgo-5b01d`)
3. Navigate to **Realtime Database**
4. Click **Create Database** (if not already created)
5. Start in **test mode** for development

### Import Security Rules

Copy the rules from `/firebase-database-rules.json` and paste them in:
- Firebase Console > Realtime Database > Rules tab

## Step 4: Set Up Firebase Storage (for profile photos)

1. In Firebase Console, go to **Storage**
2. Click **Get Started**
3. Start in **test mode** for development
4. Copy rules from `/firebase-storage-rules.txt` and paste in Storage > Rules tab

## Step 5: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **Get Started**
3. Enable **Email/Password** authentication
4. (Optional) Enable **Google** sign-in

## Step 6: Run the Development Server

```bash
# Using npm
npm run dev

# OR using pnpm
pnpm dev
```

The app will start at `http://localhost:5173` (or another port if 5173 is busy)

## Step 7: Test the Application

### Create Test Accounts

#### For Students:
1. Open the app in your browser
2. Go to the **Student** tab
3. Click **Register**
4. Fill in the form:
   - Email: `test.student@example.com`
   - Password: `password123`
   - Name: `Test Student`
   - Semester: `1`
   - Division: `A`
   - Roll Number: `101`
5. Click **Register**

#### For Teachers:
1. Navigate to `/teacher-registration` in your browser
2. Fill in the form:
   - Email: `test.teacher@example.com`
   - Password: `password123`
   - Name: `Test Teacher`
   - Select subjects to teach
3. Click **Register**

### Test Core Features

1. **Student Login**
   - Log in with student credentials
   - View dashboard
   - Check attendance history

2. **Teacher Login**
   - Log in with teacher credentials
   - Select class (BCA Sem 1 Div A, etc.)
   - Start a lecture
   - Generate QR code

3. **QR Scanning**
   - Log in as student
   - Click "Scan QR" in navigation
   - Allow camera permissions
   - Scan the teacher's QR code

## Common Issues & Solutions

### Issue: "Firebase not initialized"

**Solution:** Make sure your Firebase API key is correctly added in `/src/config/firebase.ts` at line 13.

### Issue: "Permission denied" errors

**Solution:** 
1. Check that Firebase Realtime Database rules are correctly set up
2. Make sure Authentication is enabled
3. Verify that you're logged in with a valid account

### Issue: Camera not working for QR scan

**Solution:**
1. Make sure you're accessing the app via HTTPS or localhost (HTTP won't work)
2. Grant camera permissions when prompted by browser
3. Check browser console for camera-related errors

### Issue: TypeScript errors

**Solution:** Run type-check to see detailed errors:
```bash
npm run type-check
```

### Issue: Build errors

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Or with pnpm
rm -rf node_modules
pnpm install
```

### Issue: Port already in use

**Solution:** The dev server will automatically try the next available port (5174, 5175, etc.)

## Building for Production

```bash
# Build the project
npm run build

# Preview the production build locally
npm run preview
```

The built files will be in the `/dist` directory.

## Environment Variables for Production

When deploying to production (Vercel, Netlify, etc.), make sure to add these environment variables in your hosting platform's settings:

### Required Variables:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### Optional Variables:
- `VITE_FIREBASE_MEASUREMENT_ID`
- Campus location settings (use defaults if not specified)
- Google Sheets integration settings

## Testing Checklist

Use this checklist to ensure everything works:

- [ ] App starts without errors
- [ ] Student registration works
- [ ] Teacher registration works
- [ ] Student login successful
- [ ] Teacher login successful
- [ ] Student dashboard displays correctly
- [ ] Teacher dashboard displays correctly
- [ ] Teacher can start a lecture
- [ ] QR code is generated
- [ ] Student can scan QR code
- [ ] Attendance is recorded
- [ ] Attendance history shows data
- [ ] Profile photo upload works
- [ ] Theme toggle (light/dark) works
- [ ] All navigation links work
- [ ] No console errors
- [ ] No TypeScript errors

## Project Structure

```
smart-attendance-system/
├── src/
│   ├── app/
│   │   ├── App.tsx              # Main app component
│   │   └── components/          # React components
│   ├── config/
│   │   └── firebase.ts          # Firebase configuration
│   ├── services/                # Business logic services
│   ├── utils/                   # Utility functions
│   ├── types/                   # TypeScript type definitions
│   ├── styles/                  # CSS styles
│   └── main.tsx                 # Entry point
├── public/                      # Static assets
├── index.html                   # HTML template
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── vite.config.ts               # Vite config
└── .env.example                 # Environment variables template
```

## Need Help?

If you encounter any issues:

1. Check the browser console for errors
2. Review the Firebase Console for authentication/database issues
3. Ensure all dependencies are installed correctly
4. Verify Firebase configuration is correct
5. Check that your Firebase project has the correct security rules set up

## Next Steps: Deploying to Vercel

Once local testing is complete and error-free, you can deploy to Vercel:

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables in Vercel settings
6. Click "Deploy"

For detailed deployment instructions, see the deployment guides in the `/guidelines` folder.

---

**Current Status:** ✅ Zero critical errors, ready for local testing and deployment

**Last Updated:** January 2026
