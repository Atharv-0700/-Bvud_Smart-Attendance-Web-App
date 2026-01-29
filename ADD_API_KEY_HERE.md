# 🔑 Add Your Firebase API Key

## Quick Setup (1 minute)

Your Firebase configuration is ready! Just add your API key:

### Step 1: Open the Firebase Config File
```
📁 /src/config/firebase.ts
```

### Step 2: Add Your API Key (Line 13)
Find this line:
```typescript
apiKey: "", // Add your API key here
```

Replace the empty string with your API key:
```typescript
apiKey: "YOUR_ACTUAL_API_KEY_HERE",
```

### Step 3: Save and Preview
The app will automatically reload and connect to Firebase!

---

## ✅ Current Configuration Status

Your Firebase project is already configured:
- ✅ **Auth Domain**: athgo-5b01d.firebaseapp.com
- ✅ **Database URL**: https://athgo-5b01d-default-rtdb.firebaseio.com
- ✅ **Project ID**: athgo-5b01d
- ✅ **Storage Bucket**: athgo-5b01d.firebasestorage.app
- ✅ **Messaging Sender ID**: 991007865844
- ✅ **App ID**: 1:991007865844:web:da47a8d0ef8be91e5317a1
- ✅ **Measurement ID**: G-NYYBK3JQ7F
- ⚠️ **API Key**: *Waiting for you to add*

---

## 🔍 Where to Find Your API Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Open your project: **athgo-5b01d**
3. Click the ⚙️ gear icon → **Project settings**
4. Scroll down to "Your apps" section
5. Find the Web App with App ID ending in `5317a1`
6. Click "Config" to reveal the `firebaseConfig` object
7. Copy the `apiKey` value

---

## 🚀 After Adding the API Key

Once you add the API key and save, you'll see:
```
✅ Firebase initialized successfully
✅ Firebase Analytics initialized
🔒 Enterprise Security: ACTIVE
```

Then you can:
- ✅ Login as Student/Teacher/Admin
- ✅ Scan QR codes for attendance
- ✅ Track attendance with geofencing
- ✅ Generate reports
- ✅ Upload profile photos
- ✅ Access all features

---

## 📝 Test Credentials

### Student Login
- **Email**: student@bvdu.edu
- **Password**: student123
- **Roll Number**: BCA22001

### Teacher Login
- **Email**: teacher@bvdu.edu  
- **Password**: teacher123

### Admin Login
- **Email**: admin@bvdu.edu
- **Password**: admin123

---

## 🎯 Next Steps

1. Add API key to `/src/config/firebase.ts` (line 13)
2. Save the file
3. Preview the application
4. Login with test credentials
5. Start using the Smart Attendance System!

---

## ⚠️ Important Notes

- **Security**: The API key is safe to include in frontend code. Firebase uses security rules to protect your data.
- **GitHub**: If you want to hide it from GitHub, you can use environment variables instead (see DEPLOYMENT guides).
- **No `.env` file needed**: We're using direct configuration for simplicity.

---

**Need Help?** Check the console for detailed error messages or refer to the 11 deployment guides in the root folder.
