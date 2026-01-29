/**
 * Testing and Demo Script for Monthly Attendance System
 * 
 * Use this to test the monthly attendance calculation system
 * Run from browser console or as part of integration tests
 */

import { MonthlyAttendanceAPI } from '../services/monthlyAttendanceAPI';
import { getCurrentMonthYear, getPreviousMonthYear } from './dateUtils';

/**
 * Test Suite for Monthly Attendance System
 */
export class MonthlyAttendanceTestSuite {
  private teacherId: string;
  
  constructor(teacherId: string) {
    this.teacherId = teacherId;
  }
  
  /**
   * Test 1: Basic Calculation
   */
  async testBasicCalculation(): Promise<void> {
    console.log('\n=== TEST 1: Basic Calculation ===');
    
    const { previous } = MonthlyAttendanceAPI.getMonthInfo();
    
    const result = await MonthlyAttendanceAPI.calculate({
      year: previous.year,
      month: previous.month,
      subject: 'Test Subject',
      semester: 3,
      division: 'A'
    });
    
    console.log('Result:', result);
    
    if (result.success) {
      console.log('✅ Basic calculation passed');
    } else {
      console.log('❌ Basic calculation failed:', result.message);
    }
  }
  
  /**
   * Test 2: Check if Data Exists
   */
  async testDataExists(): Promise<void> {
    console.log('\n=== TEST 2: Data Exists Check ===');
    
    const { previous } = MonthlyAttendanceAPI.getMonthInfo();
    
    const exists = await MonthlyAttendanceAPI.exists({
      year: previous.year,
      month: previous.month,
      subject: 'Test Subject',
      semester: 3,
      division: 'A'
    });
    
    console.log('Data exists:', exists);
    
    if (typeof exists === 'boolean') {
      console.log('✅ Data exists check passed');
    } else {
      console.log('❌ Data exists check failed');
    }
  }
  
  /**
   * Test 3: Get Statistics
   */
  async testGetStatistics(): Promise<void> {
    console.log('\n=== TEST 3: Get Statistics ===');
    
    const { previous } = MonthlyAttendanceAPI.getMonthInfo();
    
    const stats = await MonthlyAttendanceAPI.getStatistics({
      year: previous.year,
      month: previous.month,
      subject: 'Test Subject',
      semester: 3,
      division: 'A'
    });
    
    console.log('Statistics:', stats);
    
    if (stats && typeof stats.totalStudents === 'number') {
      console.log('✅ Get statistics passed');
      console.log(`   Total Students: ${stats.totalStudents}`);
      console.log(`   Eligible: ${stats.eligible}`);
      console.log(`   Not Eligible: ${stats.notEligible}`);
      console.log(`   Average: ${stats.averageAttendance}%`);
    } else {
      console.log('❌ Get statistics failed');
    }
  }
  
  /**
   * Test 4: Get Data
   */
  async testGetData(): Promise<void> {
    console.log('\n=== TEST 4: Get Data ===');
    
    const { previous } = MonthlyAttendanceAPI.getMonthInfo();
    
    const data = await MonthlyAttendanceAPI.getData({
      year: previous.year,
      month: previous.month,
      subject: 'Test Subject',
      semester: 3,
      division: 'A'
    });
    
    console.log('Data retrieved:', data.length, 'students');
    
    if (Array.isArray(data)) {
      console.log('✅ Get data passed');
      
      if (data.length > 0) {
        console.log('   Sample student:', {
          name: data[0].studentName,
          rollNumber: data[0].rollNumber,
          percentage: data[0].attendancePercentage,
          status: data[0].eligibilityStatus
        });
      }
    } else {
      console.log('❌ Get data failed');
    }
  }
  
  /**
   * Test 5: Health Check
   */
  async testHealthCheck(): Promise<void> {
    console.log('\n=== TEST 5: Health Check ===');
    
    const health = await MonthlyAttendanceAPI.healthCheck();
    
    console.log('Health status:', health);
    
    if (health.healthy) {
      console.log('✅ Health check passed');
      console.log(`   Database: ${health.details.database}`);
      console.log(`   Latency: ${health.details.latency}ms`);
      console.log(`   Cache size: ${health.details.cacheSize}`);
    } else {
      console.log('❌ Health check failed:', health.message);
    }
  }
  
  /**
   * Test 6: Find Subjects Needing Calculation
   */
  async testFindSubjects(): Promise<void> {
    console.log('\n=== TEST 6: Find Subjects Needing Calculation ===');
    
    const { previous } = MonthlyAttendanceAPI.getMonthInfo();
    
    const subjects = await MonthlyAttendanceAPI.getSubjectsToCalculate(
      previous.year,
      previous.month
    );
    
    console.log('Subjects needing calculation:', subjects.length);
    
    if (Array.isArray(subjects)) {
      console.log('✅ Find subjects passed');
      
      subjects.forEach(s => {
        console.log(`   - ${s.subject} (Sem ${s.semester}, Div ${s.division}) - ${s.lectureCount} lectures`);
      });
    } else {
      console.log('❌ Find subjects failed');
    }
  }
  
  /**
   * Test 7: Validation
   */
  async testValidation(): Promise<void> {
    console.log('\n=== TEST 7: Input Validation ===');
    
    // Test invalid year
    const result1 = await MonthlyAttendanceAPI.calculate({
      year: 1900, // Invalid
      month: 1,
      subject: 'Test',
      semester: 3
    });
    
    if (!result1.success && result1.message.includes('year')) {
      console.log('✅ Year validation passed');
    } else {
      console.log('❌ Year validation failed');
    }
    
    // Test invalid month
    const result2 = await MonthlyAttendanceAPI.calculate({
      year: 2025,
      month: 13, // Invalid
      subject: 'Test',
      semester: 3
    });
    
    if (!result2.success && result2.message.includes('month')) {
      console.log('✅ Month validation passed');
    } else {
      console.log('❌ Month validation failed');
    }
    
    // Test invalid semester
    const result3 = await MonthlyAttendanceAPI.calculate({
      year: 2025,
      month: 1,
      subject: 'Test',
      semester: 10 // Invalid
    });
    
    if (!result3.success && result3.message.includes('semester')) {
      console.log('✅ Semester validation passed');
    } else {
      console.log('❌ Semester validation failed');
    }
  }
  
  /**
   * Test 8: Idempotent Calculation
   */
  async testIdempotent(): Promise<void> {
    console.log('\n=== TEST 8: Idempotent Calculation ===');
    
    const { previous } = MonthlyAttendanceAPI.getMonthInfo();
    
    const params = {
      year: previous.year,
      month: previous.month,
      subject: 'Idempotent Test',
      semester: 3,
      division: 'A'
    };
    
    // First calculation
    const result1 = await MonthlyAttendanceAPI.calculate(params);
    console.log('First calculation:', result1.success ? 'Success' : 'Failed');
    
    // Second calculation (should be skipped)
    const result2 = await MonthlyAttendanceAPI.calculate(params);
    console.log('Second calculation:', result2.message);
    
    if (!result2.success && result2.message.includes('already exists')) {
      console.log('✅ Idempotent test passed - duplicate prevented');
    } else {
      console.log('❌ Idempotent test failed');
    }
    
    // Force recalculation
    const result3 = await MonthlyAttendanceAPI.calculate(params, { 
      forceRecalculate: true 
    });
    console.log('Force recalculation:', result3.success ? 'Success' : 'Failed');
    
    if (result3.success) {
      console.log('✅ Force recalculation passed');
    }
  }
  
  /**
   * Run All Tests
   */
  async runAllTests(): Promise<void> {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║  MONTHLY ATTENDANCE SYSTEM - TEST SUITE          ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');
    
    const startTime = Date.now();
    
    try {
      await this.testHealthCheck();
      await this.testValidation();
      await this.testBasicCalculation();
      await this.testDataExists();
      await this.testGetData();
      await this.testGetStatistics();
      await this.testFindSubjects();
      await this.testIdempotent();
      
      const duration = Date.now() - startTime;
      
      console.log('\n');
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║  ALL TESTS COMPLETED                             ║');
      console.log(`║  Duration: ${duration}ms                              ║`);
      console.log('╚═══════════════════════════════════════════════════╝');
      console.log('');
    } catch (error) {
      console.error('\n❌ Test suite failed with error:', error);
    }
  }
}

/**
 * Quick Demo - Generate Report for Previous Month
 */
export async function demoGenerateReport(teacherId: string, subject: string, semester: number, division?: string): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  MONTHLY ATTENDANCE - QUICK DEMO                 ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');
  
  const { previous } = MonthlyAttendanceAPI.getMonthInfo();
  
  console.log(`Generating report for ${subject} (Semester ${semester})`);
  console.log(`Month: ${previous.month}/${previous.year}`);
  console.log('');
  
  const result = await MonthlyAttendanceAPI.generateAndDownload(
    {
      year: previous.year,
      month: previous.month,
      subject,
      semester,
      division
    },
    teacherId,
    'both'
  );
  
  console.log('');
  console.log('Result:', result.message);
  console.log('');
  
  if (result.success) {
    console.log('✅ Reports generated and downloaded successfully!');
    console.log('   Check your Downloads folder for:');
    console.log(`   - Attendance_${subject.replace(/\s+/g, '')}_Sem${semester}_${division || 'all'}_*.xlsx`);
    console.log(`   - Attendance_${subject.replace(/\s+/g, '')}_Sem${semester}_${division || 'all'}_*.pdf`);
  } else {
    console.log('❌ Report generation failed');
  }
  
  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  DEMO COMPLETED                                  ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');
}

/**
 * Demo - Show Monthly Statistics
 */
export async function demoShowStatistics(subject: string, semester: number, division?: string): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  MONTHLY ATTENDANCE STATISTICS                   ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');
  
  const { previous } = MonthlyAttendanceAPI.getMonthInfo();
  
  const stats = await MonthlyAttendanceAPI.getStatistics({
    year: previous.year,
    month: previous.month,
    subject,
    semester,
    division
  });
  
  console.log(`Subject: ${subject}`);
  console.log(`Semester: ${semester}`);
  console.log(`Division: ${division || 'All'}`);
  console.log(`Month: ${previous.month}/${previous.year}`);
  console.log('');
  console.log('─'.repeat(50));
  console.log('');
  console.log(`Total Students:     ${stats.totalStudents}`);
  console.log(`Total Lectures:     ${stats.totalLectures}`);
  console.log(`Eligible (≥75%):    ${stats.eligible}`);
  console.log(`Not Eligible (<75%):${stats.notEligible}`);
  console.log(`Average Attendance: ${stats.averageAttendance.toFixed(2)}%`);
  console.log('');
  console.log('─'.repeat(50));
  console.log('');
}

/**
 * Demo - List All Subjects Needing Calculation
 */
export async function demoListSubjects(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  SUBJECTS NEEDING MONTHLY CALCULATION            ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');
  
  const { previous } = MonthlyAttendanceAPI.getMonthInfo();
  
  console.log(`Month: ${previous.month}/${previous.year}`);
  console.log('');
  
  const subjects = await MonthlyAttendanceAPI.getSubjectsToCalculate(
    previous.year,
    previous.month
  );
  
  if (subjects.length === 0) {
    console.log('✅ All subjects have been calculated!');
  } else {
    console.log(`Found ${subjects.length} subjects needing calculation:`);
    console.log('');
    
    subjects.forEach((s, index) => {
      console.log(`${index + 1}. ${s.subject}`);
      console.log(`   Semester: ${s.semester}`);
      console.log(`   Division: ${s.division}`);
      console.log(`   Lectures: ${s.lectureCount}`);
      console.log('');
    });
  }
  
  console.log('─'.repeat(50));
  console.log('');
}

/**
 * Export for browser console usage
 */
if (typeof window !== 'undefined') {
  (window as any).MonthlyAttendanceDemo = {
    generateReport: demoGenerateReport,
    showStatistics: demoShowStatistics,
    listSubjects: demoListSubjects,
    runTests: (teacherId: string) => new MonthlyAttendanceTestSuite(teacherId).runAllTests(),
  };
  
  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  MONTHLY ATTENDANCE DEMO LOADED                  ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');
  console.log('Usage in browser console:');
  console.log('');
  console.log('1. Generate Report:');
  console.log('   MonthlyAttendanceDemo.generateReport("teacherId", "Subject", 3, "A")');
  console.log('');
  console.log('2. Show Statistics:');
  console.log('   MonthlyAttendanceDemo.showStatistics("Subject", 3, "A")');
  console.log('');
  console.log('3. List Subjects:');
  console.log('   MonthlyAttendanceDemo.listSubjects()');
  console.log('');
  console.log('4. Run Tests:');
  console.log('   MonthlyAttendanceDemo.runTests("teacherId")');
  console.log('');
}
