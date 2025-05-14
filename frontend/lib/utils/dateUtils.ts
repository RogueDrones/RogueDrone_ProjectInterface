// frontend/lib/utils/dateUtils.ts
import { format, parseISO } from 'date-fns';

/**
 * Format a date string to a human-readable format
 * @param dateString ISO date string
 * @param formatString Optional format string (default: 'PPP')
 * @returns Formatted date string
 */
export const formatDate = (dateString: string, formatString: string = 'PPP'): string => {
  try {
    const date = parseISO(dateString);
    return format(date, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Format a date string to a short date format (e.g., "Mar 15, 2023")
 * @param dateString ISO date string
 * @returns Formatted short date
 */
export const formatShortDate = (dateString: string): string => {
  return formatDate(dateString, 'MMM d, yyyy');
};

/**
 * Format a date string to a date and time format (e.g., "Mar 15, 2023 2:30 PM")
 * @param dateString ISO date string
 * @returns Formatted date and time
 */
export const formatDateTime = (dateString: string): string => {
  return formatDate(dateString, 'MMM d, yyyy h:mm a');
};

/**
 * Format a date string to a relative format (e.g., "2 days ago")
 * @param dateString ISO date string
 * @returns Formatted relative date
 */
export const formatRelativeDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const diffWeeks = Math.floor(diffDays / 7);
      return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
    } else if (diffDays < 365) {
      const diffMonths = Math.floor(diffDays / 30);
      return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
    } else {
      const diffYears = Math.floor(diffDays / 365);
      return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
    }
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return dateString;
  }
};