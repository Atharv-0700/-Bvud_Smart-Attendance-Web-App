# 📊 Google Sheets Integration Setup Guide

## 🎯 Overview

This guide explains **3 different methods** to integrate Google Sheets with your Smart Attendance app. Choose the one that fits your needs.

---

## 🔧 Method 1: Google Apps Script Web App (RECOMMENDED) ✅

This is the **easiest and most reliable** method. No API keys needed, no CORS issues.

### **Why This Method?**
- ✅ No CORS issues
- ✅ No complex authentication
- ✅ Works from any browser
- ✅ Free and simple
- ✅ Direct write access to sheets

### **Setup Steps:**

#### **Step 1: Create Google Apps Script**

1. Open your Google Sheet
2. Click **Extensions** → **Apps Script**
3. Delete any existing code
4. Paste this code:

```javascript
// Google Apps Script for Smart Attendance System
// This script receives attendance data and writes it to the spreadsheet

function doPost(e) {
  try {
    // Parse incoming data
    const data = JSON.parse(e.postData.contents);
    const spreadsheetId = data.spreadsheetId;
    const rowData = data.data;
    
    // Open the spreadsheet
    const sheet = SpreadsheetApp.openById(spreadsheetId).getActiveSheet();
    
    // Check if headers exist, if not, add them
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Date',
        'Time',
        'Subject',
        'Semester',
        'Student Name',
        'Roll Number',
        'Division',
        'Location'
      ]);
    }
    
    // Append the attendance data
    sheet.appendRow(rowData);
    
    return ContentService.createTextOutput(
      JSON.stringify({ success: true, message: 'Data added successfully' })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput('Smart Attendance - Google Sheets Integration Active');
}
```

#### **Step 2: Deploy as Web App**

1. Click **Deploy** → **New deployment**
2. Click the **gear icon** ⚙️ → Select **Web app**
3. Configure:
   - **Description:** Smart Attendance Integration
   - **Execute as:** Me (your email)
   - **Who has access:** Anyone
4. Click **Deploy**
5. **Copy the Web App URL** (looks like: `https://script.google.com/macros/s/ABC...XYZ/exec`)
6. Click **Authorize access** → Choose your Google account → Allow

#### **Step 3: Update Your App**

Open `/src/utils/googleSheets.ts` and replace this line:

```typescript
const webAppUrl = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
```

With your actual URL:

```typescript
const webAppUrl = 'https://script.google.com/macros/s/ABC...XYZ/exec';
```

#### **Step 4: Test**

1. Start a lecture as a teacher
2. Mark attendance as a student
3. Check your Google Sheet - data should appear automatically!

---

## 🔧 Method 2: Google Sheets API with API Key (Limited)

This method uses Google Sheets API v4 but has limitations:
- ⚠️ **READ-ONLY with API key alone**
- ❌ Write access requires OAuth 2.0
- ❌ CORS issues in browser

### **Setup Steps:**

#### **Step 1: Get API Key**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Sheets API**:
   - Click **APIs & Services** → **Library**
   - Search "Google Sheets API"
   - Click **Enable**
4. Create API Key:
   - Click **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **API Key**
   - Copy the API key

#### **Step 2: Configure in Your App**

Create a `.env` file in your project root:

```env
VITE_GOOGLE_SHEETS_API_KEY=AIzaSyD...your_api_key_here...xyz
```

#### **Step 3: Restrictions (Optional but Recommended)**

1. In Google Cloud Console → Credentials
2. Click on your API key
3. Under "API restrictions":
   - Select "Restrict key"
   - Choose "Google Sheets API"
4. Under "Application restrictions":
   - Select "HTTP referrers"
   - Add your domain (e.g., `https://yourdomain.com/*`)

### **Limitations:**
- ❌ Cannot write data (read-only)
- ❌ OAuth 2.0 required for write operations
- ⚠️ Not recommended for this use case

---

## 🔧 Method 3: Public Sheet with Direct Access (Quick & Dirty)

This is a **workaround** using a publicly editable sheet. **NOT SECURE!**

### **Setup:**

1. Create a Google Sheet
2. Click **Share** → **Anyone with the link**
3. Set permissions to **Editor**
4. Copy the URL
5. Paste in Teacher Settings

### **How it works:**
- Students open the sheet URL in background
- Data is manually appended via sheet formulas
- ⚠️ Very limited and unreliable

### **Why NOT to use this:**
- ❌ No automation
- ❌ Security risk (anyone can edit)
- ❌ No data validation
- ❌ Requires manual work

---

## 📍 Where to Put API Keys

### **Option A: Environment Variables (.env file)** ✅ RECOMMENDED

Create `.env` file in project root:

```env
# Google Sheets Integration
VITE_GOOGLE_SHEETS_API_KEY=AIzaSyD...your_key...xyz

# If using Web App method (no key needed)
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/ABC...XYZ/exec
```

Then access in code:
```typescript
const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
const webAppUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
```

### **Option B: Firebase Remote Config**

Store in Firebase and fetch at runtime:
```typescript
const remoteConfig = getRemoteConfig(app);
await fetchAndActivate(remoteConfig);
const apiKey = getValue(remoteConfig, 'google_sheets_api_key');
```

### **Option C: Hardcode in TeacherSettings (NOT RECOMMENDED)**

Only for testing:
```typescript
const WEB_APP_URL = 'https://script.google.com/...';
```

---

## 🎯 Recommended Setup Flow

### **For Teachers:**

1. **Create Google Sheet:**
   - Open Google Sheets
   - Create new sheet named "BCA Attendance - [Your Name]"

2. **Set up Apps Script:**
   - Follow Method 1 steps above
   - Deploy Web App
   - Copy Web App URL

3. **Configure in App:**
   - Open `/src/utils/googleSheets.ts`
   - Paste Web App URL
   - OR create `.env` file with URL

4. **Share Sheet URL in Settings:**
   - Copy Google Sheet URL
   - Paste in Teacher Settings page
   - (This is for reference/viewing, actual data writes via Apps Script)

### **For Developers:**

1. **Choose integration method** (Method 1 recommended)
2. **Update `/src/utils/googleSheets.ts`** with your Web App URL
3. **Integrate in QRScan component** (call `writeToGoogleSheet` after marking attendance)
4. **Test with real data**

---

## 🔗 Integration in Code

Update `/src/app/components/QRScan.tsx` to write to Google Sheets:

```typescript
import { writeToGoogleSheet } from '../../utils/googleSheets';
import { get } from 'firebase/database';

// After successfully marking attendance:
const handleQRCodeDetected = async (decodedText: string, locationData: any) => {
  try {
    // ... existing attendance marking code ...

    // ✅ Write to Google Sheets
    const teacherSettingsRef = ref(database, `teacherSettings/${teacherId}`);
    const settingsSnapshot = await get(teacherSettingsRef);
    
    if (settingsSnapshot.exists()) {
      const settings = settingsSnapshot.val();
      const sheetUrl = settings.googleSheetUrl;
      
      if (sheetUrl) {
        const attendanceData = {
          date: new Date().toLocaleDateString('en-IN'),
          time: new Date().toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          subject: subject,
          semester: semester.toString(),
          studentName: user.name,
          rollNumber: user.rollNumber || '',
          division: user.division || '',
          location: `${locationData.latitude}, ${locationData.longitude}`,
        };
        
        await writeToGoogleSheet(sheetUrl, attendanceData);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 📊 Expected Sheet Format

Your Google Sheet will have these columns:

| Date       | Time     | Subject          | Semester | Student Name | Roll No  | Division | Location         |
|------------|----------|------------------|----------|--------------|----------|----------|------------------|
| 25/12/2024 | 09:30 AM | Data Structures  | 3        | Rahul Sharma | BCA12345 | A        | 19.0458, 73.0149 |
| 25/12/2024 | 09:31 AM | Data Structures  | 3        | Priya Patel  | BCA12346 | A        | 19.0459, 73.0150 |
| 25/12/2024 | 11:00 AM | DBMS             | 5        | Amit Kumar   | BCA54321 | B        | 19.0460, 73.0148 |

---

## 🔐 Security Best Practices

### **✅ DO:**
- Use Google Apps Script Web App (Method 1)
- Store Web App URL in environment variables
- Use `.env` file for local development
- Add `.env` to `.gitignore`
- Use Firebase Remote Config for production
- Restrict API keys to specific domains

### **❌ DON'T:**
- Don't commit API keys to Git
- Don't make sheets publicly editable
- Don't hardcode secrets in source code
- Don't use Method 3 (public sheet) in production

---

## 🚨 Troubleshooting

### **Issue: "Script function not found: doPost"**
**Solution:** Make sure you deployed the script as a Web App, not just saved it.

### **Issue: "Permission denied"**
**Solution:** 
1. Redeploy the script
2. Choose "Execute as: Me"
3. Re-authorize access

### **Issue: "CORS error"**
**Solution:** Use Method 1 (Apps Script). Method 2 won't work due to browser CORS restrictions.

### **Issue: "Invalid spreadsheet ID"**
**Solution:** Check that the Google Sheets URL is in the correct format:
```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

### **Issue: "Data not appearing in sheet"**
**Solution:**
1. Check browser console for errors
2. Verify Web App URL is correct
3. Test the Web App URL directly in browser
4. Check Google Apps Script execution logs

---

## 📞 Support

### **For Google Apps Script issues:**
- [Apps Script Documentation](https://developers.google.com/apps-script)
- [Web Apps Guide](https://developers.google.com/apps-script/guides/web)

### **For Google Sheets API issues:**
- [Sheets API Documentation](https://developers.google.com/sheets/api)
- [API Key Setup Guide](https://cloud.google.com/docs/authentication/api-keys)

---

## 🎯 Quick Summary

| Method | Difficulty | Security | Works? | Recommended |
|--------|------------|----------|--------|-------------|
| **Apps Script Web App** | Easy | ✅ Good | ✅ Yes | ✅ **YES** |
| **Sheets API + Key** | Medium | ⚠️ Limited | ❌ Read-only | ❌ No |
| **Public Sheet** | Very Easy | ❌ Poor | ⚠️ Manual | ❌ No |

**→ Use Method 1 (Apps Script Web App) for best results!**

---

## ✅ Implementation Checklist

- [ ] Choose integration method (Method 1 recommended)
- [ ] Create Google Apps Script (if using Method 1)
- [ ] Deploy as Web App
- [ ] Copy Web App URL
- [ ] Update `/src/utils/googleSheets.ts`
- [ ] Create `.env` file (optional)
- [ ] Add `.env` to `.gitignore`
- [ ] Test with real attendance data
- [ ] Verify data appears in Google Sheet
- [ ] Configure for all teachers

---

**🎊 Once configured, attendance data will automatically sync to Google Sheets in real-time!**

*Last Updated: December 25, 2024*
