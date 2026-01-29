# 🎓 Smart Attendance System - Quick Deployment Guide

> A comprehensive QR-code-based attendance system for BCA students and teachers at Bharati Vidyapeeth University.

---

## 🚀 Quick Start (5 Minutes)

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev

# 3. Open in browser
# Visit: http://localhost:5173
```

The `.env` file is already configured with Firebase credentials.

---

## 🌐 Deploy to Production (10 Minutes)

### Option A: Deploy to Vercel (Recommended)

1. **Fork/Clone this repository**

2. **Sign up at [vercel.com](https://vercel.com)**

3. **Import project**:
   - Click "Add New Project"
   - Import from GitHub
   - Select this repository

4. **Add Environment Variables**:
   - Go to Settings → Environment Variables
   - Copy all variables from `.env` file
   - Add each one (see list below)

5. **Deploy**:
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your site is live! 🎉

### Environment Variables (Copy these to Vercel/Netlify):

```env
VITE_FIREBASE_API_KEY=AIzaSyDsUJYjyEiknudIm12nfPQXiSghJPFEGeg
VITE_FIREBASE_AUTH_DOMAIN=athgo-5b01d.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://athgo-5b01d-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=athgo-5b01d
VITE_FIREBASE_STORAGE_BUCKET=athgo-5b01d.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=991007865844
VITE_FIREBASE_APP_ID=1:991007865844:web:da47a8d0ef8be91e5317a1
VITE_FIREBASE_MEASUREMENT_ID=G-NYYBK3JQ7F
VITE_CAMPUS_LATITUDE=19.0434
VITE_CAMPUS_LONGITUDE=73.0618
VITE_CAMPUS_RADIUS=500
VITE_TEACHER_PROXIMITY_RADIUS=15
VITE_APP_NAME=Smart Attendance System
VITE_APP_UNIVERSITY=Bharati Vidyapeeth University
VITE_APP_DEPARTMENT=BCA Department
```

---

## 🔥 Firebase Setup (Required)

### Update Authorized Domains

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `athgo-5b01d`
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add your Vercel/Netlify domain:
   ```
   your-project-name.vercel.app
   ```
5. Click "Add domain"

**Done!** Your app will now work for all users.

---

## ✅ Testing Deployment

Visit your deployed URL and test:

- [ ] Login as student works
- [ ] Login as teacher works
- [ ] Registration works
- [ ] QR code generation works
- [ ] Camera access works (mobile)
- [ ] Location access works
- [ ] Data saves to Firebase
- [ ] Dark mode toggle works

---

## 🎯 Key Features

### For Students:
- ✅ QR code scanning for attendance
- ✅ Real-time attendance history
- ✅ Subject-wise attendance tracking
- ✅ Color-coded percentage (Green ≥75%, Yellow 70-74%, Red <70%)
- ✅ Device binding for security
- ✅ BCA syllabus access

### For Teachers:
- ✅ Dynamic QR code generation (5-10 min validity)
- ✅ Real-time attendance monitoring
- ✅ Dual geofencing (15m teacher + 500m campus)
- ✅ Google Sheets export
- ✅ Monthly reports
- ✅ Device management
- ✅ Student management

### Security Features:
- 🔒 Device fingerprinting
- 🔒 GPS-based geofencing
- 🔒 QR code expiration
- 🔒 Location validation
- 🔒 Anti-spoofing measures

---

## 📱 System Requirements

### For Students:
- Smartphone with camera
- GPS/Location enabled
- Modern browser (Chrome/Safari)
- Internet connection

### For Teachers:
- Desktop/Laptop for lecture management
- Smartphone for mobile monitoring
- GPS/Location enabled
- Modern browser

---

## 🏫 Campus Configuration

Default location: **Bharati Vidyapeeth University, Kharghar**

```
Latitude: 19.0434° N
Longitude: 73.0618° E
Campus Radius: 500 meters
Teacher Proximity: 15 meters
```

To change location, update these in `.env`:
```env
VITE_CAMPUS_LATITUDE=your_latitude
VITE_CAMPUS_LONGITUDE=your_longitude
```

---

## 📂 Project Structure

```
smart-attendance-system/
├── src/
│   ├── app/
│   │   ├── components/       # React components
│   │   │   ├── Login.tsx    # Login with glassmorphism
│   │   │   ├── StudentDashboard.tsx
│   │   │   ├── TeacherDashboard.tsx
│   │   │   └── QRScan.tsx
│   │   └── App.tsx          # Main app component
│   ├── config/
│   │   ├── firebase.ts      # Firebase configuration
│   │   └── env.ts           # Environment helper
│   ├── services/            # Business logic
│   ├── utils/               # Utility functions
│   └── styles/              # CSS and themes
├── .env                     # Environment variables (local)
├── .env.example             # Template for .env
├── vercel.json             # Vercel configuration
├── netlify.toml            # Netlify configuration
└── DEPLOYMENT_GUIDE.md     # Detailed deployment guide
```

---

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start dev server (port 5173)
npm run build           # Build for production
npm run preview         # Preview production build

# Testing
npm run lint            # Run ESLint
npm run type-check      # TypeScript type checking
```

---

## 🐛 Troubleshooting

### Blank Page After Deployment?

1. Check browser console for errors
2. Verify environment variables are added
3. Check Firebase authorized domains
4. Redeploy after adding env variables

### Firebase Connection Error?

1. Verify all `VITE_FIREBASE_*` variables are set
2. Check Firebase API key is correct
3. Ensure authorized domains include your deployment URL

### QR Code Not Working?

1. Enable HTTPS (automatic on Vercel/Netlify)
2. Grant camera and location permissions
3. Test on actual device (not emulator)

**Full troubleshooting guide**: See `DEPLOYMENT_GUIDE.md`

---

## 📚 Documentation

- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md)** - Environment variables setup
- **[START_HERE.md](./START_HERE.md)** - System architecture overview
- **[QUICK_START_DYNAMIC_CLASSES.md](./QUICK_START_DYNAMIC_CLASSES.md)** - Teacher class setup

---

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Authentication**: Firebase Auth
- **Database**: Firebase Realtime Database
- **Storage**: Firebase Storage
- **Deployment**: Vercel / Netlify
- **QR Codes**: qrcode.react
- **Location**: Browser Geolocation API

---

## 🎨 Design System

### Color Scheme:
- **Primary Blue**: #2563EB
- **Accent Cyan**: #06B6D4
- **Safe Green**: #22C55E
- **Warning Yellow**: #FACC15
- **Danger Red**: #EF4444

### Features:
- Light/Dark mode support
- Responsive design (mobile-first)
- Glassmorphism UI
- Smooth animations
- Accessible components

---

## 🤝 Support

Need help? Check these resources:

1. **Documentation**: Read all `.md` files in project root
2. **Firebase Console**: [console.firebase.google.com](https://console.firebase.google.com)
3. **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
4. **Netlify Docs**: [docs.netlify.com](https://docs.netlify.com)

---

## 📄 License

This project is built for educational purposes for BCA students at Bharati Vidyapeeth University.

---

## 🎉 Quick Win!

To deploy in 3 steps:

1. **Push to GitHub** (if not already)
2. **Import to Vercel** → Add env variables
3. **Update Firebase authorized domains**

**That's it! Your app is live! 🚀**

---

**Made with ❤️ for BVDU BCA Department**

**University**: Bharati Vidyapeeth University  
**Location**: Kharghar, Navi Mumbai  
**Department**: Bachelor of Computer Applications (BCA)
