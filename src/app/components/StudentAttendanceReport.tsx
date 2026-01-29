import { User } from '../App';
import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Home, PlayCircle, BarChart3, BookOpen, Download, Filter, Users, Shield, Loader2, AlertCircle, CheckCircle, XCircle, FileText, Search, ChevronRight, FileEdit } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Separator } from './ui/separator';
import { useState, useEffect, useMemo } from 'react';
import { database } from '../../config/firebase';
import { ref, get, onValue, off } from 'firebase/database';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SubjectAttendanceSummary, SemesterReport } from '../../types/attendanceTypes';

interface StudentAttendanceReportProps {
  user: User;
  onLogout: () => void;
}

interface StudentInfo {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  semester: number;
  division: string;
}

interface SubjectDetail extends SubjectAttendanceSummary {
  subjectKey: string;
}

export function StudentAttendanceReport({ user, onLogout }: StudentAttendanceReportProps) {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  
  // Data from Firebase
  const [subjectData, setSubjectData] = useState<SubjectDetail[]>([]);
  const [semesterReport, setSemesterReport] = useState<SemesterReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  
  // Detailed view
  const [selectedSubject, setSelectedSubject] = useState<SubjectDetail | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const navItems = [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/teacher' },
    { label: 'Start Lecture', icon: <PlayCircle className="w-5 h-5" />, path: '/teacher/start-lecture' },
    { label: 'Reports', icon: <BarChart3 className="w-5 h-5" />, path: '/teacher/reports' },
    { label: 'Student Reports', icon: <FileText className="w-5 h-5" />, path: '/teacher/student-attendance' },
    { label: 'BCA Syllabus', icon: <BookOpen className="w-5 h-5" />, path: '/teacher/syllabus' },
    { label: 'Device Security', icon: <Shield className="w-5 h-5" />, path: '/teacher/device-management' },
  ];

  // Load all students
  useEffect(() => {
    loadStudents();
  }, []);

  // Load student report when student is selected
  useEffect(() => {
    if (selectedStudentId) {
      loadStudentReport(selectedStudentId);
    } else {
      setSubjectData([]);
      setSemesterReport(null);
      setSelectedStudent(null);
    }
  }, [selectedStudentId]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);

      if (!snapshot.exists()) {
        setStudents([]);
        return;
      }

      const usersData = snapshot.val();
      const studentList: StudentInfo[] = [];

      Object.entries(usersData).forEach(([userId, userData]: [string, any]) => {
        if (userData.role === 'student') {
          studentList.push({
            id: userId,
            name: userData.name || 'Unknown',
            email: userData.email || '',
            rollNumber: userData.rollNumber || 'N/A',
            semester: userData.semester || 0,
            division: userData.division || '',
          });
        }
      });

      // Sort by roll number
      studentList.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
      setStudents(studentList);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentReport = async (studentId: string) => {
    try {
      setLoadingReport(true);

      // Find student info
      const student = students.find(s => s.id === studentId);
      setSelectedStudent(student || null);

      // Set up real-time listener for attendance summary
      const attendanceSummaryRef = ref(database, `attendanceSummary/${studentId}`);
      
      const unsubscribeAttendance = onValue(attendanceSummaryRef, (snapshot) => {
        if (snapshot.exists()) {
          const summaryData = snapshot.val();
          const subjects: SubjectDetail[] = [];

          Object.entries(summaryData).forEach(([subjectKey, data]: [string, any]) => {
            subjects.push({
              subjectKey,
              subject: data.subject,
              semester: data.semester,
              division: data.division,
              totalLectures: data.totalLectures || 0,
              attendedLectures: data.attendedLectures || 0,
              absentLectures: data.absentLectures || 0,
              attendancePercentage: data.attendancePercentage || 0,
              subjectStatus: data.subjectStatus || 'Not Eligible',
              lastUpdated: data.lastUpdated,
            });
          });

          // Sort by subject name
          subjects.sort((a, b) => a.subject.localeCompare(b.subject));
          setSubjectData(subjects);
        } else {
          setSubjectData([]);
        }
      });

      // Load semester report (not real-time, as it's generated less frequently)
      if (student?.semester) {
        const semesterReportRef = ref(database, `semesterReports/${studentId}/${student.semester}`);
        const semesterSnapshot = await get(semesterReportRef);

        if (semesterSnapshot.exists()) {
          setSemesterReport(semesterSnapshot.val());
        } else {
          setSemesterReport(null);
        }
      }

      // Clean up listener when student changes
      return () => {
        off(attendanceSummaryRef);
      };
    } catch (error) {
      console.error('Error loading student report:', error);
      toast.error('Failed to load student report');
    } finally {
      setLoadingReport(false);
    }
  };

  // Filter subjects based on filters
  const filteredSubjects = useMemo(() => {
    let filtered = [...subjectData];

    // Filter by semester
    if (selectedSemester !== 'all') {
      const semNum = parseInt(selectedSemester);
      filtered = filtered.filter(s => s.semester === semNum);
    }

    // Filter by subject
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(s => s.subject.toLowerCase() === subjectFilter.toLowerCase());
    }

    return filtered;
  }, [subjectData, selectedSemester, subjectFilter]);

  // Calculate overall totals
  const overallTotals = useMemo(() => {
    if (filteredSubjects.length === 0) {
      return {
        totalLectures: 0,
        totalPresent: 0,
        totalAbsent: 0,
        overallPercentage: 0,
        eligibilityStatus: 'Not Eligible',
      };
    }

    const totalLectures = filteredSubjects.reduce((sum, s) => sum + s.totalLectures, 0);
    const totalPresent = filteredSubjects.reduce((sum, s) => sum + s.attendedLectures, 0);
    const totalAbsent = filteredSubjects.reduce((sum, s) => sum + s.absentLectures, 0);
    const overallPercentage = totalLectures > 0 ? Math.round((totalPresent / totalLectures) * 100) : 0;
    const eligibilityStatus = overallPercentage >= 75 ? 'Eligible for Exam' : 'Not Eligible for Exam';

    return {
      totalLectures,
      totalPresent,
      totalAbsent,
      overallPercentage,
      eligibilityStatus,
    };
  }, [filteredSubjects]);

  // Get unique subjects for filter
  const availableSubjects = useMemo(() => {
    const subjects = new Set(subjectData.map(s => s.subject));
    return Array.from(subjects).sort();
  }, [subjectData]);

  // Filter students by search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;

    const query = searchQuery.toLowerCase();
    return students.filter(
      s =>
        s.name.toLowerCase().includes(query) ||
        s.rollNumber.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  const getStatusColor = (percentage: number) => {
    if (percentage >= 75) return 'text-success';
    if (percentage >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Eligible') {
      return (
        <Badge className="bg-success/10 text-success border-success/20" variant="outline">
          <CheckCircle className="w-3 h-3 mr-1" />
          Eligible
        </Badge>
      );
    }
    return (
      <Badge className="bg-destructive/10 text-destructive border-destructive/20" variant="outline">
        <XCircle className="w-3 h-3 mr-1" />
        Not Eligible
      </Badge>
    );
  };

  const handleSubjectClick = (subject: SubjectDetail) => {
    setSelectedSubject(subject);
    setShowDetailDialog(true);
  };

  const generatePDFReport = () => {
    if (!selectedStudent || filteredSubjects.length === 0) {
      toast.error('No data to generate report');
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;

      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Bharati Vidyapeeth (Deemed to be University)', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 8;
      doc.setFontSize(12);
      doc.text('Institute of Management and Rural Development Administration', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 6;
      doc.setFontSize(11);
      doc.text('Department of Computer Applications (BCA)', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 10;
      doc.setFontSize(14);
      doc.text('Student Attendance Report', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 10;

      // Student Information
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      doc.text(`Student Name: ${selectedStudent.name}`, 14, yPos);
      yPos += 6;
      doc.text(`Roll Number: ${selectedStudent.rollNumber}`, 14, yPos);
      yPos += 6;
      doc.text(`Semester: ${selectedStudent.semester}`, 14, yPos);
      doc.text(`Division: ${selectedStudent.division || 'N/A'}`, pageWidth / 2, yPos);
      yPos += 6;
      doc.text(`Email: ${selectedStudent.email}`, 14, yPos);
      yPos += 6;
      doc.text(`Report Generated: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}`, 14, yPos);
      
      yPos += 10;

      // Subject-wise Attendance Table
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Subject-wise Attendance Summary', 14, yPos);
      yPos += 8;

      const tableData = filteredSubjects.map(subject => [
        subject.subject,
        subject.totalLectures.toString(),
        subject.attendedLectures.toString(),
        subject.absentLectures.toString(),
        `${subject.attendancePercentage}%`,
        subject.subjectStatus,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Subject', 'Total', 'Present', 'Absent', 'Attendance %', 'Status']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 30, halign: 'center' },
          5: { cellWidth: 40, halign: 'center' },
        },
        didParseCell: function(data) {
          // Color-code the status column
          if (data.section === 'body' && data.column.index === 5) {
            if (data.cell.raw === 'Eligible') {
              data.cell.styles.textColor = [34, 197, 94]; // success color
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [239, 68, 68]; // destructive color
              data.cell.styles.fontStyle = 'bold';
            }
          }
          // Color-code attendance percentage
          if (data.section === 'body' && data.column.index === 4) {
            const percentage = parseInt(data.cell.raw as string);
            if (percentage >= 75) {
              data.cell.styles.textColor = [34, 197, 94]; // success
            } else if (percentage >= 70) {
              data.cell.styles.textColor = [234, 179, 8]; // warning
            } else {
              data.cell.styles.textColor = [239, 68, 68]; // destructive
            }
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      // @ts-ignore - autoTable adds finalY to doc
      yPos = doc.lastAutoTable.finalY + 10;

      // Overall Summary
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Overall Summary', 14, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const summaryData = [
        ['Total Lectures (All Subjects)', overallTotals.totalLectures.toString()],
        ['Total Present', overallTotals.totalPresent.toString()],
        ['Total Absent', overallTotals.totalAbsent.toString()],
        ['Overall Attendance Percentage', `${overallTotals.overallPercentage}%`],
        ['Semester Eligibility Status', overallTotals.eligibilityStatus],
      ];

      autoTable(doc, {
        startY: yPos,
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 100, fontStyle: 'bold' },
          1: { cellWidth: 80, halign: 'left' },
        },
      });

      // @ts-ignore
      yPos = doc.lastAutoTable.finalY + 15;

      // Eligibility Note
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(
        'Note: As per Bharati Vidyapeeth University rules, a minimum of 75% attendance is required for exam eligibility.',
        14,
        yPos,
        { maxWidth: pageWidth - 28 }
      );

      yPos += 15;

      // Signatures
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      // Teacher Signature
      doc.text('_____________________', 14, yPos + 20);
      doc.text('Subject Teacher Signature', 14, yPos + 26);
      doc.text(`Name: ${user.name}`, 14, yPos + 32);
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 14, yPos + 38);

      // HOD Signature
      doc.text('_____________________', pageWidth - 70, yPos + 20);
      doc.text('HOD Signature', pageWidth - 70, yPos + 26);
      doc.text('Department of BCA', pageWidth - 70, yPos + 32);
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 70, yPos + 38);

      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        'This is a computer-generated report from Smart Attendance System',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      // Save the PDF
      const fileName = `Attendance_Report_${selectedStudent.rollNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.success('PDF report generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={navItems}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold">Student Attendance Reports</h1>
          <p className="text-muted-foreground mt-1">
            View detailed subject-wise attendance reports for individual students
          </p>
        </div>

        {/* Student Selection Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              <CardTitle>Select Student</CardTitle>
            </div>
            <CardDescription>Choose a student to view their attendance report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="student-search">Search by Name, Roll Number, or Email</Label>
              <Input
                id="student-search"
                placeholder="Type to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>

            {/* Student Selector */}
            <div className="space-y-2">
              <Label htmlFor="student-select">Select Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger id="student-select" className="max-w-md">
                  <SelectValue placeholder="Choose a student..." />
                </SelectTrigger>
                <SelectContent>
                  {loading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                      Loading students...
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No students found
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.rollNumber} - {student.name} (Sem {student.semester})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loadingReport && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading student report...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Content */}
        {!loadingReport && selectedStudent && (
          <>
            {/* Student Info Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{selectedStudent.name}</CardTitle>
                      <CardDescription className="text-base mt-1">
                        Roll No: {selectedStudent.rollNumber} • Semester {selectedStudent.semester}
                        {selectedStudent.division && ` • ${selectedStudent.division}`}
                      </CardDescription>
                      <p className="text-sm text-muted-foreground mt-1">{selectedStudent.email}</p>
                    </div>
                  </div>
                  <Button onClick={generatePDFReport} className="gap-2" disabled={filteredSubjects.length === 0}>
                    <Download className="w-4 h-4" />
                    Download PDF Report
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Filters */}
            {subjectData.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    <CardTitle>Filters</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <Label>Semester</Label>
                    <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Semesters" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Semesters</SelectItem>
                        {[1, 2, 3, 4, 5, 6].map((sem) => (
                          <SelectItem key={sem} value={sem.toString()}>
                            Semester {sem}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Label>Subject</Label>
                    <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Subjects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {availableSubjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Subject-wise Attendance Table */}
            {filteredSubjects.length > 0 ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Subject-wise Attendance</CardTitle>
                    <CardDescription>
                      Click on any subject to view detailed information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">Present</TableHead>
                            <TableHead className="text-center">Absent</TableHead>
                            <TableHead className="text-center">Attendance %</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSubjects.map((subject) => (
                            <TableRow
                              key={subject.subjectKey}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleSubjectClick(subject)}
                            >
                              <TableCell className="font-medium">
                                {subject.subject}
                                <span className="text-xs text-muted-foreground ml-2">
                                  (Sem {subject.semester})
                                </span>
                              </TableCell>
                              <TableCell className="text-center">{subject.totalLectures}</TableCell>
                              <TableCell className="text-center text-success font-semibold">
                                {subject.attendedLectures}
                              </TableCell>
                              <TableCell className="text-center text-destructive font-semibold">
                                {subject.absentLectures}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`font-bold ${getStatusColor(subject.attendancePercentage)}`}>
                                  {subject.attendancePercentage}%
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                {getStatusBadge(subject.subjectStatus)}
                              </TableCell>
                              <TableCell>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Overall Totals */}
                <Card className="bg-secondary/5 border-secondary/20">
                  <CardHeader>
                    <CardTitle>Overall Summary (All Subjects)</CardTitle>
                    <CardDescription>
                      Aggregate attendance across all selected subjects
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Total Lectures</p>
                        <p className="text-3xl font-bold">{overallTotals.totalLectures}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Total Present</p>
                        <p className="text-3xl font-bold text-success">{overallTotals.totalPresent}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Total Absent</p>
                        <p className="text-3xl font-bold text-destructive">{overallTotals.totalAbsent}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Overall %</p>
                        <p className={`text-3xl font-bold ${getStatusColor(overallTotals.overallPercentage)}`}>
                          {overallTotals.overallPercentage}%
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Eligibility</p>
                        <div className="pt-1">
                          {overallTotals.eligibilityStatus === 'Eligible for Exam' ? (
                            <Badge className="bg-success/10 text-success border-success/20 text-base px-3 py-1" variant="outline">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Eligible
                            </Badge>
                          ) : (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-base px-3 py-1" variant="outline">
                              <XCircle className="w-4 h-4 mr-1" />
                              Not Eligible
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">University Policy:</span> As per Bharati Vidyapeeth University rules,
                        a minimum of 75% attendance is required in each subject for examination eligibility. Students below 70% are considered at risk.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="font-medium mb-2">No Attendance Data Found</p>
                    <p className="text-sm text-muted-foreground">
                      This student has not attended any lectures yet, or attendance data has not been calculated.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Empty State - No Student Selected */}
        {!loadingReport && !selectedStudent && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-2">No Student Selected</p>
                <p className="text-sm text-muted-foreground">
                  Please select a student from the dropdown above to view their attendance report
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Subject Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Subject Details: {selectedSubject?.subject}</DialogTitle>
            <DialogDescription>
              Detailed attendance information for this subject
            </DialogDescription>
          </DialogHeader>

          {selectedSubject && selectedStudent && (
            <div className="space-y-6 py-4">
              {/* Student Info */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Student Name</p>
                    <p className="font-medium">{selectedStudent.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Roll Number</p>
                    <p className="font-medium">{selectedStudent.rollNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Semester</p>
                    <p className="font-medium">{selectedSubject.semester}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Division</p>
                    <p className="font-medium">{selectedSubject.division || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Attendance Statistics */}
              <div className="space-y-4">
                <h3 className="font-semibold">Attendance Statistics</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Total Lectures</p>
                      <p className="text-2xl font-bold">{selectedSubject.totalLectures}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Present</p>
                      <p className="text-2xl font-bold text-success">{selectedSubject.attendedLectures}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Absent</p>
                      <p className="text-2xl font-bold text-destructive">{selectedSubject.absentLectures}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Percentage</p>
                      <p className={`text-2xl font-bold ${getStatusColor(selectedSubject.attendancePercentage)}`}>
                        {selectedSubject.attendancePercentage}%
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator />

              {/* Eligibility Status */}
              <div className="space-y-4">
                <h3 className="font-semibold">Eligibility Status</h3>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium mb-1">Current Status</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSubject.subjectStatus === 'Eligible'
                        ? 'Student meets the 75% attendance requirement for this subject'
                        : 'Student does not meet the 75% attendance requirement'}
                    </p>
                  </div>
                  {getStatusBadge(selectedSubject.subjectStatus)}
                </div>
              </div>

              {/* Last Updated */}
              {selectedSubject.lastUpdated && (
                <div className="text-xs text-muted-foreground text-center">
                  Last updated: {new Date(selectedSubject.lastUpdated).toLocaleString('en-IN')}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}