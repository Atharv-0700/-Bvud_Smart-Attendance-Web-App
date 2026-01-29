/**
 * Date Utility Functions
 * Handles date operations for monthly attendance calculations
 */

export interface MonthYear {
  year: number;
  month: number; // 1-12 (January = 1)
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Get date range for a specific month and year
 */
export function getMonthDateRange(year: number, month: number): DateRange {
  // Month is 1-indexed (1 = January)
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  
  return { startDate, endDate };
}

/**
 * Check if a timestamp falls within a month
 */
export function isInMonth(
  timestamp: string | number,
  year: number,
  month: number
): boolean {
  const date = new Date(timestamp);
  const { startDate, endDate } = getMonthDateRange(year, month);
  
  return date >= startDate && date <= endDate;
}

/**
 * Get current month and year
 */
export function getCurrentMonthYear(): MonthYear {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1, // Convert to 1-indexed
  };
}

/**
 * Get previous month and year
 */
export function getPreviousMonthYear(): MonthYear {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  
  if (month === 0) {
    // January -> Previous December
    return {
      year: now.getFullYear() - 1,
      month: 12,
    };
  }
  
  return {
    year: now.getFullYear(),
    month: month, // month is 0-indexed, so month = 0 means January
  };
}

/**
 * Format month-year as string (e.g., "January 2025")
 */
export function formatMonthYear(year: number, month: number): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return `${monthNames[month - 1]} ${year}`;
}

/**
 * Format month-year as short string (e.g., "Jan 2025")
 */
export function formatMonthYearShort(year: number, month: number): string {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  return `${monthNames[month - 1]} ${year}`;
}

/**
 * Check if it's the last day of the month
 */
export function isLastDayOfMonth(): boolean {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return today.getMonth() !== tomorrow.getMonth();
}

/**
 * Get month name from number
 */
export function getMonthName(month: number): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return monthNames[month - 1] || 'Unknown';
}

/**
 * Parse date from ISO string or timestamp
 */
export function parseDate(timestamp: string | number): Date {
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  return new Date(timestamp);
}

/**
 * Get start of day timestamp
 */
export function getStartOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Get end of day timestamp
 */
export function getEndOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * Format date as DD/MM/YYYY
 */
export function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Format date as YYYY-MM-DD (for storage keys)
 */
export function formatDateKey(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${year}-${month}-${day}`;
}

/**
 * Get all months between two dates
 */
export function getMonthsBetween(
  startDate: Date,
  endDate: Date
): MonthYear[] {
  const months: MonthYear[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    months.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1,
    });
    
    // Move to next month
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}

/**
 * Validate month and year
 */
export function isValidMonthYear(year: number, month: number): boolean {
  return (
    year >= 2020 &&
    year <= 2100 &&
    month >= 1 &&
    month <= 12
  );
}
