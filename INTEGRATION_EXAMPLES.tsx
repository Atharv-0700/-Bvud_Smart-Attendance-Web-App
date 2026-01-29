/**
 * INTEGRATION EXAMPLES
 * Copy-paste these code snippets into your existing components
 */

// ============================================
// EXAMPLE 1: StartLecture.tsx Integration
// ============================================

/*
In your StartLecture.tsx file, find where the teacher ends a lecture.
Add the import at the top and the function call where the lecture ends.
*/

// At the top of the file:
import { handleLectureEnd } from '@/services/attendanceSystem';
import { toast } from 'sonner';

// In your end lecture function:
async function endLecture(lectureId: string) {
  try {
    // Your existing lecture end logic here...
    // ...
    
    // Add this after lecture is marked as ended:
    console.log('Updating attendance summaries...');
    const result = await handleLectureEnd(lectureId);
    
    if (result.success) {
      toast.success(
        `Attendance updated for ${result.details?.studentsProcessed} students`,
        {
          description: `Processed in ${result.details?.duration}`,
        }
      );
    } else {
      toast.error('Error updating attendance', {
        description: result.message,
      });
    }
  } catch (error) {
    console.error('Error in endLecture:', error);
    toast.error('Failed to update attendance');
  }
}

// ============================================
// EXAMPLE 2: StudentDashboard.tsx - Subject-wise View
// ============================================

/*
Add a section to StudentDashboard.tsx to display subject-wise attendance
*/

import { useState, useEffect } from 'react';
import { getStudentSubjectAttendance } from '@/services/attendanceSystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';

function SubjectWiseAttendanceSection({ studentId }: { studentId: string }) {
  const [summaries, setSummaries] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAttendance() {
      try {
        const result = await getStudentSubjectAttendance(studentId);
        setSummaries(result.summaries);
        setStats(result.stats);
      } catch (error) {
        console.error('Error loading attendance:', error);
      } finally {
        setLoading(false);
      }
    }

    if (studentId) {
      loadAttendance();
    }
  }, [studentId]);

  if (loading) {
    return <div>Loading attendance...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subject-wise Attendance</CardTitle>
        {stats && (
          <div className="text-sm text-gray-600">
            Overall: {stats.overallPercentage}% - {stats.overallStatus}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {summaries.map((subject, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">{subject.subject}</h3>
                <p className="text-sm text-gray-600">
                  {subject.attendedLectures}/{subject.totalLectures} lectures
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{subject.attendancePercentage}%</div>
                <Badge
                  variant={subject.subjectStatus === 'Eligible' ? 'default' : 'destructive'}
                >
                  {subject.subjectStatus}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// EXAMPLE 3: TeacherReports.tsx - Monthly Report
// ============================================

/*
Add monthly report generation to TeacherReports.tsx
*/

import { useState } from 'react';
import { exportMonthlyUniversityReport, getMonthlyReport } from '@/services/attendanceSystem';
import { Button } from '@/app/components/ui/button';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';

function MonthlyReportSection({ teacherId }: { teacherId: string }) {
  const [loading, setLoading] = useState(false);
  const [reportParams, setReportParams] = useState({
    year: 2026,
    month: 1,
    subject: 'Data Structures',
    semester: 3,
  });
  const [teacherName] = useState('Prof. John Smith'); // Get from user data

  async function handleExportExcel() {
    try {
      setLoading(true);
      const result = await exportMonthlyUniversityReport(
        reportParams,
        teacherName,
        'excel'
      );

      if (result.success) {
        toast.success('Excel report downloaded successfully');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to generate Excel report');
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    try {
      setLoading(true);
      const result = await exportMonthlyUniversityReport(
        reportParams,
        teacherName,
        'pdf'
      );

      if (result.success) {
        toast.success('PDF report downloaded successfully');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to generate PDF report');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Monthly Reports</h2>
      
      {/* Add form fields here to select year, month, subject, semester */}
      
      <div className="flex gap-4">
        <Button onClick={handleExportExcel} disabled={loading}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
        
        <Button onClick={handleExportPDF} disabled={loading}>
          <FileText className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 4: TeacherReports.tsx - Semester Report
// ============================================

import { exportSemesterUniversityReport, getSemesterStats } from '@/services/attendanceSystem';

function SemesterReportSection({ teacherId }: { teacherId: string }) {
  const [loading, setLoading] = useState(false);
  const [semester, setSemester] = useState(3);
  const [stats, setStats] = useState<any>(null);
  const [teacherName] = useState('Prof. John Smith');

  useEffect(() => {
    async function loadStats() {
      const result = await getSemesterStats(semester);
      setStats(result);
    }
    loadStats();
  }, [semester]);

  async function handleExportSemesterReport(format: 'excel' | 'pdf') {
    try {
      setLoading(true);
      const result = await exportSemesterUniversityReport(
        { semester },
        teacherName,
        format
      );

      if (result.success) {
        toast.success(`${format.toUpperCase()} report downloaded`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Semester {semester} Report</h2>
      
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
              <p className="text-sm text-gray-600">Total Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.eligible}</div>
              <p className="text-sm text-gray-600">Eligible</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.notEligible}</div>
              <p className="text-sm text-gray-600">Not Eligible</p>
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="flex gap-4">
        <Button onClick={() => handleExportSemesterReport('excel')} disabled={loading}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
        
        <Button onClick={() => handleExportSemesterReport('pdf')} disabled={loading}>
          <FileText className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 5: Eligibility Check Button
// ============================================

import { checkStudentEligibility } from '@/services/attendanceSystem';
import { AlertCircle, CheckCircle } from 'lucide-react';

function EligibilityChecker({ studentId, semester }: { studentId: string; semester: number }) {
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function checkEligibility() {
    try {
      setLoading(true);
      const result = await checkStudentEligibility(studentId, semester);
      setEligible(result.eligible);
      setReport(result.report);
    } catch (error) {
      toast.error('Failed to check eligibility');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkEligibility();
  }, [studentId, semester]);

  if (loading) {
    return <div>Checking eligibility...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exam Eligibility Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {eligible ? (
            <>
              <CheckCircle className="h-12 w-12 text-green-600" />
              <div>
                <h3 className="text-xl font-bold text-green-600">Eligible for Exam</h3>
                <p className="text-sm text-gray-600">
                  All subjects meet the 75% attendance requirement
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-12 w-12 text-red-600" />
              <div>
                <h3 className="text-xl font-bold text-red-600">Not Eligible for Exam</h3>
                <p className="text-sm text-gray-600">
                  Some subjects have less than 75% attendance
                </p>
              </div>
            </>
          )}
        </div>

        {report && report.subjects && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Subject Details:</h4>
            {report.subjects
              .filter((s: any) => s.subjectStatus === 'Not Eligible')
              .map((subject: any, index: number) => (
                <div key={index} className="text-sm text-red-600">
                  • {subject.subject}: {subject.attendancePercentage}%
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// EXAMPLE 6: First-time Initialization
// ============================================

/*
Add this to your admin panel or run once in console
*/

import { initializeSystem, checkSystemHealth } from '@/services/attendanceSystem';

async function initializeAttendanceSystem() {
  try {
    console.log('Initializing attendance system...');
    
    // Check health first
    const health = await checkSystemHealth();
    console.log('Health check:', health);
    
    if (!health.healthy) {
      console.log('System needs initialization...');
      const result = await initializeSystem();
      console.log('Initialization result:', result);
    } else {
      console.log('System is already healthy');
    }
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// Run this once:
// initializeAttendanceSystem();

// ============================================
// EXAMPLE 7: Download Student Report Button
// ============================================

import { exportStudentReport } from '@/services/attendanceSystem';

function DownloadReportButton({ studentId }: { studentId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    try {
      setLoading(true);
      const result = await exportStudentReport(studentId, 'excel');
      
      if (result.success) {
        toast.success('Report downloaded successfully');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to download report');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleDownload} disabled={loading}>
      <Download className="mr-2 h-4 w-4" />
      Download Full Report
    </Button>
  );
}

// ============================================
// EXAMPLE 8: System Stats Dashboard
// ============================================

import { getSystemStats } from '@/services/attendanceSystem';

function SystemStatsDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function loadStats() {
      const result = await getSystemStats();
      setStats(result);
    }
    loadStats();
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-3xl font-bold">{stats.totalLectures}</div>
          <p className="text-sm text-gray-600">Total Lectures</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-3xl font-bold">{stats.totalStudents}</div>
          <p className="text-sm text-gray-600">Total Students</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-3xl font-bold">{stats.totalSubjects}</div>
          <p className="text-sm text-gray-600">Total Subjects</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// That's it! Pick the examples you need and integrate them into your components.
// All functions are fully documented in the service files.
// ============================================
