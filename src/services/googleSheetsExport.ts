/**
 * Google Sheets Export Service
 * Automatically exports attendance to division-specific Google Sheets
 * Naming convention: "Attendance_Sem{X}_Div{A/B}"
 */

import type { GoogleSheetExportData } from '@/types/sessionTypes';

// Google Sheets Configuration
const GOOGLE_SHEETS_CONFIG = {
  apiKey: import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || '',
  clientId: import.meta.env.VITE_GOOGLE_SHEETS_CLIENT_ID || '',
  spreadsheetIdDivA: {
    sem1: import.meta.env.VITE_SHEET_SEM1_DIVA || '',
    sem2: import.meta.env.VITE_SHEET_SEM2_DIVA || '',
    sem3: import.meta.env.VITE_SHEET_SEM3_DIVA || '',
    sem4: import.meta.env.VITE_SHEET_SEM4_DIVA || '',
    sem5: import.meta.env.VITE_SHEET_SEM5_DIVA || '',
    sem6: import.meta.env.VITE_SHEET_SEM6_DIVA || '',
  },
  spreadsheetIdDivB: {
    sem1: import.meta.env.VITE_SHEET_SEM1_DIVB || '',
    sem2: import.meta.env.VITE_SHEET_SEM2_DIVB || '',
    sem3: import.meta.env.VITE_SHEET_SEM3_DIVB || '',
    sem4: import.meta.env.VITE_SHEET_SEM4_DIVB || '',
    sem5: import.meta.env.VITE_SHEET_SEM5_DIVB || '',
    sem6: import.meta.env.VITE_SHEET_SEM6_DIVB || '',
  },
};

/**
 * Get the appropriate Google Sheet ID based on semester and division
 */
function getSpreadsheetId(semester: number, division: 'A' | 'B'): string {
  const key = `sem${semester}` as keyof typeof GOOGLE_SHEETS_CONFIG.spreadsheetIdDivA;

  if (division === 'A') {
    return GOOGLE_SHEETS_CONFIG.spreadsheetIdDivA[key];
  } else {
    return GOOGLE_SHEETS_CONFIG.spreadsheetIdDivB[key];
  }
}

/**
 * Format date for sheet
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format time for sheet
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Export attendance data to Google Sheets
 */
export async function exportToGoogleSheet(data: GoogleSheetExportData): Promise<{
  success: boolean;
  sheetUrl?: string;
  error?: string;
}> {
  try {
    const spreadsheetId = getSpreadsheetId(data.semester, data.division);

    if (!spreadsheetId) {
      return {
        success: false,
        error: `No Google Sheet configured for Semester ${data.semester}, Division ${data.division}`,
      };
    }

    // Prepare data for Google Sheets
    const headers = [
      'Session ID',
      'Date',
      'Time',
      'Subject Code',
      'Subject Name',
      'Roll Number',
      'Student ID',
      'Student Name',
      'Status',
      'Marked At',
      'Distance from Teacher (m)',
    ];

    const rows = data.studentRecords.map((record) => [
      data.sessionId,
      data.date,
      data.time,
      data.subjectCode,
      data.subjectName,
      record.rollNumber,
      record.studentId,
      record.name,
      record.status,
      record.markedAt || 'N/A',
      record.distanceFromTeacher?.toFixed(1) || 'N/A',
    ]);

    // Call Google Sheets API
    const response = await appendToSheet(spreadsheetId, headers, rows);

    if (response.success) {
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      return {
        success: true,
        sheetUrl,
      };
    }

    return {
      success: false,
      error: response.error || 'Failed to export to Google Sheets',
    };
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Append data to Google Sheet
 * This is a simplified version - you'll need to implement full Google Sheets API integration
 */
async function appendToSheet(
  spreadsheetId: string,
  headers: string[],
  rows: any[][]
): Promise<{ success: boolean; error?: string }> {
  try {
    // In a real implementation, you would:
    // 1. Initialize Google Sheets API client
    // 2. Authenticate with OAuth2
    // 3. Use spreadsheets.values.append() method

    // For now, we'll use a mock implementation
    // You need to replace this with actual Google Sheets API calls

    const SHEETS_API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1:append`;

    const response = await fetch(`${SHEETS_API_URL}?valueInputOption=RAW`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GOOGLE_SHEETS_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        values: [headers, ...rows],
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error appending to sheet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a new Google Sheet for a semester-division combination
 */
export async function createDivisionSheet(
  semester: number,
  division: 'A' | 'B'
): Promise<{ success: boolean; spreadsheetId?: string; error?: string }> {
  try {
    const sheetTitle = `Attendance_Sem${semester}_Div${division}`;

    // In a real implementation, you would:
    // 1. Use Google Sheets API to create a new spreadsheet
    // 2. Set up headers and formatting
    // 3. Return the spreadsheet ID

    // Mock implementation
    console.log(`Creating Google Sheet: ${sheetTitle}`);

    return {
      success: true,
      spreadsheetId: 'mock-spreadsheet-id',
    };
  } catch (error) {
    console.error('Error creating division sheet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch export multiple sessions
 */
export async function batchExportToGoogleSheets(
  dataArray: GoogleSheetExportData[]
): Promise<{
  totalExported: number;
  successCount: number;
  failureCount: number;
  errors: string[];
}> {
  const results = {
    totalExported: dataArray.length,
    successCount: 0,
    failureCount: 0,
    errors: [] as string[],
  };

  for (const data of dataArray) {
    const result = await exportToGoogleSheet(data);

    if (result.success) {
      results.successCount++;
    } else {
      results.failureCount++;
      results.errors.push(result.error || 'Unknown error');
    }
  }

  return results;
}

/**
 * Get sheet URL for viewing
 */
export function getSheetUrl(semester: number, division: 'A' | 'B'): string | null {
  const spreadsheetId = getSpreadsheetId(semester, division);

  if (!spreadsheetId) {
    return null;
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}

/**
 * Prepare attendance data for Google Sheets export
 */
export function prepareExportData(
  sessionId: string,
  semester: number,
  division: 'A' | 'B',
  subjectCode: string,
  subjectName: string,
  timestamp: number,
  students: Array<{
    rollNumber: string;
    studentId: string;
    name: string;
    marked: boolean;
    markedAt?: number;
    distanceFromTeacher?: number;
  }>
): GoogleSheetExportData {
  return {
    sessionId,
    semester,
    division,
    subjectCode,
    subjectName,
    date: formatDate(timestamp),
    time: formatTime(timestamp),
    studentRecords: students.map((student) => ({
      rollNumber: student.rollNumber,
      studentId: student.studentId,
      name: student.name,
      status: student.marked ? 'Present' : 'Absent',
      markedAt: student.markedAt ? formatTime(student.markedAt) : undefined,
      distanceFromTeacher: student.distanceFromTeacher,
    })),
  };
}

/**
 * Verify Google Sheets configuration
 */
export function verifyGoogleSheetsConfig(): {
  isConfigured: boolean;
  missingSemesters: Array<{ semester: number; division: 'A' | 'B' }>;
} {
  const missingSemesters: Array<{ semester: number; division: 'A' | 'B' }> = [];

  for (let sem = 1; sem <= 6; sem++) {
    const divAId = getSpreadsheetId(sem, 'A');
    const divBId = getSpreadsheetId(sem, 'B');

    if (!divAId) {
      missingSemesters.push({ semester: sem, division: 'A' });
    }
    if (!divBId) {
      missingSemesters.push({ semester: sem, division: 'B' });
    }
  }

  return {
    isConfigured: missingSemesters.length === 0,
    missingSemesters,
  };
}