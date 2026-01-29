/**
 * Enhanced Teacher Registration Component
 * Supports multi-semester, multi-division, multi-subject selection
 */

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { createTeacher, createTeacherClassMappings, getAllSubjects } from '@/services/teacherClassService';
import type { SubjectOption } from '@/types/teacherTypes';
import { Plus, Trash2, Check, AlertCircle } from 'lucide-react';

interface ClassAssignment {
  id: string;
  semester: number;
  division: 'A' | 'B';
  subjectCode: string;
  subjectName: string;
}

export default function TeacherRegistration() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    department: 'BCA',
    designation: '',
    qualification: '',
  });

  const [classAssignments, setClassAssignments] = useState<ClassAssignment[]>([]);
  const [currentAssignment, setCurrentAssignment] = useState({
    semester: 1,
    division: 'A' as 'A' | 'B',
    subjectCode: '',
    subjectName: '',
  });

  const [availableSubjects, setAvailableSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Load subjects when component mounts
  useState(() => {
    loadSubjects();
  });

  async function loadSubjects() {
    try {
      const subjects = await getAllSubjects();
      setAvailableSubjects(subjects);
    } catch (err) {
      console.error('Error loading subjects:', err);
    }
  }

  // Get subjects for selected semester
  const semesterSubjects = availableSubjects.filter(
    (s) => s.semester === currentAssignment.semester
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleAssignmentChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const { name, value } = e.target;

    if (name === 'semester') {
      setCurrentAssignment((prev) => ({
        ...prev,
        semester: parseInt(value),
        subjectCode: '',
        subjectName: '',
      }));
    } else if (name === 'division') {
      setCurrentAssignment((prev) => ({
        ...prev,
        division: value as 'A' | 'B',
      }));
    } else if (name === 'subjectCode') {
      const subject = semesterSubjects.find((s) => s.code === value);
      setCurrentAssignment((prev) => ({
        ...prev,
        subjectCode: value,
        subjectName: subject?.name || '',
      }));
    }
  }

  function addClassAssignment() {
    if (!currentAssignment.subjectCode || !currentAssignment.subjectName) {
      setError('Please select a subject');
      return;
    }

    // Check for duplicates
    const duplicate = classAssignments.find(
      (a) =>
        a.semester === currentAssignment.semester &&
        a.division === currentAssignment.division &&
        a.subjectCode === currentAssignment.subjectCode
    );

    if (duplicate) {
      setError('This class assignment already exists');
      return;
    }

    const newAssignment: ClassAssignment = {
      id: Date.now().toString(),
      ...currentAssignment,
    };

    setClassAssignments((prev) => [...prev, newAssignment]);
    setCurrentAssignment({
      semester: 1,
      division: 'A',
      subjectCode: '',
      subjectName: '',
    });
    setError('');
  }

  function removeClassAssignment(id: string) {
    setClassAssignments((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (classAssignments.length === 0) {
      setError('Please add at least one class assignment');
      return;
    }

    setLoading(true);

    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const uid = userCredential.user.uid;

      // 2. Create teacher profile (without embedded class info)
      const teacherId = await createTeacher({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        designation: formData.designation,
        qualification: formData.qualification,
        status: 'active',
        uid,
      });

      // 3. Create teacher-class mappings
      await createTeacherClassMappings(
        teacherId,
        classAssignments.map((a) => ({
          semester: a.semester,
          division: a.division,
          subjectCode: a.subjectCode,
          subjectName: a.subjectName,
        }))
      );

      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        department: 'BCA',
        designation: '',
        qualification: '',
      });
      setClassAssignments([]);

      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already registered');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Teacher Registration</h1>
            <p className="text-gray-600 mt-2">
              Smart Attendance System - Bharati Vidyapeeth University
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <Check className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-green-800 font-semibold">Registration Successful!</p>
                <p className="text-green-600 text-sm">Redirecting to login page...</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your.email@bvdu.edu.in"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Re-enter password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+91 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="BCA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Assistant Professor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Qualification
                  </label>
                  <input
                    type="text"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="M.Tech, Ph.D"
                  />
                </div>
              </div>
            </div>

            {/* Class Assignments */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Class Assignments (Multi-Semester Support)
              </h2>

              {/* Add Assignment Form */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Semester
                    </label>
                    <select
                      name="semester"
                      value={currentAssignment.semester}
                      onChange={handleAssignmentChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {[1, 2, 3, 4, 5, 6].map((sem) => (
                        <option key={sem} value={sem}>
                          Semester {sem}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Division
                    </label>
                    <select
                      name="division"
                      value={currentAssignment.division}
                      onChange={handleAssignmentChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="A">Division A</option>
                      <option value="B">Division B</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <select
                      name="subjectCode"
                      value={currentAssignment.subjectCode}
                      onChange={handleAssignmentChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Subject</option>
                      {semesterSubjects.map((subject) => (
                        <option key={subject.code} value={subject.code}>
                          {subject.code} - {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addClassAssignment}
                  className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Class Assignment
                </button>
              </div>

              {/* Assignment List */}
              {classAssignments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-2">
                    {classAssignments.length} class(es) assigned
                  </p>
                  {classAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          Sem {assignment.semester} - Div {assignment.division}:{' '}
                          {assignment.subjectCode}
                        </p>
                        <p className="text-sm text-gray-600">{assignment.subjectName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeClassAssignment(assignment.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {classAssignments.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  No class assignments added yet. Please add at least one class.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading || classAssignments.length === 0}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Registering...' : 'Register as Teacher'}
              </button>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <a href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Login here
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
