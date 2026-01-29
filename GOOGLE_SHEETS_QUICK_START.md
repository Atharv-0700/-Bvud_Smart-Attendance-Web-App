# 📊 Google Sheets Integration - Quick Start Guide

## 🎯 Where to Put API Keys / Web App URL

### **RECOMMENDED: Google Apps Script Web App (No API Key Needed!)**

You **DON'T need an API key** for the recommended method. Here's what to do:

---

## ✅ 5-Minute Setup (Easiest Method)

### **Step 1: Open Your Google Sheet**
1. Create a new Google Sheet or open existing one
2. Name it: "BCA Attendance - [Teacher Name]"

### **Step 2: Open Apps Script Editor**
1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete any existing code in the editor

### **Step 3: Paste This Code**

Copy and paste this EXACT code:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const spreadsheetId = data.spreadsheetId;
    const rowData = data.data;
    
    const sheet = SpreadsheetApp.openById(spreadsheetId).getActiveSheet();
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Date', 'Time', 'Subject', 'Semester', 'Student Name', 'Roll Number', 'Division', 'Location']);
    }
    
    sheet.appendRow(rowData);
    
    return ContentService.createTextOutput(
      JSON.stringify({ success: true })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

### **Step 4: Deploy as Web App**

1. Click **Deploy** button (top right) → **New deployment**
2. Click the **gear icon** ⚙️  next to "Select type"
3. Select **Web app**
4. Configure:
   - Description: `Smart Attendance`
   - Execute as: **Me (your-email@gmail.com)**
   - Who has access: **Anyone**
5. Click **Deploy**
6. Click **Authorize access**
7. Choose your Google account
8. Click **Advanced** → **Go to Smart Attendance (unsafe)** → **Allow**
9. **COPY THE WEB APP URL** (it looks like this):
   ```
   https://script.google.com/macros/s/AKfycby...xyz/exec
   ```

### **Step 5: Configure in Your App**

Open this file: `/src/utils/googleSheets.ts`

Find this line:
```typescript
const webAppUrl = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
```

Replace it with YOUR Web App URL:
```typescript
const webAppUrl = 'https://script.google.com/macros/s/AKfycby...xyz/exec';
```

**Save the file!**

---

## 🎉 That's It! Test It:

1. **Teacher:** Start a lecture
2. **Student:** Scan QR code
3. **Check Google Sheet:** Data should appear automatically!

---

## 📍 Alternative: Using .env File (Optional)

If you prefer using environment variables:

### **Create `.env` file in project root:**

```env
# Google Apps Script Web App URL
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_WEB_APP_ID/exec
```

### **Update `/src/utils/googleSheets.ts`:**

```typescript
const webAppUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
```

### **Add to `.gitignore`:**

```
.env
.env.local
```

---

## 🚨 Common Issues & Solutions

### **Issue: "Script function not found: doPost"**
**Solution:** 
1. Make sure you deployed as **Web app** (not just saved the script)
2. Redeploy if needed

### **Issue: "Permission denied"**
**Solution:**
1. Go back to Apps Script
2. Click **Deploy** → **Manage deployments**
3. Click edit (pencil icon)
4. Make sure "Execute as" is set to **Me**
5. Make sure "Who has access" is set to **Anyone**
6. Click **Deploy**

### **Issue: "Data not appearing in sheet"**
**Solution:**
1. Open browser console (F12)
2. Look for Google Sheets errors
3. Verify Web App URL is correct
4. Test Web App URL in browser - you should see: "Smart Attendance - Google Sheets Integration Active"

### **Issue: "Invalid spreadsheet ID"**
**Solution:**
- Make sure teacher has entered Google Sheets URL in Teacher Settings
- URL format should be: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

---

## 📊 Expected Result

After a student scans QR code, your Google Sheet should automatically show:

| Date       | Time     | Subject         | Semester | Student Name | Roll No  | Division | Location         |
|------------|----------|-----------------|----------|--------------|----------|----------|------------------|
| 25/12/2024 | 09:30 AM | Data Structures | 3        | Rahul Sharma | BCA12345 | A        | 19.0458, 73.0149 |

---

## 🔐 Security Notes

- ✅ Web App URL is public but can only write to YOUR sheet
- ✅ Students can't access or modify the Apps Script code
- ✅ Sheet permissions are managed by Google
- ✅ No API keys exposed

---

## 💡 Pro Tips

1. **One Apps Script per teacher:**
   - Each teacher sets up their own Apps Script
   - Each teacher has their own Web App URL
   - All teachers can use the same code

2. **Share sheet URL in Teacher Settings:**
   - After setup, paste Google Sheets URL in Teacher Settings
   - This is for viewing/reference
   - Actual data writes happen via Apps Script

3. **Multiple sheets:**
   - You can have one sheet per semester
   - Or one sheet per subject
   - Just deploy Apps Script for each sheet

---

## 📞 Need Help?

### **Still stuck? Check:**
1. Did you deploy as **Web app** (not just save)?
2. Did you set "Who has access" to **Anyone**?
3. Did you copy the **FULL** Web App URL?
4. Did you update `/src/utils/googleSheets.ts` with the URL?
5. Did you save the file after updating?

### **Test your Web App:**
1. Copy your Web App URL
2. Paste it in browser
3. You should see: "Smart Attendance - Google Sheets Integration Active"
4. If you see this, integration is working!

---

## ✅ Checklist

- [ ] Created Google Sheet
- [ ] Opened Apps Script editor
- [ ] Pasted the code
- [ ] Deployed as Web App
- [ ] Set "Execute as: Me"
- [ ] Set "Who has access: Anyone"
- [ ] Authorized access
- [ ] Copied Web App URL
- [ ] Updated `/src/utils/googleSheets.ts`
- [ ] Saved the file
- [ ] Tested with real attendance

---

**🎊 Once complete, attendance data will automatically sync to Google Sheets!**

**No API keys needed! No complex setup! Just works!** ✨

*Last Updated: December 25, 2024*
