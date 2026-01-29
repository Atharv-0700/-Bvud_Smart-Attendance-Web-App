/**
 * Firebase Seed Data for Smart Attendance System
 * Run this script once to populate initial data in Firebase Realtime Database
 */

export const SUBJECTS_SEED_DATA = {
  // Semester 1
  'BCA101': {
    code: 'BCA101',
    name: 'C Programming',
    semester: 1,
    credits: 4,
  },
  'BCA102': {
    code: 'BCA102',
    name: 'Digital Electronics',
    semester: 1,
    credits: 4,
  },
  'BCA103': {
    code: 'BCA103',
    name: 'Mathematics I',
    semester: 1,
    credits: 4,
  },
  'BCA104': {
    code: 'BCA104',
    name: 'Communication Skills',
    semester: 1,
    credits: 3,
  },
  'BCA105': {
    code: 'BCA105',
    name: 'Computer Fundamentals',
    semester: 1,
    credits: 3,
  },

  // Semester 2
  'BCA201': {
    code: 'BCA201',
    name: 'Data Structures',
    semester: 2,
    credits: 4,
  },
  'BCA202': {
    code: 'BCA202',
    name: 'Object Oriented Programming (C++)',
    semester: 2,
    credits: 4,
  },
  'BCA203': {
    code: 'BCA203',
    name: 'Mathematics II',
    semester: 2,
    credits: 4,
  },
  'BCA204': {
    code: 'BCA204',
    name: 'Operating System',
    semester: 2,
    credits: 4,
  },
  'BCA205': {
    code: 'BCA205',
    name: 'Web Technology',
    semester: 2,
    credits: 3,
  },

  // Semester 3
  'BCA301': {
    code: 'BCA301',
    name: 'Database Management System',
    semester: 3,
    credits: 4,
  },
  'BCA302': {
    code: 'BCA302',
    name: 'Java Programming',
    semester: 3,
    credits: 4,
  },
  'BCA303': {
    code: 'BCA303',
    name: 'Computer Networks',
    semester: 3,
    credits: 4,
  },
  'BCA304': {
    code: 'BCA304',
    name: 'Software Engineering',
    semester: 3,
    credits: 4,
  },
  'BCA305': {
    code: 'BCA305',
    name: 'Discrete Mathematics',
    semester: 3,
    credits: 3,
  },

  // Semester 4
  'BCA401': {
    code: 'BCA401',
    name: 'Python Programming',
    semester: 4,
    credits: 4,
  },
  'BCA402': {
    code: 'BCA402',
    name: 'Design & Analysis of Algorithms',
    semester: 4,
    credits: 4,
  },
  'BCA403': {
    code: 'BCA403',
    name: 'Mobile Application Development',
    semester: 4,
    credits: 4,
  },
  'BCA404': {
    code: 'BCA404',
    name: 'Cloud Computing',
    semester: 4,
    credits: 4,
  },
  'BCA405': {
    code: 'BCA405',
    name: 'Statistics',
    semester: 4,
    credits: 3,
  },

  // Semester 5
  'BCA501': {
    code: 'BCA501',
    name: 'Artificial Intelligence',
    semester: 5,
    credits: 4,
  },
  'BCA502': {
    code: 'BCA502',
    name: 'Machine Learning',
    semester: 5,
    credits: 4,
  },
  'BCA503': {
    code: 'BCA503',
    name: 'Cyber Security',
    semester: 5,
    credits: 4,
  },
  'BCA504': {
    code: 'BCA504',
    name: 'Advanced Web Development',
    semester: 5,
    credits: 4,
  },
  'BCA505': {
    code: 'BCA505',
    name: 'Project Management',
    semester: 5,
    credits: 3,
  },

  // Semester 6
  'BCA601': {
    code: 'BCA601',
    name: 'Data Science',
    semester: 6,
    credits: 4,
  },
  'BCA602': {
    code: 'BCA602',
    name: 'Blockchain Technology',
    semester: 6,
    credits: 4,
  },
  'BCA603': {
    code: 'BCA603',
    name: 'Internet of Things',
    semester: 6,
    credits: 4,
  },
  'BCA604': {
    code: 'BCA604',
    name: 'Final Year Project',
    semester: 6,
    credits: 6,
  },
  'BCA605': {
    code: 'BCA605',
    name: 'Internship',
    semester: 6,
    credits: 4,
  },
};

/**
 * How to use this seed data:
 * 
 * 1. Go to Firebase Console: https://console.firebase.google.com
 * 2. Select your project (athgo-5b01d)
 * 3. Navigate to Realtime Database
 * 4. Click on the root node
 * 5. Click the + icon to add a new child
 * 6. Name it "subjects"
 * 7. Copy the JSON from SUBJECTS_SEED_DATA above
 * 8. Paste and save
 * 
 * OR use the Firebase SDK programmatically:
 * 
 * import { database } from '@/config/firebase';
 * import { ref, set } from 'firebase/database';
 * import { SUBJECTS_SEED_DATA } from '@/data/seedData';
 * 
 * async function seedSubjects() {
 *   const subjectsRef = ref(database, 'subjects');
 *   await set(subjectsRef, SUBJECTS_SEED_DATA);
 *   console.log('Subjects seeded successfully!');
 * }
 */
