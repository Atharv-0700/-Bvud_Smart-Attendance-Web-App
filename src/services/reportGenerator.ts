/**
 * University Report Generator Service
 * Generates Excel and PDF reports for monthly attendance
 * Part 6: University Report Generation
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StudentMonthlyAttendance } from './monthlyAttendance';
import { formatMonthYear, getMonthName } from '../utils/dateUtils';
import { database } from '../config/firebase';
import { ref, get } from 'firebase/database';

export interface ReportMetadata {
  universityName: string;
  collegeName: string;
  department: string;
  subject: string;
  monthYear: string;
  teacherName: string;
  teacherId?: string;
  generatedDate: string;
  semester: number;
  division?: string;
  totalLectures: number;
}

export interface UniversityReportConfig {
  universityName?: string;
  collegeName?: string;
  department?: string;
  hodName?: string;
}

// Default configuration
const DEFAULT_CONFIG: UniversityReportConfig = {
  universityName: 'Bharati Vidyapeeth University',
  collegeName: 'Bharati Vidyapeeth University, Kharghar, Belpada, Sector 3',
  department: 'Department of Computer Applications (BCA)',
  hodName: 'Dr. [HOD Name]',
};

/**
 * Get teacher details from database
 */
async function getTeacherDetails(teacherId: string): Promise<{
  name: string;
  email: string;
}> {
  try {
    const teacherRef = ref(database, `users/${teacherId}`);
    const snapshot = await get(teacherRef);
    
    if (snapshot.exists()) {
      const teacher = snapshot.val();
      return {
        name: teacher.name || teacher.displayName || 'Unknown Teacher',
        email: teacher.email || '',
      };
    }
  } catch (error) {
    console.error('[REPORT] Error fetching teacher details:', error);
  }
  
  return {
    name: 'Unknown Teacher',
    email: '',
  };
}

/**
 * PART 6A: Generate Excel Report (.xlsx)
 * University-ready attendance report in Excel format
 */
export async function generateExcelReport(
  studentsData: StudentMonthlyAttendance[],
  metadata: ReportMetadata,
  config: UniversityReportConfig = DEFAULT_CONFIG
): Promise<Blob> {
  console.log('[REPORT] Generating Excel report...');
  
  const {
    universityName = DEFAULT_CONFIG.universityName,
    collegeName = DEFAULT_CONFIG.collegeName,
    department = DEFAULT_CONFIG.department,
  } = config;
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Prepare data for Excel
  const excelData: any[] = [];
  
  // Header rows
  excelData.push([universityName]);
  excelData.push([collegeName]);
  excelData.push([department]);
  excelData.push([]);
  excelData.push(['MONTHLY ATTENDANCE STATEMENT']);
  excelData.push([]);
  excelData.push(['Subject:', metadata.subject]);
  excelData.push(['Semester:', `Semester ${metadata.semester}`]);
  if (metadata.division) {
    excelData.push(['Division:', metadata.division]);
  }
  excelData.push(['Month/Year:', metadata.monthYear]);
  excelData.push(['Total Lectures Conducted:', metadata.totalLectures]);
  excelData.push(['Teacher:', metadata.teacherName]);
  excelData.push(['Generated On:', metadata.generatedDate]);
  excelData.push([]);
  
  // Column headers
  excelData.push([
    'S.No.',
    'Roll Number',
    'Student Name',
    'Total Lectures',
    'Lectures Attended',
    'Attendance %',
    'Eligibility Status',
    'Remarks',
  ]);
  
  // Student data rows
  studentsData.forEach((student, index) => {
    excelData.push([
      index + 1,
      student.rollNumber || '-',
      student.studentName,
      student.totalLectures,
      student.attendedLectures,
      `${student.attendancePercentage.toFixed(2)}%`,
      student.eligibilityStatus,
      student.attendancePercentage < 75 ? 'Below Minimum Requirement' : '',
    ]);
  });
  
  // Summary rows
  excelData.push([]);
  excelData.push([]);
  const eligible = studentsData.filter(s => s.eligibilityStatus === 'Eligible').length;
  const notEligible = studentsData.length - eligible;
  const avgAttendance = studentsData.reduce((sum, s) => sum + s.attendancePercentage, 0) / studentsData.length;
  
  excelData.push(['SUMMARY']);
  excelData.push(['Total Students:', studentsData.length]);
  excelData.push(['Eligible Students (≥75%):', eligible]);
  excelData.push(['Not Eligible Students (<75%):', notEligible]);
  excelData.push(['Average Attendance:', `${avgAttendance.toFixed(2)}%`]);
  excelData.push([]);
  excelData.push([]);
  excelData.push([]);
  excelData.push(['_________________________', '', '', '_________________________']);
  excelData.push(['Teacher Signature', '', '', 'HOD Signature']);
  excelData.push([metadata.teacherName, '', '', config.hodName || 'Dr. [HOD Name]']);
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(excelData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // S.No.
    { wch: 15 }, // Roll Number
    { wch: 25 }, // Student Name
    { wch: 15 }, // Total Lectures
    { wch: 18 }, // Lectures Attended
    { wch: 15 }, // Attendance %
    { wch: 18 }, // Eligibility Status
    { wch: 30 }, // Remarks
  ];
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Attendance');
  
  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  
  console.log('[REPORT] Excel report generated successfully');
  
  return blob;
}

/**
 * PART 6B: Generate PDF Report
 * Print-ready university submission format
 */
export async function generatePDFReport(
  studentsData: StudentMonthlyAttendance[],
  metadata: ReportMetadata,
  config: UniversityReportConfig = DEFAULT_CONFIG
): Promise<Blob> {
  console.log('[REPORT] Generating PDF report...');
  
  const {
    universityName = DEFAULT_CONFIG.universityName,
    collegeName = DEFAULT_CONFIG.collegeName,
    department = DEFAULT_CONFIG.department,
    hodName = DEFAULT_CONFIG.hodName,
  } = config;
  
  // Create PDF document (A4 size)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 15;
  
  // Header section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(universityName || '', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 7;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(collegeName || '', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 6;
  doc.text(department || '', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('MONTHLY ATTENDANCE STATEMENT', pageWidth / 2, yPosition, { align: 'center' });
  
  // Draw line
  yPosition += 3;
  doc.setLineWidth(0.5);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  
  // Course details
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const detailsLeftX = 15;
  const detailsRightX = 120;
  
  doc.text(`Subject: ${metadata.subject}`, detailsLeftX, yPosition);
  doc.text(`Semester: ${metadata.semester}`, detailsRightX, yPosition);
  
  yPosition += 6;
  doc.text(`Month/Year: ${metadata.monthYear}`, detailsLeftX, yPosition);
  if (metadata.division) {
    doc.text(`Division: ${metadata.division}`, detailsRightX, yPosition);
  }
  
  yPosition += 6;
  doc.text(`Total Lectures Conducted: ${metadata.totalLectures}`, detailsLeftX, yPosition);
  doc.text(`Teacher: ${metadata.teacherName}`, detailsRightX, yPosition);
  
  yPosition += 10;
  
  // Table data
  const tableData = studentsData.map((student, index) => [
    index + 1,
    student.rollNumber || '-',
    student.studentName,
    student.totalLectures,
    student.attendedLectures,
    `${student.attendancePercentage.toFixed(2)}%`,
    student.eligibilityStatus,
  ]);
  
  // Generate table
  autoTable(doc, {
    startY: yPosition,
    head: [
      [
        'S.No.',
        'Roll No.',
        'Student Name',
        'Total',
        'Attended',
        'Attendance %',
        'Status',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235], // Primary Blue
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 }, // S.No.
      1: { halign: 'center', cellWidth: 22 }, // Roll No.
      2: { halign: 'left', cellWidth: 55 },   // Name
      3: { halign: 'center', cellWidth: 18 }, // Total
      4: { halign: 'center', cellWidth: 20 }, // Attended
      5: { halign: 'center', cellWidth: 25 }, // Percentage
      6: { halign: 'center', cellWidth: 28 }, // Status
    },
    didParseCell: function(data) {
      // Color code eligibility status
      if (data.column.index === 6 && data.section === 'body') {
        const status = data.cell.raw as string;
        if (status === 'Not Eligible') {
          data.cell.styles.textColor = [220, 38, 38]; // Red
          data.cell.styles.fontStyle = 'bold';
        } else if (status === 'Eligible') {
          data.cell.styles.textColor = [34, 197, 94]; // Green
        }
      }
    },
    margin: { left: 15, right: 15 },
  });
  
  // Get the final Y position after table
  const finalY = (doc as any).lastAutoTable.finalY || yPosition + 100;
  
  // Summary section
  const eligible = studentsData.filter(s => s.eligibilityStatus === 'Eligible').length;
  const notEligible = studentsData.length - eligible;
  const avgAttendance = studentsData.reduce((sum, s) => sum + s.attendancePercentage, 0) / studentsData.length;
  
  let summaryY = finalY + 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary:', 15, summaryY);
  
  summaryY += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Students: ${studentsData.length}`, 20, summaryY);
  
  summaryY += 5;
  doc.text(`Eligible (≥75%): ${eligible}`, 20, summaryY);
  
  summaryY += 5;
  doc.text(`Not Eligible (<75%): ${notEligible}`, 20, summaryY);
  
  summaryY += 5;
  doc.text(`Average Attendance: ${avgAttendance.toFixed(2)}%`, 20, summaryY);
  
  // Signature section
  summaryY += 20;
  
  const signatureLeftX = 30;
  const signatureRightX = 130;
  
  doc.setFontSize(10);
  
  // Teacher signature
  doc.line(signatureLeftX, summaryY, signatureLeftX + 40, summaryY);
  summaryY += 5;
  doc.text('Teacher Signature', signatureLeftX, summaryY);
  summaryY += 5;
  doc.setFontSize(9);
  doc.text(metadata.teacherName, signatureLeftX, summaryY);
  
  // HOD signature
  summaryY -= 10;
  doc.setFontSize(10);
  doc.line(signatureRightX, summaryY, signatureRightX + 40, summaryY);
  summaryY += 5;
  doc.text('HOD Signature', signatureRightX, summaryY);
  summaryY += 5;
  doc.setFontSize(9);
  doc.text(hodName || 'Dr. [HOD Name]', signatureRightX, summaryY);
  
  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Generated on: ${metadata.generatedDate}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  
  // Convert to blob
  const pdfBlob = doc.output('blob');
  
  console.log('[REPORT] PDF report generated successfully');
  
  return pdfBlob;
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download Excel report
 */
export async function downloadExcelReport(
  studentsData: StudentMonthlyAttendance[],
  year: number,
  month: number,
  subject: string,
  semester: number,
  division: string | undefined,
  teacherId: string,
  config?: UniversityReportConfig
): Promise<void> {
  console.log('[REPORT] Starting Excel download...');
  
  // Get teacher details
  const teacher = await getTeacherDetails(teacherId);
  
  const metadata: ReportMetadata = {
    universityName: config?.universityName || DEFAULT_CONFIG.universityName!,
    collegeName: config?.collegeName || DEFAULT_CONFIG.collegeName!,
    department: config?.department || DEFAULT_CONFIG.department!,
    subject,
    monthYear: formatMonthYear(year, month),
    teacherName: teacher.name,
    teacherId,
    generatedDate: new Date().toLocaleDateString('en-IN'),
    semester,
    division,
    totalLectures: studentsData[0]?.totalLectures || 0,
  };
  
  const blob = await generateExcelReport(studentsData, metadata, config);
  
  // Generate filename
  const monthName = getMonthName(month);
  const divisionStr = division ? `_${division}` : '';
  const filename = `Attendance_${subject}_Sem${semester}${divisionStr}_${monthName}${year}.xlsx`;
  
  downloadBlob(blob, filename);
  
  console.log('[REPORT] Excel downloaded:', filename);
}

/**
 * Generate and download PDF report
 */
export async function downloadPDFReport(
  studentsData: StudentMonthlyAttendance[],
  year: number,
  month: number,
  subject: string,
  semester: number,
  division: string | undefined,
  teacherId: string,
  config?: UniversityReportConfig
): Promise<void> {
  console.log('[REPORT] Starting PDF download...');
  
  // Get teacher details
  const teacher = await getTeacherDetails(teacherId);
  
  const metadata: ReportMetadata = {
    universityName: config?.universityName || DEFAULT_CONFIG.universityName!,
    collegeName: config?.collegeName || DEFAULT_CONFIG.collegeName!,
    department: config?.department || DEFAULT_CONFIG.department!,
    subject,
    monthYear: formatMonthYear(year, month),
    teacherName: teacher.name,
    teacherId,
    generatedDate: new Date().toLocaleDateString('en-IN'),
    semester,
    division,
    totalLectures: studentsData[0]?.totalLectures || 0,
  };
  
  const blob = await generatePDFReport(studentsData, metadata, config);
  
  // Generate filename
  const monthName = getMonthName(month);
  const divisionStr = division ? `_${division}` : '';
  const filename = `Attendance_${subject}_Sem${semester}${divisionStr}_${monthName}${year}.pdf`;
  
  downloadBlob(blob, filename);
  
  console.log('[REPORT] PDF downloaded:', filename);
}

/**
 * Generate and download both Excel and PDF reports
 */
export async function downloadBothReports(
  studentsData: StudentMonthlyAttendance[],
  year: number,
  month: number,
  subject: string,
  semester: number,
  division: string | undefined,
  teacherId: string,
  config?: UniversityReportConfig
): Promise<void> {
  console.log('[REPORT] Generating both Excel and PDF reports...');
  
  await downloadExcelReport(
    studentsData,
    year,
    month,
    subject,
    semester,
    division,
    teacherId,
    config
  );
  
  // Small delay to prevent download conflicts
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await downloadPDFReport(
    studentsData,
    year,
    month,
    subject,
    semester,
    division,
    teacherId,
    config
  );
  
  console.log('[REPORT] Both reports downloaded successfully');
}