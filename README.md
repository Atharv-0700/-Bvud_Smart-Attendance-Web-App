# Smart Attendance Web App

## 📚 Introduction

**Smart Attendance System** is a comprehensive, role-based college web application designed specifically for BCA students and teachers at **Bharati Vidyapeeth University (BVDU)**. The system digitizes and automates attendance management through QR code-based scanning with geofencing technology, ensuring accurate, secure, and real-time attendance tracking.

This modern web application provides separate login flows and dashboards for Students, Teachers, and Admins, with features including subject-wise attendance tracking, eligibility verification based on BVDU's 75% attendance rule, automated report generation, and complete BCA syllabus access.

---

## 🎯 Problem Statement

Traditional attendance systems in colleges face several challenges:

- **Manual attendance** is time-consuming and prone to errors
- **Proxy attendance** is a persistent issue affecting attendance integrity
- **Paper-based records** are difficult to manage, store, and retrieve
- **Lack of real-time tracking** prevents students from monitoring their attendance status
- **Manual calculation** of attendance percentages is tedious for teachers
- **Delayed reports** hinder timely intervention for at-risk students
- **Eligibility verification** for semester exams requires manual checking against university rules

These inefficiencies result in wasted time, inaccurate records, and poor student accountability.

---

## 💡 Solution Overview

The Smart Attendance Web App addresses these challenges by providing:

- **QR Code-Based Attendance**: Teachers generate time-limited QR codes (valid for 5-10 minutes) that students scan to mark attendance
- **Geofencing Technology**: Location validation ensures students are physically present within the BVDU campus radius (Kharghar, Belpada, Sector 3)
- **Real-Time Tracking**: Instant attendance updates with color-coded status indicators (Green ≥75%, Yellow 70-74%, Red <70%)
- **Subject-Wise Tracking**: Separate attendance records for each subject with detailed analytics
- **Automated Reports**: Generate monthly and semester reports in Excel and PDF formats
- **Eligibility System**: Automatic calculation of semester exam eligibility based on 75% attendance rule
- **Student Management**: Complete admin interface for managing student records
- **Secure Authentication**: Role-based access control with device security features
- **BCA Syllabus Access**: Complete semester-wise syllabus (Semesters 1-6) available to students

---

## ✨ Features

### For Students
- 🔐 **Secure Login & Registration** with student ID validation
- 📱 **QR Code Scanning** to mark attendance with geolocation verification
- 📊 **Subject-Wise Attendance Dashboard** with color-coded percentages
- 📈 **Real-Time Attendance Status** (Total/Attended/Absent/Percentage)
- ⚠️ **Eligibility Alerts** based on 75% minimum attendance rule
- 📄 **Monthly & Semester Reports** download in PDF format
- 📚 **Complete BCA Syllabus** organized by semesters 1-6
- 🌓 **Dark Mode Support** for comfortable viewing

### For Teachers
- 🔐 **Secure Teacher Login** with role-based access
- 🎯 **QR Code Generation** with time-limited validity (5-10 minutes)
- 📋 **Attendance Management** by subject and lecture
- 👥 **Student List View** with attendance records
- 📊 **Class Analytics** and attendance statistics
- 📑 **Report Generation** for university submission (Excel/PDF)
- 🔔 **Low Attendance Alerts** for at-risk students
- ⚙️ **Subject & Class Management**

### For Admin
- 👨‍💼 **Complete Admin Dashboard** with system overview
- 👤 **Student Management** (Add/View/Edit/Delete)
- 📤 **Bulk Student Upload** from Excel/CSV files
- 📊 **System Analytics** and usage statistics
- 🔒 **Device Security Management**
- 📁 **Database Management** with real-time updates
- 🎓 **Subject & Semester Configuration**
- 📈 **Export Reports** for all students and subjects

### General Features
- 🔒 **Secure Authentication** with Firebase
- 🌐 **Real-Time Database** synchronization
- 📱 **Responsive Design** for mobile and desktop
- 🎨 **Professional UI** with BVDU color scheme
- 🌓 **Light & Dark Mode** toggle
- 🔔 **Push Notifications** for attendance updates
- 📊 **Data Visualization** with charts and graphs
- 💾 **Cloud Backup** and data security

---

## 🛠️ Tech Stack

### Frontend
- **React.js** (v18+) - UI library for building interactive interfaces
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework for styling
- **Lucide React** - Icon library for modern UI elements
- **React Router** - Client-side routing and navigation
- **Recharts** - Data visualization and chart components

### Backend & Database
- **Firebase Realtime Database** - Cloud-hosted NoSQL database for real-time data
- **Firebase Authentication** - Secure user authentication and authorization
- **Firebase Storage** - Cloud storage for files and documents

### Additional Libraries
- **react-qr-code** - QR code generation for attendance
- **html5-qrcode** - QR code scanning functionality
- **jsPDF** - PDF report generation
- **xlsx** - Excel file generation and parsing
- **date-fns** - Date manipulation and formatting

### Deployment & Hosting
- **Vercel** - Cloud platform for frontend deployment
- **Firebase Hosting** - Alternative hosting option
- **Git & GitHub** - Version control and collaboration

---

## 💻 System Requirements

### For Development
- **Node.js**: v16.0.0 or higher
- **npm**: v8.0.0 or higher (or **pnpm**/**yarn**)
- **Git**: Latest version
- **Modern Web Browser**: Chrome, Firefox, Safari, or Edge (latest version)
- **Code Editor**: VS Code recommended
- **Operating System**: Windows 10+, macOS 10.15+, or Linux

### For Users
- **Modern Web Browser** with JavaScript enabled
- **Internet Connection** (minimum 2 Mbps)
- **Camera Access** (for QR code scanning on mobile/laptop)
- **Location Services** enabled for geofencing verification
- **Screen Resolution**: Minimum 360x640 (mobile) or 1024x768 (desktop)

---

## 📥 Installation Steps

### Prerequisites
Ensure you have Node.js and npm installed on your system.

```bash
# Check Node.js version
node --version

# Check npm version
npm --version
```

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/smart-attendance-web-app.git
cd smart-attendance-web-app
```

### Step 2: Install Dependencies
```bash
# Using npm
npm install

# OR using pnpm (faster)
pnpm install

# OR using yarn
yarn install
```

### Step 3: Configure Environment Variables
Create a `.env` file in the root directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Geofencing Configuration
VITE_CAMPUS_LATITUDE=19.0434
VITE_CAMPUS_LONGITUDE=73.0618
VITE_CAMPUS_RADIUS_METERS=500

# QR Code Configuration
VITE_QR_CODE_VALIDITY_MINUTES=10
```

### Step 4: Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing project
3. Enable **Realtime Database** and set security rules
4. Enable **Authentication** (Email/Password method)
5. Copy configuration details to `.env` file

### Step 5: Database Initialization
The app will automatically create the required database structure on first run. Alternatively, you can import the sample data:

```bash
# Import sample data (if provided)
npm run import-data
```

---

## 🚀 How to Run Locally

### Development Mode
```bash
# Start development server
npm run dev

# The app will open at http://localhost:5173
```

### Production Build
```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

### Testing
```bash
# Run tests (if configured)
npm run test

# Run tests with coverage
npm run test:coverage
```

---

## 🌐 How to Deploy

### Deploy to Vercel (Recommended)

#### Method 1: Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

#### Method 2: GitHub Integration
1. Push your code to GitHub repository
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Import Project"
4. Select your GitHub repository
5. Configure environment variables in Vercel settings
6. Click "Deploy"

### Deploy to Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase
firebase init hosting

# Build the project
npm run build

# Deploy
firebase deploy --only hosting
```

### Environment Variables Configuration

For deployment, add all environment variables from `.env` file to your hosting platform:

**Vercel**: Settings → Environment Variables
**Firebase**: Use Firebase Console for configuration

---

## 📁 Folder Structure

```
smart-attendance-web-app/
├── public/                      # Static assets
│   ├── favicon.ico
│   └── index.html
├── src/                         # Source code
│   ├── app/                     # Main application
│   │   ├── components/          # Reusable components
│   │   │   ├── admin/           # Admin components
│   │   │   ├── student/         # Student components
│   │   │   ├── teacher/         # Teacher components
│   │   │   ├── common/          # Shared components
│   │   │   └── auth/            # Authentication components
│   │   ├── App.tsx              # Main app component
│   │   └── main.tsx             # App entry point
│   ├── styles/                  # CSS and styling
│   │   ├── theme.css            # Theme variables
│   │   └── fonts.css            # Font imports
│   ├── utils/                   # Utility functions
│   │   ├── firebase.ts          # Firebase configuration
│   │   ├── geolocation.ts       # Geofencing logic
│   │   └── helpers.ts           # Helper functions
│   ├── types/                   # TypeScript type definitions
│   └── config/                  # App configuration
├── docs/                        # Documentation files
│   ├── README.md
│   ├── blueprint.ms
│   └── USER_GUIDE.md
├── .env                         # Environment variables (not committed)
├── .env.example                 # Example environment file
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind CSS configuration
└── vercel.json                  # Vercel deployment config
```

---

## 🔐 Environment Variables

Create a `.env` file with the following variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase API key | `AIzaSyC...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `project.firebaseapp.com` |
| `VITE_FIREBASE_DATABASE_URL` | Firebase database URL | `https://project.firebaseio.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `smart-attendance-bvdu` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | `project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | `1:123:web:abc` |
| `VITE_CAMPUS_LATITUDE` | Campus location latitude | `19.0434` |
| `VITE_CAMPUS_LONGITUDE` | Campus location longitude | `73.0618` |
| `VITE_CAMPUS_RADIUS_METERS` | Geofence radius in meters | `500` |
| `VITE_QR_CODE_VALIDITY_MINUTES` | QR code validity duration | `10` |

**⚠️ Important**: Never commit the `.env` file to version control. Use `.env.example` as a template.

---

## 📸 Screenshots

### Student Dashboard
![Student Dashboard](./screenshots/student-dashboard.png)
*Color-coded attendance tracking with subject-wise breakdown*

### Teacher QR Generation
![Teacher QR Code](./screenshots/teacher-qr.png)
*Time-limited QR code generation for attendance marking*

### Admin Panel
![Admin Panel](./screenshots/admin-panel.png)
*Comprehensive student management and analytics*

### Attendance Reports
![Reports](./screenshots/reports.png)
*Excel and PDF report generation for university submission*

### BCA Syllabus
![Syllabus](./screenshots/syllabus.png)
*Complete semester-wise syllabus access for BCA students*

### Mobile View
![Mobile Responsive](./screenshots/mobile-view.png)
*Fully responsive design for mobile devices*

---

## 🚀 Future Scope

### Planned Features
- 📧 **Email Notifications** for low attendance alerts
- 📲 **Mobile App** (React Native) for iOS and Android
- 🤖 **AI-Powered Analytics** for attendance prediction
- 📊 **Advanced Reporting** with custom filters and exports
- 🔔 **Parent Portal** for attendance monitoring
- 💬 **Chat System** for student-teacher communication
- 📅 **Timetable Integration** with automatic attendance scheduling
- 🎓 **Multi-University Support** beyond BVDU
- 🔗 **LMS Integration** with existing learning management systems
- 📱 **Biometric Authentication** for enhanced security

### Technical Enhancements
- 🔄 **Offline Mode** with data synchronization
- 🌍 **Multi-Language Support** (Hindi, Marathi, etc.)
- ⚡ **Performance Optimization** with lazy loading
- 🧪 **Comprehensive Testing** (Unit, Integration, E2E)
- 📦 **PWA Support** for installable web app
- 🔐 **Two-Factor Authentication** (2FA)
- 📈 **Real-Time Analytics Dashboard** for admins
- 🎨 **Customizable Themes** per institution

### Integration Possibilities
- 🏫 **University ERP Systems**
- 📚 **Library Management Systems**
- 💰 **Fee Payment Gateways**
- 🎯 **Placement Management Systems**
- 📝 **Examination Systems**

---

## 📄 License

This project is developed as an academic project for **Bharati Vidyapeeth University, Kharghar**.

**MIT License**

Copyright (c) 2026 Smart Attendance System Team

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## 👥 Contributors

- **Development Team**: BCA Students, Bharati Vidyapeeth University
- **Project Guide**: [Faculty Name]
- **Institution**: Bharati Vidyapeeth University, Kharghar, Navi Mumbai

---

## 📞 Contact & Support

For queries, issues, or contributions:

- 📧 **Email**: smartattendance@bvdu.edu.in
- 🌐 **Website**: [https://smart-attendance-bvdu.vercel.app](https://smart-attendance-bvdu.vercel.app)
- 💬 **GitHub Issues**: [Report a Bug](https://github.com/yourusername/smart-attendance-web-app/issues)
- 📚 **Documentation**: [Full Docs](./docs/)

---

## 🙏 Acknowledgments

- **Bharati Vidyapeeth University** for institutional support
- **Firebase** for backend infrastructure
- **Vercel** for hosting and deployment
- **React & Vite** communities for excellent documentation
- All faculty members and students who provided feedback

---

**Made with ❤️ for Bharati Vidyapeeth University**

**Last Updated**: January 26, 2026
