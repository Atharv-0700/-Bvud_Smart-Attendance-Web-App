# Smart Attendance & Campus Assistant - Setup Guide

## 🔥 Firebase Backend Setup

Your Firebase configuration is already integrated! The application uses:
- **Firebase Authentication** for user login/registration
- **Firebase Realtime Database** for storing user data and attendance records

### Firebase Configuration
Located in: `/src/config/firebase.ts`

Your Firebase project is already configured with:
- **Project ID**: athgo-5b01d
- **Database URL**: https://athgo-5b01d-default-rtdb.firebaseio.com
- **Authentication**: Enabled

### Database Structure

The app automatically creates and manages the following structure in Firebase Realtime Database:

```
users/
  {userId}/
    name: "John Doe"
    email: "student@bvdu.edu"
    role: "student" | "teacher"
    semester: 3 (for students)
    subjects: ["Data Structures", "DBMS"] (for teachers)
    division: "A" (optional)
    department: "BCA" (for teachers)
    createdAt: "2024-01-01T00:00:00.000Z"

lectures/
  {lectureId}/
    teacherId: "userId123"
    teacherName: "Dr. Sarah Smith"
    subject: "Data Structures"
    semester: 3
    timestamp: "2024-01-01T10:00:00.000Z"
    active: true
    expiresAt: "2024-01-01T10:02:00.000Z"
    students:
      {studentId}:
        studentId: "userId456"
        studentName: "John Doe"
        studentEmail: "student@bvdu.edu"
        markedAt: "2024-01-01T10:01:00.000Z"

studentAttendance/
  {studentId}/
    {lectureId}:
      subject: "Data Structures"
      semester: 3
      teacherId: "userId123"
      teacherName: "Dr. Sarah Smith"
      timestamp: "2024-01-01T10:01:00.000Z"
      lectureDate: "2024-01-01T10:00:00.000Z"
```

## 🤖 Gemini AI Setup

### Step 1: Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API Key"
4. Create a new API key or copy an existing one

### Step 2: Configure the API Key

Open `/src/config/gemini.ts` and replace the placeholder:

```typescript
export const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';
```

With your actual API key:

```typescript
export const GEMINI_API_KEY = 'AIzaSy...your-actual-key-here';
```

### Gemini API Features

The Campus Assistant uses Gemini AI to:
- Answer student queries about attendance, syllabus, and exams
- Provide personalized responses based on user role and semester
- Give helpful information about BVDU BCA department
- Assist with campus-related questions

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Configure Firebase Rules (Important!)

Go to your [Firebase Console](https://console.firebase.google.com/project/athgo-5b01d/database) and set up the following rules:

**Realtime Database Rules:**
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "attendance": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

**Authentication:**
- Enable Email/Password authentication in Firebase Console
- Go to: Authentication > Sign-in method > Email/Password > Enable

### 3. Add Your Gemini API Key

Edit `/src/config/gemini.ts` and add your API key (see above)

### 4. Run the Application

```bash
npm run dev
# or
pnpm run dev
```

### 5. Test the Application

**Student Account:**
1. Register with email: `student@bvdu.edu` (or any email)
2. Select semester and create account
3. Login and explore features

**Teacher Account:**
1. Register with email: `teacher@bvdu.edu` (or any email)
2. Select subjects you teach
3. Login and start lectures

## ✨ Features Enabled

### With Firebase:
- ✅ **User Registration & Login** - Secure authentication
- ✅ **Profile Management** - Store and retrieve user data
- ✅ **Attendance Storage** - Persistent attendance records
- ✅ **Real-time Updates** - Live data synchronization
- ✅ **Role-based Access** - Separate student/teacher accounts

### With Gemini AI:
- ✅ **AI Campus Assistant** - Intelligent Q&A system
- ✅ **Context-Aware Responses** - Personalized based on user role
- ✅ **BCA Knowledge Base** - Information about syllabus, exams, etc.
- ✅ **Fallback System** - Works even if API is unavailable

## 🔒 Security Notes

**Important:**
- Never commit your Gemini API key to version control
- Keep your Firebase configuration secure
- Use environment variables for production deployments
- Regularly review Firebase security rules

## 📱 Features Overview

### For Students:
- 📊 Dashboard with attendance overview
- 📷 QR Code scanning for attendance
- 📈 Attendance history with color-coded percentages
- 📚 BCA syllabus for all semesters
- 🤖 AI-powered campus assistant

### For Teachers:
- 📊 Dashboard with class statistics
- 🎓 Start lecture and generate QR codes
- 📈 Attendance reports and analytics
- 📚 BCA syllabus reference
- 🤖 AI-powered campus assistant

### Color-Coded Attendance:
- 🟢 Green: ≥75% (Safe)
- 🟡 Yellow: 70-74% (Warning)
- 🔴 Red: <70% (Danger)

## 🌙 Additional Features

- 🎨 **Dark Mode** - Toggle between light and dark themes
- 📱 **Responsive Design** - Works on all devices
- 🔔 **Toast Notifications** - Real-time feedback
- 🎯 **Collapsible Sidebar** - Space-efficient navigation

## 🆘 Troubleshooting

### Firebase Authentication Issues:
- Check if Email/Password is enabled in Firebase Console
- Verify your Firebase configuration in `/src/config/firebase.ts`
- Clear browser cache and try again

### Gemini API Issues:
- Verify your API key is correct
- Check if you have API quota remaining
- The app has fallback responses if API fails

### Build Errors:
- Delete `node_modules` and reinstall: `npm install`
- Clear cache: `npm cache clean --force`
- Update dependencies: `npm update`

## 📞 Support

For issues related to:
- **Firebase**: [Firebase Documentation](https://firebase.google.com/docs)
- **Gemini AI**: [Google AI Documentation](https://ai.google.dev/docs)
- **React/Vite**: [Vite Documentation](https://vitejs.dev/)

---

Made with ❤️ for BVDU BCA Students & Teachers