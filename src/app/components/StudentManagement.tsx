import React, { useState, useEffect } from 'react';
import { database } from '@/config/firebase';
import { ref, set, get, push, update } from 'firebase/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { UserPlus, Upload, AlertCircle, CheckCircle2, Trash2, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Student {
  id: string;
  name: string;
  roll_no: string;
  class_id: string;
}

export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [classId, setClassId] = useState('');

  const classes = [
    'BCA_1A', 'BCA_1B',
    'BCA_2A', 'BCA_2B',
    'BCA_3A', 'BCA_3B'
  ];

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const studentsRef = ref(database, 'students');
      const snapshot = await get(studentsRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const studentsList: Student[] = Object.entries(data).map(([id, student]: [string, any]) => ({
          id,
          name: student.name,
          roll_no: student.roll_no,
          class_id: student.class_id
        }));
        
        // Sort by class_id and then roll_no
        studentsList.sort((a, b) => {
          if (a.class_id !== b.class_id) {
            return a.class_id.localeCompare(b.class_id);
          }
          return String(a.roll_no).localeCompare(String(b.roll_no), undefined, { numeric: true });
        });
        
        setStudents(studentsList);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !rollNo.trim() || !classId) {
      toast.error('Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      // Generate unique student ID
      const studentId = `stu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const studentData = {
        name: name.trim(),
        roll_no: rollNo.trim(),
        class_id: classId
      };

      // Add student to /students path without overwriting existing data
      const studentRef = ref(database, `students/${studentId}`);
      await set(studentRef, studentData);
      
      toast.success(`Student ${name} added successfully!`);
      
      // Reset form
      setName('');
      setRollNo('');
      setClassId('');
      
      // Reload students
      await loadStudents();
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error('Failed to add student');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpload = async () => {
    setSaving(true);
    try {
      const sampleStudents = {
        "stu_001": {
          "name": "Atharva Sharma",
          "roll_no": "1",
          "class_id": "BCA_1A"
        },
        "stu_002": {
          "name": "Priya Patel",
          "roll_no": "2",
          "class_id": "BCA_1A"
        },
        "stu_003": {
          "name": "Rahul Kumar",
          "roll_no": "3",
          "class_id": "BCA_1A"
        },
        "stu_004": {
          "name": "Sneha Desai",
          "roll_no": "4",
          "class_id": "BCA_1A"
        },
        "stu_005": {
          "name": "Arjun Nair",
          "roll_no": "5",
          "class_id": "BCA_1A"
        },
        "stu_006": {
          "name": "Aisha Khan",
          "roll_no": "6",
          "class_id": "BCA_1A"
        },
        "stu_007": {
          "name": "Rohan Mehta",
          "roll_no": "7",
          "class_id": "BCA_1A"
        },
        "stu_008": {
          "name": "Divya Singh",
          "roll_no": "8",
          "class_id": "BCA_1A"
        },
        "stu_009": {
          "name": "Karan Verma",
          "roll_no": "9",
          "class_id": "BCA_1A"
        },
        "stu_010": {
          "name": "Pooja Reddy",
          "roll_no": "10",
          "class_id": "BCA_1A"
        },
        "stu_011": {
          "name": "Vikram Joshi",
          "roll_no": "11",
          "class_id": "BCA_1A"
        },
        "stu_012": {
          "name": "Ananya Gupta",
          "roll_no": "12",
          "class_id": "BCA_1A"
        },
        "stu_013": {
          "name": "Siddharth Rao",
          "roll_no": "13",
          "class_id": "BCA_1A"
        },
        "stu_014": {
          "name": "Neha Agarwal",
          "roll_no": "14",
          "class_id": "BCA_1A"
        },
        "stu_015": {
          "name": "Aditya Kulkarni",
          "roll_no": "15",
          "class_id": "BCA_1A"
        },
        "stu_016": {
          "name": "Riya Chopra",
          "roll_no": "16",
          "class_id": "BCA_1A"
        },
        "stu_017": {
          "name": "Varun Iyer",
          "roll_no": "17",
          "class_id": "BCA_1A"
        },
        "stu_018": {
          "name": "Kavya Menon",
          "roll_no": "18",
          "class_id": "BCA_1A"
        },
        "stu_019": {
          "name": "Harsh Pandey",
          "roll_no": "19",
          "class_id": "BCA_1A"
        },
        "stu_020": {
          "name": "Simran Bhatia",
          "roll_no": "20",
          "class_id": "BCA_1A"
        },
        "stu_021": {
          "name": "Arnav Saxena",
          "roll_no": "21",
          "class_id": "BCA_2A"
        },
        "stu_022": {
          "name": "Ishita Malhotra",
          "roll_no": "22",
          "class_id": "BCA_2A"
        },
        "stu_023": {
          "name": "Kabir Shetty",
          "roll_no": "23",
          "class_id": "BCA_2A"
        },
        "stu_024": {
          "name": "Tanvi Kapoor",
          "roll_no": "24",
          "class_id": "BCA_2A"
        },
        "stu_025": {
          "name": "Yash Thakur",
          "roll_no": "25",
          "class_id": "BCA_2A"
        },
        "stu_026": {
          "name": "Mira Pillai",
          "roll_no": "26",
          "class_id": "BCA_2A"
        },
        "stu_027": {
          "name": "Dev Bhatt",
          "roll_no": "27",
          "class_id": "BCA_2A"
        },
        "stu_028": {
          "name": "Sanya Rawal",
          "roll_no": "28",
          "class_id": "BCA_2A"
        },
        "stu_029": {
          "name": "Nikhil Dutta",
          "roll_no": "29",
          "class_id": "BCA_2A"
        },
        "stu_030": {
          "name": "Aarohi Bansal",
          "roll_no": "30",
          "class_id": "BCA_2A"
        }
      };

      // Check if students node exists
      const studentsRef = ref(database, 'students');
      const snapshot = await get(studentsRef);
      
      if (snapshot.exists()) {
        toast.error('Students data already exists! Use "Add Single Student" to avoid overwriting.');
        setSaving(false);
        return;
      }

      // Upload sample students
      await update(ref(database, 'students'), sampleStudents);
      
      toast.success('30 sample students uploaded successfully!');
      await loadStudents();
    } catch (error) {
      console.error('Error uploading students:', error);
      toast.error('Failed to upload students');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}?`)) {
      return;
    }

    try {
      const studentRef = ref(database, `students/${studentId}`);
      await set(studentRef, null);
      
      toast.success(`Student ${studentName} deleted successfully!`);
      await loadStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    }
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify({ students }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `students_export_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Students exported successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Student Management</h1>
        <p className="text-muted-foreground mt-2">
          Add and manage student records in Firebase Realtime Database
        </p>
      </div>

      {/* Alert Info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> This interface safely adds students to <code>/students</code> path in Firebase.
          All existing data will remain intact. Students are stored with unique IDs.
        </AlertDescription>
      </Alert>

      {/* Add Student Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add New Student
          </CardTitle>
          <CardDescription>
            Add a single student to the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Student Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="roll_no">Roll Number</Label>
                <Input
                  id="roll_no"
                  placeholder="e.g., BCA01 or 1"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="class_id">Class</Label>
                <Select value={classId} onValueChange={setClassId} required>
                  <SelectTrigger id="class_id">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={saving} className="w-full md:w-auto">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Student
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Bulk Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Upload Sample Students
          </CardTitle>
          <CardDescription>
            Upload 30 pre-defined sample students (BCA 1A & 2A)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will only work if the <code>/students</code> node doesn't exist yet.
              If students already exist, use "Add New Student" instead to avoid data loss.
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={handleBulkUpload} 
            disabled={saving || students.length > 0}
            variant="secondary"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload 30 Sample Students
              </>
            )}
          </Button>
          
          {students.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              ⚠️ Students already exist in database. Bulk upload is disabled.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Student List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Existing Students ({students.length})</CardTitle>
              <CardDescription>
                All students currently in the database
              </CardDescription>
            </div>
            {students.length > 0 && (
              <Button onClick={exportToJSON} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No students found in database</p>
              <p className="text-sm mt-2">Add your first student using the form above</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono text-xs">{student.id}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.roll_no}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium">
                          {student.class_id}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Summary */}
      {students.length > 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <strong>Success!</strong> Database at <code>/students</code> contains {students.length} student records.
            All existing data is preserved.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}