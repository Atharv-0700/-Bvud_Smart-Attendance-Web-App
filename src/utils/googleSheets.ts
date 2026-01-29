// Google Sheets Integration
// This module handles writing attendance data to Google Sheets

interface AttendanceData {
  date: string;
  time: string;
  subject: string;
  semester: string;
  studentName: string;
  rollNumber: string;
  division: string;
  location: string;
}

/**
 * Extract spreadsheet ID from Google Sheets URL
 * @param url - Full Google Sheets URL
 * @returns Spreadsheet ID
 */
export const extractSpreadsheetId = (
  url: string,
): string | null => {
  const match = url.match(
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
  );
  return match ? match[1] : null;
};

/**
 * Write attendance data to Google Sheet using Google Apps Script Web App
 *
 * NOTE: This requires setting up a Google Apps Script Web App deployment.
 * See GOOGLE_SHEETS_SETUP.md for instructions.
 *
 * @param sheetUrl - Google Sheets URL
 * @param data - Attendance data to write
 */
export const writeToGoogleSheet = async (
  sheetUrl: string,
  data: AttendanceData,
): Promise<boolean> => {
  try {
    // Extract spreadsheet ID
    const spreadsheetId = extractSpreadsheetId(sheetUrl);

    if (!spreadsheetId) {
      console.error("Invalid Google Sheets URL");
      return false;
    }

    // For direct Google Sheets API integration, you would use:
    // const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;

    // However, the RECOMMENDED approach is using Google Apps Script Web App
    // because it bypasses CORS and authentication issues.

    // Format data for Google Sheets
    const row = [
      data.date,
      data.time,
      data.subject,
      data.semester,
      data.studentName,
      data.rollNumber,
      data.division,
      data.location,
    ];

    // ✅ Your Google Apps Script Web App URL
    const webAppUrl =
      "https://script.google.com/macros/s/AKfycbwfxxJhX5TB1i1Tiukigg83rWyljpBaA8XllFamEbCtZ3wtey3szRpqPu3Ho45v1FKN/exec";

    // Send data to Google Apps Script Web App
    const response = await fetch(webAppUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        spreadsheetId,
        data: row,
      }),
    });

    console.log("✅ Data sent to Google Sheets successfully");
    return true;
  } catch (error) {
    console.error("❌ Error writing to Google Sheets:", error);
    return false;
  }
};

/**
 * Alternative: Write using Google Sheets API directly
 * Requires API key and proper CORS setup
 *
 * NOTE: This approach has CORS limitations and requires OAuth for write access.
 * Google Apps Script Web App is recommended instead.
 */
export const writeUsingGoogleSheetsAPI = async (
  spreadsheetId: string,
  data: AttendanceData,
): Promise<boolean> => {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;

    if (!apiKey) {
      console.warn("⚠️ Google Sheets API key not configured");
      return false;
    }

    const range = "Sheet1!A:H"; // Adjust sheet name and range as needed

    const row = [
      data.date,
      data.time,
      data.subject,
      data.semester,
      data.studentName,
      data.rollNumber,
      data.division,
      data.location,
    ];

    // Note: This will fail due to CORS and lack of OAuth
    // Google Sheets API v4 requires OAuth 2.0 for write operations
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [row],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Google Sheets API error: ${response.status}`,
      );
    }

    return true;
  } catch (error) {
    console.error("❌ Error using Google Sheets API:", error);
    return false;
  }
};