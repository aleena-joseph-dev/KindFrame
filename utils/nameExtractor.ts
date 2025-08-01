/**
 * Utility functions for extracting and formatting names from email addresses
 */

export interface NameExtractionResult {
  firstName: string;
  lastName: string;
  fullName: string;
  displayName: string;
}

/**
 * Extracts a name from an email address
 * @param email - The email address to extract name from
 * @returns NameExtractionResult with extracted name parts
 */
export function extractNameFromEmail(email: string): NameExtractionResult {
  if (!email || typeof email !== 'string') {
    return {
      firstName: 'User',
      lastName: '',
      fullName: 'User',
      displayName: 'User'
    };
  }

  // Remove domain part
  const localPart = email.split('@')[0];
  
  if (!localPart) {
    return {
      firstName: 'User',
      lastName: '',
      fullName: 'User',
      displayName: 'User'
    };
  }

  // Handle common separators
  const separators = ['.', '_', '-', '+'];
  let nameParts: string[] = [];

  // Try to split by separators
  for (const separator of separators) {
    if (localPart.includes(separator)) {
      nameParts = localPart.split(separator);
      break;
    }
  }

  // If no separators found, treat as single name
  if (nameParts.length === 0) {
    nameParts = [localPart];
  }

  // Clean and capitalize name parts
  const cleanedParts = nameParts
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .map(part => capitalizeFirstLetter(part));

  if (cleanedParts.length === 0) {
    return {
      firstName: 'User',
      lastName: '',
      fullName: 'User',
      displayName: 'User'
    };
  }

  const firstName = cleanedParts[0] || 'User';
  const lastName = cleanedParts.slice(1).join(' ') || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const displayName = firstName; // Use first name as display name

  return {
    firstName,
    lastName,
    fullName,
    displayName
  };
}

/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns The capitalized string
 */
function capitalizeFirstLetter(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Formats a name for display
 * @param name - The name to format
 * @returns Formatted name
 */
export function formatDisplayName(name: string): string {
  if (!name || typeof name !== 'string') return 'User';
  
  // Remove extra spaces and capitalize
  return name
    .trim()
    .split(' ')
    .map(word => capitalizeFirstLetter(word))
    .join(' ');
}

/**
 * Gets a fallback name if extraction fails
 * @param email - The email address
 * @returns A fallback name
 */
export function getFallbackName(email: string): string {
  if (!email || typeof email !== 'string') return 'User';
  
  const localPart = email.split('@')[0];
  if (!localPart) return 'User';
  
  // Try to extract at least a first name
  const result = extractNameFromEmail(email);
  return result.displayName || 'User';
} 