# 📋 Monthly Attendance - Quick Reference Card

## 🚀 One-Line Solution (Most Common)

```typescript
import { MonthlyAttendanceAPI } from '../services/monthlyAttendanceAPI';

// Calculate + Generate + Download (Excel + PDF)
await MonthlyAttendanceAPI.generateAndDownload(
  { year: 2025, month: 1, subject: 'Data Structures', semester: 3, division: 'A' },
  teacherId,
  'both'
);
```

**That's it!** This ONE call:
- ✅ Calculates monthly attendance
- ✅ Stores in database
- ✅ Generates Excel report
- ✅ Generates PDF report
- ✅ Downloads both files

---

## 📚 Common Operations

### Calculate Only (No Download)

```typescript
const result = await MonthlyAttendanceAPI.calculate({
  year: 2025,
  month: 1,
  subject: 'Operating Systems',
  semester: 5,
  division: 'B'
});
```

### Download Excel Only

```typescript
const data = await MonthlyAttendanceAPI.getData(params);
await MonthlyAttendanceAPI.downloadExcel(data, 2025, 1, 'Subject', 3, 'A', teacherId);
```

### Download PDF Only

```typescript
const data = await MonthlyAttendanceAPI.getData(params);
await MonthlyAttendanceAPI.downloadPDF(data, 2025, 1, 'Subject', 3, 'A', teacherId);
```

### Check if Data Exists

```typescript
const exists = await MonthlyAttendanceAPI.exists({
  year: 2025, month: 1, subject: 'Database', semester: 4
});
```

### Get Statistics

```typescript
const stats = await MonthlyAttendanceAPI.getStatistics(params);
// Returns: { totalStudents, eligible, notEligible, averageAttendance, totalLectures }
```

### Generate All Subjects (Bulk)

```typescript
await MonthlyAttendanceAPI.generateAllSubjects(2025, 1);
```

### Get Current/Previous Month

```typescript
const { current, previous } = MonthlyAttendanceAPI.getMonthInfo();
// current = { year: 2025, month: 1 }
// previous = { year: 2024, month: 12 }
```

### Force Recalculation

```typescript
await MonthlyAttendanceAPI.calculate(params, { forceRecalculate: true });
```

### System Health Check

```typescript
const health = await MonthlyAttendanceAPI.healthCheck();
console.log(health.details); // { database, latency, cacheSize }
```

---

## 📊 Parameters

### MonthlyAttendanceParams

```typescript
{
  year: number,        // 2025
  month: number,       // 1-12 (1 = January)
  subject: string,     // 'Data Structures'
  semester: number,    // 1-6
  division?: string    // 'A', 'B', etc. (optional)
}
```

### Download Formats

- `'excel'` - Excel (.xlsx) only
- `'pdf'` - PDF only
- `'both'` - Both Excel and PDF

---

## 🎯 Sample React Integration

```typescript
import { MonthlyAttendanceAPI } from '../services/monthlyAttendanceAPI';
import { Button } from './ui/button';

function MonthlyReportButton({ teacherId, subject, semester, division }) {
  const [loading, setLoading] = useState(false);
  
  const handleClick = async () => {
    setLoading(true);
    
    const { previous } = MonthlyAttendanceAPI.getMonthInfo();
    
    const result = await MonthlyAttendanceAPI.generateAndDownload(
      {
        year: previous.year,
        month: previous.month,
        subject: subject,
        semester: semester,
        division: division
      },
      teacherId,
      'both'
    );
    
    setLoading(false);
    
    if (result.success) {
      toast.success('Reports downloaded!');
    } else {
      toast.error(result.message);
    }
  };
  
  return (
    <Button onClick={handleClick} disabled={loading}>
      {loading ? 'Generating...' : 'Generate Monthly Report'}
    </Button>
  );
}
```

---

## 📁 What Gets Created

### Database Structure

```
/monthlyAttendance/
  /2025/
    /1/
      /DataStructures_sem3_A/
        /_metadata
        /student001
        /student002
        ...
```

### Downloaded Files

- `Attendance_DataStructures_Sem3_A_January2025.xlsx`
- `Attendance_DataStructures_Sem3_A_January2025.pdf`

---

## 📋 Report Contents

Both Excel and PDF include:

1. University name
2. College name
3. Department
4. Subject, Semester, Division
5. Month and Year
6. Total lectures conducted
7. Teacher name
8. Student attendance table:
   - Roll Number
   - Student Name
   - Total Lectures
   - Attended Lectures
   - Attendance %
   - Eligibility Status
9. Summary (eligible/not eligible counts, average)
10. Signature lines (Teacher + HOD)

---

## 🔧 Automatic Generation Setup

```typescript
import { scheduleAutomaticGeneration } from '../services/attendanceAutomation';

// In your main App or background service
useEffect(() => {
  const interval = setInterval(async () => {
    const now = new Date();
    
    // Run at 11:30 PM daily
    if (now.getHours() === 23 && now.getMinutes() === 30) {
      await scheduleAutomaticGeneration();
    }
  }, 60000);
  
  return () => clearInterval(interval);
}, []);
```

---

## ⚡ Performance

- 30 students, 10 lectures: ~1-2 seconds
- 50 students, 20 lectures: ~2-3 seconds
- 100 students, 30 lectures: ~3-5 seconds
- 500 students, 40 lectures: ~8-12 seconds

---

## 🛡️ Safety Features

✅ Idempotent (safe to call multiple times)  
✅ Input validation  
✅ Rate limiting (5 per minute)  
✅ Error handling with retry  
✅ Zero lecture protection  
✅ Cache system (5 minutes)  

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Data already exists | Use `{ forceRecalculate: true }` |
| No lectures found | Check if lectures exist that month |
| Rate limit exceeded | Wait 1 minute |
| Reports not downloading | Check popup blocker |
| Slow performance | Run `healthCheck()` |

---

## 📞 Quick Help

**View Full Guide**: `/MONTHLY_ATTENDANCE_GUIDE.md`  
**Implementation Details**: `/MONTHLY_ATTENDANCE_README.md`  

---

## ✅ Ready to Use!

**No setup required** - Just import and use:

```typescript
import { MonthlyAttendanceAPI } from '../services/monthlyAttendanceAPI';

await MonthlyAttendanceAPI.generateAndDownload(
  { year: 2025, month: 1, subject: 'Subject', semester: 3 },
  teacherId,
  'both'
);
```

**Done!** 🎉
