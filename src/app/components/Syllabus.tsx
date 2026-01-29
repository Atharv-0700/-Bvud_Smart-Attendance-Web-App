import { User } from '../App';
import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Home, QrCode, History, BookOpen, PlayCircle, BarChart3, Code, Database, Globe, Cpu, Box, MessageCircle, Shield, FileEdit } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';

interface SyllabusProps {
  user: User;
  onLogout: () => void;
}

export function Syllabus({ user, onLogout }: SyllabusProps) {
  const navItems = user.role === 'student' ? [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/student' },
    { label: 'Scan QR', icon: <QrCode className="w-5 h-5" />, path: '/student/qr-scan' },
    { label: 'Attendance History', icon: <History className="w-5 h-5" />, path: '/student/attendance' },
    { label: 'BCA Syllabus', icon: <BookOpen className="w-5 h-5" />, path: '/student/syllabus' },
  ] : [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/teacher' },
    { label: 'Start Lecture', icon: <PlayCircle className="w-5 h-5" />, path: '/teacher/start-lecture' },
    { label: 'Reports', icon: <BarChart3 className="w-5 h-5" />, path: '/teacher/reports' },
    { label: 'BCA Syllabus', icon: <BookOpen className="w-5 h-5" />, path: '/teacher/syllabus' },
    { label: 'Device Security', icon: <Shield className="w-5 h-5" />, path: '/teacher/device-management' },
  ];

  const syllabusData = {
    1: [
      { name: 'Fundamentals of IT', credits: 4, icon: Cpu, description: 'Introduction to computers and information technology' },
      { name: 'C Programming', credits: 4, icon: Code, description: 'Fundamentals of C programming language' },
      { name: 'Digital Electronics', credits: 3, icon: Box, description: 'Basic digital logic and circuits' },
      { name: 'Mathematics I', credits: 4, icon: BookOpen, description: 'Calculus and algebra fundamentals' },
      { name: 'Communication Skills', credits: 3, icon: MessageCircle, description: 'Professional communication and writing' },
    ],
    2: [
      { name: 'Data Structures', credits: 4, icon: Database, description: 'Arrays, linked lists, trees, and graphs' },
      { name: 'Object Oriented Programming', credits: 4, icon: Code, description: 'OOP concepts using C++/Java' },
      { name: 'Computer Organization', credits: 3, icon: Cpu, description: 'Computer architecture and organization' },
      { name: 'Mathematics II', credits: 4, icon: BookOpen, description: 'Discrete mathematics and statistics' },
      { name: 'Environmental Studies', credits: 2, icon: Globe, description: 'Environmental awareness and sustainability' },
    ],
    3: [
      { name: 'Database Management', credits: 4, icon: Database, description: 'SQL, DBMS concepts, normalization' },
      { name: 'Operating System', credits: 4, icon: Cpu, description: 'Process management, memory, file systems' },
      { name: 'Web Technology', credits: 4, icon: Globe, description: 'HTML, CSS, JavaScript, and web development' },
      { name: 'Software Engineering', credits: 3, icon: Code, description: 'SDLC, testing, project management' },
      { name: 'Computer Networks', credits: 3, icon: Globe, description: 'Network protocols and architecture' },
    ],
    4: [
      { name: 'Java Programming', credits: 4, icon: Code, description: 'Advanced Java and J2EE concepts' },
      { name: 'Python Programming', credits: 4, icon: Code, description: 'Python syntax, libraries, and applications' },
      { name: 'Theory of Computation', credits: 3, icon: BookOpen, description: 'Automata theory and formal languages' },
      { name: 'Microprocessor', credits: 4, icon: Cpu, description: '8086 microprocessor and assembly' },
      { name: 'Numerical Methods', credits: 3, icon: BookOpen, description: 'Numerical analysis and techniques' },
    ],
    5: [
      { name: 'Advanced Java', credits: 4, icon: Code, description: 'Servlets, JSP, Spring framework' },
      { name: 'PHP Programming', credits: 4, icon: Globe, description: 'Server-side scripting with PHP' },
      { name: 'Android Development', credits: 4, icon: Code, description: 'Mobile app development using Android' },
      { name: 'Data Mining', credits: 3, icon: Database, description: 'Data analysis and knowledge discovery' },
      { name: 'Cloud Computing', credits: 3, icon: Cpu, description: 'Cloud services and deployment models' },
    ],
    6: [
      { name: 'Machine Learning', credits: 4, icon: Cpu, description: 'ML algorithms and applications' },
      { name: 'Information Security', credits: 3, icon: Box, description: 'Cryptography and network security' },
      { name: 'Internet of Things', credits: 4, icon: Globe, description: 'IoT architecture and applications' },
      { name: 'Project Work', credits: 6, icon: Code, description: 'Final year project development' },
      { name: 'Elective', credits: 3, icon: BookOpen, description: 'Choose from available electives' },
    ],
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={navItems}>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">BCA Syllabus</h1>
          <p className="text-muted-foreground mt-1">
            Bachelor of Computer Applications - Bharati Vidyapeeth University
          </p>
        </div>

        <Tabs defaultValue={user.semester?.toString() || '1'} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((sem) => (
              <TabsTrigger key={sem} value={sem.toString()}>
                Sem {sem}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(syllabusData).map(([semester, subjects]) => (
            <TabsContent key={semester} value={semester} className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Semester {semester}</CardTitle>
                  <CardDescription>
                    {subjects.reduce((sum, s) => sum + s.credits, 0)} total credits
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {subjects.map((subject) => (
                      <Card key={subject.name} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-primary/10 text-primary">
                              <subject.icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <h3 className="font-semibold text-lg">{subject.name}</h3>
                                <Badge variant="secondary">{subject.credits} Credits</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{subject.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Course Information */}
        <Card>
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-semibold">3 Years (6 Semesters)</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Credits</p>
                <p className="font-semibold">120 Credits</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-semibold">BCA - Bharati Vidyapeeth University</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mode</p>
                <p className="font-semibold">Regular / Full-time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}