/**
 * University Report Generation System
 * Implements PART 5 & PART 6 of the Subject-wise Attendance Tracking System
 * 
 * Generates university-compliant reports in Excel and PDF formats:
 * - Monthly attendance reports
 * - Semester attendance reports
 * - Full student reports
 * - Bulk export for university submission
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  UniversityReport,
  UniversityReportRow,
  UniversityReportMetadata,
  FullStudentReport,
  MonthlyReportParams,
  SemesterReportParams,
} from '@/types/attendanceTypes';
import { getMonthlySubjectAttendance } from './monthlySubjectAttendance';
import { getSemesterReport } from './semesterEligibility';
import { getSubjectAttendanceSummary } from './subjectWiseAttendance';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

/**
 * Generate monthly university report
 */
export async function generateMonthlyUniversityReport(
  params: MonthlyReportParams,
  teacherName: string
): Promise<UniversityReport> {
  try {
    console.log('[REPORT] Generating monthly university report');

    // Get monthly attendance data
    const studentsData = await getMonthlySubjectAttendance(params);

    // Convert to report rows
    const students: UniversityReportRow[] = studentsData.map(student => ({
      rollNumber: student.rollNumber,
      studentName: student.studentName,
      subject: student.subject,
      semester: student.semester,
      month: getMonthName(params.month),
      totalLectures: student.totalLectures,
      attendedLectures: student.attendedLectures,
      absentLectures: student.absentLectures,
      attendancePercentage: student.attendancePercentage,
      eligibilityStatus: student.eligibilityStatus,
    }));

    // Calculate statistics
    const eligible = students.filter(s => s.eligibilityStatus === 'Eligible').length;
    const notEligible = students.length - eligible;
    const totalAttendance = students.reduce((sum, s) => sum + s.attendancePercentage, 0);
    const averageAttendance = students.length > 0
      ? Math.round((totalAttendance / students.length) * 100) / 100
      : 0;

    // Create metadata
    const metadata: UniversityReportMetadata = {
      university: 'Bharati Vidyapeeth (Deemed to be University)',
      department: 'BCA Department',
      subject: params.subject,
      semester: params.semester,
      month: getMonthName(params.month),
      year: params.year,
      teacherName,
      generatedAt: new Date().toISOString(),
      reportType: 'Monthly',
    };

    return {
      metadata,
      students,
      statistics: {
        totalStudents: students.length,
        eligible,
        notEligible,
        averageAttendance,
      },
    };
  } catch (error) {
    console.error('[REPORT] Error generating monthly report:', error);
    throw error;
  }
}

/**
 * Generate semester university report
 */
export async function generateSemesterUniversityReport(
  params: SemesterReportParams,
  teacherName: string
): Promise<UniversityReport> {
  try {
    console.log('[REPORT] Generating semester university report');

    // Get all students' semester reports
    const students: UniversityReportRow[] = [];

    // If specific student, get only that student
    if (params.studentId) {
      const report = await getSemesterReport(params.studentId, params.semester);
      
      if (report) {
        for (const subject of report.subjects) {
          students.push({
            rollNumber: report.rollNumber,
            studentName: report.studentName,
            subject: subject.subject,
            semester: params.semester,
            totalLectures: subject.totalLectures,
            attendedLectures: subject.attendedLectures,
            absentLectures: subject.absentLectures,
            attendancePercentage: subject.attendancePercentage,
            eligibilityStatus: subject.subjectStatus,
          });
        }
      }
    } else {
      // Get all students from attendance summaries
      const { database } = await import('@/config/firebase');
      const { ref, get } = await import('firebase/database');

      const summariesRef = ref(database, 'attendanceSummary');
      const snapshot = await get(summariesRef);

      if (snapshot.exists()) {
        const allSummaries = snapshot.val();

        for (const [studentId, summaries] of Object.entries(allSummaries)) {
          const report = await getSemesterReport(studentId, params.semester);
          
          if (report) {
            for (const subject of report.subjects) {
              students.push({
                rollNumber: report.rollNumber,
                studentName: report.studentName,
                subject: subject.subject,
                semester: params.semester,
                totalLectures: subject.totalLectures,
                attendedLectures: subject.attendedLectures,
                absentLectures: subject.absentLectures,
                attendancePercentage: subject.attendancePercentage,
                eligibilityStatus: subject.subjectStatus,
              });
            }
          }
        }
      }
    }

    // Calculate statistics
    const eligible = students.filter(s => s.eligibilityStatus === 'Eligible').length;
    const notEligible = students.length - eligible;
    const totalAttendance = students.reduce((sum, s) => sum + s.attendancePercentage, 0);
    const averageAttendance = students.length > 0
      ? Math.round((totalAttendance / students.length) * 100) / 100
      : 0;

    // Create metadata
    const metadata: UniversityReportMetadata = {
      university: 'Bharati Vidyapeeth (Deemed to be University)',
      department: 'BCA Department',
      semester: params.semester,
      teacherName,
      generatedAt: new Date().toISOString(),
      reportType: 'Semester',
    };

    return {
      metadata,
      students,
      statistics: {
        totalStudents: new Set(students.map(s => s.rollNumber)).size,
        eligible,
        notEligible,
        averageAttendance,
      },
    };
  } catch (error) {
    console.error('[REPORT] Error generating semester report:', error);
    throw error;
  }
}

/**
 * Generate full student report
 */
export async function generateFullStudentReport(
  studentId: string
): Promise<FullStudentReport | null> {
  try {
    console.log('[REPORT] Generating full student report');

    // Get subject-wise attendance
    const summaries = await getSubjectAttendanceSummary(studentId);

    if (summaries.length === 0) {
      return null;
    }

    // Get student info
    const { database } = await import('@/config/firebase');
    const { ref, get } = await import('firebase/database');

    const userRef = ref(database, `users/${studentId}`);
    const userSnapshot = await get(userRef);

    let studentName = 'Unknown';
    let rollNumber = 'Unknown';
    let email = '';
    let semester = summaries[0]?.semester || 1;
    let division = summaries[0]?.division;

    if (userSnapshot.exists()) {
      const userData = userSnapshot.val();
      studentName = userData.name || 'Unknown';
      rollNumber = userData.rollNumber || 'Unknown';
      email = userData.email || '';
      semester = userData.semester || semester;
    }

    // Get semester eligibility
    const semesterReport = await getSemesterReport(studentId, semester);

    // Calculate overall attendance percentage
    const totalPercentage = summaries.reduce((sum, s) => sum + s.attendancePercentage, 0);
    const overallAttendancePercentage = Math.round((totalPercentage / summaries.length) * 100) / 100;

    const report: FullStudentReport = {
      studentId,
      studentName,
      rollNumber,
      email,
      semester,
      division,
      subjectWiseAttendance: summaries,
      semesterEligibility: semesterReport || {
        semester,
        studentId,
        studentName,
        rollNumber,
        subjects: [],
        overallStatus: 'Not Eligible for Exam',
        generatedAt: new Date().toISOString(),
      },
      overallAttendancePercentage,
      generatedAt: new Date().toISOString(),
      universityComplianceNote: 'Minimum 75% attendance required for exam eligibility as per Bharati Vidyapeeth University regulations.',
    };

    return report;
  } catch (error) {
    console.error('[REPORT] Error generating full student report:', error);
    return null;
  }
}

/**
 * Export university report to Excel
 */
export function exportToExcel(
  report: UniversityReport,
  filename: string = 'attendance_report.xlsx'
): void {
  try {
    console.log('[REPORT] Exporting to Excel');

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Prepare header data
    const headerData = [
      ['Bharati Vidyapeeth (Deemed to be University)'],
      ['Department: ' + report.metadata.department],
      report.metadata.subject ? ['Subject: ' + report.metadata.subject] : [],
      report.metadata.semester ? ['Semester: ' + report.metadata.semester] : [],
      report.metadata.month ? ['Month: ' + report.metadata.month] : [],
      report.metadata.year ? ['Year: ' + report.metadata.year] : [],
      ['Teacher: ' + report.metadata.teacherName],
      ['Generated: ' + new Date(report.metadata.generatedAt).toLocaleString()],
      [],
      ['Statistics'],
      ['Total Students', report.statistics.totalStudents],
      ['Eligible', report.statistics.eligible],
      ['Not Eligible', report.statistics.notEligible],
      ['Average Attendance', report.statistics.averageAttendance + '%'],
      [],
    ].filter(row => row.length > 0);

    // Prepare student data
    const studentHeaders = [
      'Roll No',
      'Student Name',
      'Subject',
      'Semester',
      ...(report.metadata.reportType === 'Monthly' ? ['Month'] : []),
      'Total Lectures',
      'Attended',
      'Absent',
      'Attendance %',
      'Eligibility',
    ];

    const studentData = report.students.map(student => [
      student.rollNumber,
      student.studentName,
      student.subject,
      student.semester,
      ...(report.metadata.reportType === 'Monthly' ? [student.month || ''] : []),
      student.totalLectures,
      student.attendedLectures,
      student.absentLectures,
      student.attendancePercentage,
      student.eligibilityStatus,
    ]);

    // Combine all data
    const wsData = [
      ...headerData,
      studentHeaders,
      ...studentData,
      [],
      [''],
      ['Subject Teacher Signature: _______________________'],
      ['HOD Signature: _______________________'],
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Roll No
      { wch: 25 }, // Student Name
      { wch: 20 }, // Subject
      { wch: 10 }, // Semester
      ...(report.metadata.reportType === 'Monthly' ? [{ wch: 12 }] : []), // Month
      { wch: 15 }, // Total Lectures
      { wch: 10 }, // Attended
      { wch: 10 }, // Absent
      { wch: 15 }, // Attendance %
      { wch: 15 }, // Eligibility
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');

    // Generate Excel file
    XLSX.writeFile(wb, filename);

    console.log('[REPORT] Excel export complete');
  } catch (error) {
    console.error('[REPORT] Error exporting to Excel:', error);
    throw error;
  }
}

/**
 * Export university report to PDF
 */
export function exportToPDF(
  report: UniversityReport,
  filename: string = 'attendance_report.pdf'
): void {
  try {
    console.log('[REPORT] Exporting to PDF');

    // Create PDF document
    const doc = new jsPDF('landscape');

    // Add header
    doc.setFontSize(16);
    doc.text('Bharati Vidyapeeth (Deemed to be University)', 14, 15);
    
    doc.setFontSize(12);
    let yPos = 25;
    doc.text(`Department: ${report.metadata.department}`, 14, yPos);
    
    yPos += 7;
    if (report.metadata.subject) {
      doc.text(`Subject: ${report.metadata.subject}`, 14, yPos);
      yPos += 7;
    }
    
    if (report.metadata.semester) {
      doc.text(`Semester: ${report.metadata.semester}`, 14, yPos);
      yPos += 7;
    }
    
    if (report.metadata.month) {
      doc.text(`Month: ${report.metadata.month}`, 14, yPos);
      yPos += 7;
    }
    
    if (report.metadata.year) {
      doc.text(`Year: ${report.metadata.year}`, 14, yPos);
      yPos += 7;
    }
    
    doc.text(`Teacher: ${report.metadata.teacherName}`, 14, yPos);
    yPos += 7;
    
    doc.text(`Generated: ${new Date(report.metadata.generatedAt).toLocaleString()}`, 14, yPos);
    yPos += 10;

    // Add statistics
    doc.setFontSize(10);
    doc.text(`Total Students: ${report.statistics.totalStudents} | Eligible: ${report.statistics.eligible} | Not Eligible: ${report.statistics.notEligible} | Average: ${report.statistics.averageAttendance}%`, 14, yPos);
    yPos += 10;

    // Prepare table data
    const headers = [
      'Roll No',
      'Student Name',
      'Subject',
      'Sem',
      ...(report.metadata.reportType === 'Monthly' ? ['Month'] : []),
      'Total',
      'Attended',
      'Absent',
      'Attendance %',
      'Status',
    ];

    const rows = report.students.map(student => [
      student.rollNumber,
      student.studentName,
      student.subject,
      student.semester,
      ...(report.metadata.reportType === 'Monthly' ? [student.month || ''] : []),
      student.totalLectures,
      student.attendedLectures,
      student.absentLectures,
      student.attendancePercentage + '%',
      student.eligibilityStatus,
    ]);

    // Add table
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: yPos,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      didDrawPage: (data: any) => {
        // Add footer on each page
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(10);
        doc.text('Subject Teacher Signature: _______________________', 14, pageHeight - 20);
        doc.text('HOD Signature: _______________________', 150, pageHeight - 20);
      },
    });

    // Add compliance note
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
    doc.setFontSize(9);
    doc.text('Note: Minimum 75% attendance required for exam eligibility.', 14, finalY + 10);

    // Save PDF
    doc.save(filename);

    console.log('[REPORT] PDF export complete');
  } catch (error) {
    console.error('[REPORT] Error exporting to PDF:', error);
    throw error;
  }
}

/**
 * Export full student report to Excel
 */
export function exportStudentReportToExcel(
  report: FullStudentReport,
  filename?: string
): void {
  try {
    const fname = filename || `${report.rollNumber}_attendance_report.xlsx`;
    
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Student Info Sheet
    const infoData = [
      ['Bharati Vidyapeeth (Deemed to be University)'],
      ['Full Student Attendance Report'],
      [],
      ['Student Information'],
      ['Roll Number', report.rollNumber],
      ['Name', report.studentName],
      ['Email', report.email || 'N/A'],
      ['Semester', report.semester],
      ['Division', report.division || 'N/A'],
      ['Overall Attendance', report.overallAttendancePercentage + '%'],
      [],
      ['Eligibility Status', report.semesterEligibility.overallStatus],
      [],
      [report.universityComplianceNote],
      [],
      ['Generated', new Date(report.generatedAt).toLocaleString()],
    ];

    const infoWs = XLSX.utils.aoa_to_sheet(infoData);
    XLSX.utils.book_append_sheet(wb, infoWs, 'Student Info');

    // Subject-wise Attendance Sheet
    const subjectHeaders = [
      'Subject',
      'Semester',
      'Total Lectures',
      'Attended',
      'Absent',
      'Attendance %',
      'Status',
    ];

    const subjectData = report.subjectWiseAttendance.map(subject => [
      subject.subject,
      subject.semester,
      subject.totalLectures,
      subject.attendedLectures,
      subject.absentLectures,
      subject.attendancePercentage,
      subject.subjectStatus,
    ]);

    const subjectWs = XLSX.utils.aoa_to_sheet([subjectHeaders, ...subjectData]);
    XLSX.utils.book_append_sheet(wb, subjectWs, 'Subject-wise Attendance');

    // Generate Excel file
    XLSX.writeFile(wb, fname);

    console.log('[REPORT] Student report Excel export complete');
  } catch (error) {
    console.error('[REPORT] Error exporting student report to Excel:', error);
    throw error;
  }
}

/**
 * Helper function to get month name
 */
function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}
