/**
 * Teacher Class Mapping Service
 * Manages normalized teacher-to-class assignments
 */

import { database } from '@/config/firebase';
import { ref, set, get, push, query, orderByChild, equalTo, update, remove } from 'firebase/database';
import type { Teacher, TeacherClassMapping, SubjectOption } from '@/types/teacherTypes';

/**
 * Create a new teacher profile (without embedded class info)
 */
export async function createTeacher(teacherData: Omit<Teacher, 'teacherId' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const teacherRef = push(ref(database, 'teachers'));
  const teacherId = teacherRef.key!;

  const teacher: Teacher = {
    ...teacherData,
    teacherId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await set(teacherRef, teacher);
  return teacherId;
}

/**
 * Create teacher-class mappings
 */
export async function createTeacherClassMappings(
  teacherId: string,
  classAssignments: Array<{
    semester: number;
    division: 'A' | 'B';
    subjectCode: string;
    subjectName: string;
  }>
): Promise<void> {
  const mappingPromises = classAssignments.map(async (assignment) => {
    const mappingRef = push(ref(database, 'teacherClassMappings'));
    const mappingId = mappingRef.key!;

    const mapping: TeacherClassMapping = {
      mappingId,
      teacherId,
      semester: assignment.semester,
      division: assignment.division,
      subjectCode: assignment.subjectCode,
      subjectName: assignment.subjectName,
      createdAt: Date.now(),
      isActive: true,
    };

    await set(mappingRef, mapping);
  });

  await Promise.all(mappingPromises);
}

/**
 * Get teacher by UID (Firebase Auth UID)
 */
export async function getTeacherByUID(uid: string): Promise<Teacher | null> {
  const teachersRef = ref(database, 'teachers');
  const teacherQuery = query(teachersRef, orderByChild('uid'), equalTo(uid));
  const snapshot = await get(teacherQuery);

  if (!snapshot.exists()) {
    return null;
  }

  const teacherData = Object.values(snapshot.val())[0] as Teacher;
  return teacherData;
}

/**
 * Get teacher by ID
 */
export async function getTeacherById(teacherId: string): Promise<Teacher | null> {
  const teacherRef = ref(database, `teachers/${teacherId}`);
  const snapshot = await get(teacherRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val() as Teacher;
}

/**
 * Get all class mappings for a teacher
 */
export async function getTeacherClassMappings(teacherId: string): Promise<TeacherClassMapping[]> {
  const mappingsRef = ref(database, 'teacherClassMappings');
  const mappingQuery = query(mappingsRef, orderByChild('teacherId'), equalTo(teacherId));
  const snapshot = await get(mappingQuery);

  if (!snapshot.exists()) {
    return [];
  }

  const mappings = Object.values(snapshot.val()) as TeacherClassMapping[];
  return mappings.filter((m) => m.isActive);
}

/**
 * Get unique semesters taught by a teacher
 */
export async function getTeacherSemesters(teacherId: string): Promise<number[]> {
  const mappings = await getTeacherClassMappings(teacherId);
  const semesters = [...new Set(mappings.map((m) => m.semester))];
  return semesters.sort((a, b) => a - b);
}

/**
 * Get divisions for a teacher's semester
 */
export async function getTeacherDivisions(teacherId: string, semester: number): Promise<('A' | 'B')[]> {
  const mappings = await getTeacherClassMappings(teacherId);
  const semesterMappings = mappings.filter((m) => m.semester === semester);
  const divisions = [...new Set(semesterMappings.map((m) => m.division))];
  return divisions.sort();
}

/**
 * Get subjects for a teacher's semester and division
 */
export async function getTeacherSubjects(
  teacherId: string,
  semester: number,
  division: 'A' | 'B'
): Promise<Array<{ code: string; name: string }>> {
  const mappings = await getTeacherClassMappings(teacherId);
  const filteredMappings = mappings.filter((m) => m.semester === semester && m.division === division);

  return filteredMappings.map((m) => ({
    code: m.subjectCode,
    name: m.subjectName,
  }));
}

/**
 * Add a new class mapping for a teacher
 */
export async function addTeacherClassMapping(
  teacherId: string,
  semester: number,
  division: 'A' | 'B',
  subjectCode: string,
  subjectName: string
): Promise<string> {
  const mappingRef = push(ref(database, 'teacherClassMappings'));
  const mappingId = mappingRef.key!;

  const mapping: TeacherClassMapping = {
    mappingId,
    teacherId,
    semester,
    division,
    subjectCode,
    subjectName,
    createdAt: Date.now(),
    isActive: true,
  };

  await set(mappingRef, mapping);
  return mappingId;
}

/**
 * Remove a class mapping
 */
export async function removeTeacherClassMapping(mappingId: string): Promise<void> {
  const mappingRef = ref(database, `teacherClassMappings/${mappingId}`);
  await update(mappingRef, { isActive: false });
}

/**
 * Update teacher profile
 */
export async function updateTeacher(teacherId: string, updates: Partial<Teacher>): Promise<void> {
  const teacherRef = ref(database, `teachers/${teacherId}`);
  await update(teacherRef, {
    ...updates,
    updatedAt: Date.now(),
  });
}

/**
 * Get all available subjects (for registration)
 */
export async function getAllSubjects(): Promise<SubjectOption[]> {
  const subjectsRef = ref(database, 'subjects');
  const snapshot = await get(subjectsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const subjects = Object.values(snapshot.val()) as SubjectOption[];
  return subjects.sort((a, b) => a.semester - b.semester || a.code.localeCompare(b.code));
}

/**
 * Get subjects for a specific semester
 */
export async function getSubjectsBySemester(semester: number): Promise<SubjectOption[]> {
  const allSubjects = await getAllSubjects();
  return allSubjects.filter((s) => s.semester === semester);
}

/**
 * Check if a teacher can teach a specific class (has mapping)
 */
export async function canTeachClass(
  teacherId: string,
  semester: number,
  division: 'A' | 'B',
  subjectCode: string
): Promise<boolean> {
  const mappings = await getTeacherClassMappings(teacherId);
  return mappings.some(
    (m) => m.semester === semester && m.division === division && m.subjectCode === subjectCode && m.isActive
  );
}
