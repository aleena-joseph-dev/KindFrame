/**
 * Utility functions for detecting user visit types and managing visit tracking
 */

export type VisitType = 'first_time' | 'returning_after_break' | 'regular_user';

export interface VisitData {
  visitType: VisitType;
  lastVisitDate?: Date;
  daysSinceLastVisit?: number;
  isFirstTime: boolean;
}

export interface UserVisitHistory {
  firstVisitDate: Date;
  lastVisitDate: Date;
  totalVisits: number;
  consecutiveDays: number;
}

/**
 * Detects the type of user visit based on stored data
 * @param userData - Current user data from database
 * @returns VisitData with visit type and related information
 */
export function detectVisitType(userData: any): VisitData {
  const now = new Date();
  
  // Check if user has any visit history
  if (!userData || !userData.settings) {
    return {
      visitType: 'first_time',
      isFirstTime: true,
    };
  }

  const settings = userData.settings;
  const lastVisitDate = settings.lastVisitDate ? new Date(settings.lastVisitDate) : null;
  const firstVisitDate = settings.firstVisitDate ? new Date(settings.firstVisitDate) : null;

  // If no visit history, this is first time
  if (!lastVisitDate || !firstVisitDate) {
    return {
      visitType: 'first_time',
      isFirstTime: true,
    };
  }

  // Calculate days since last visit
  const daysSinceLastVisit = Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));

  // Determine visit type based on time gap
  if (daysSinceLastVisit > 7) {
    return {
      visitType: 'returning_after_break',
      lastVisitDate,
      daysSinceLastVisit,
      isFirstTime: false,
    };
  } else {
    return {
      visitType: 'regular_user',
      lastVisitDate,
      daysSinceLastVisit,
      isFirstTime: false,
    };
  }
}

/**
 * Updates user visit data for current session
 * @param userId - User ID
 * @param userData - Current user data
 * @returns Updated user data with visit tracking
 */
export function updateVisitData(userData: any): any {
  const now = new Date();
  
  if (!userData) {
    return {
      settings: {
        firstVisitDate: now.toISOString(),
        lastVisitDate: now.toISOString(),
        totalVisits: 1,
        consecutiveDays: 1,
      }
    };
  }

  const settings = userData.settings || {};
  const lastVisitDate = settings.lastVisitDate ? new Date(settings.lastVisitDate) : null;
  const firstVisitDate = settings.firstVisitDate ? new Date(settings.firstVisitDate) : now;
  const totalVisits = (settings.totalVisits || 0) + 1;

  // Calculate consecutive days
  let consecutiveDays = settings.consecutiveDays || 1;
  if (lastVisitDate) {
    const daysSinceLastVisit = Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastVisit === 1) {
      consecutiveDays += 1;
    } else if (daysSinceLastVisit > 1) {
      consecutiveDays = 1; // Reset consecutive days
    }
  }

  return {
    ...userData,
    settings: {
      ...settings,
      firstVisitDate: firstVisitDate.toISOString(),
      lastVisitDate: now.toISOString(),
      totalVisits,
      consecutiveDays,
    }
  };
}

/**
 * Gets a welcome message based on visit type
 * @param visitData - Visit data from detectVisitType
 * @param nickname - User's nickname
 * @returns Appropriate welcome message
 */
export function getWelcomeMessage(visitData: VisitData, nickname: string): string {
  const displayName = nickname || 'there';
  
  // Always use the format "hey *name*, welcome to kindframe"
  return `Hey ${displayName}, welcome to KindFrame`;
}

/**
 * Checks if welcome message should be shown based on session
 * @param sessionKey - Unique session identifier
 * @returns Whether to show welcome message
 */
export async function shouldShowWelcomeMessage(sessionKey: string): Promise<boolean> {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    const shownToday = await AsyncStorage.default.getItem(`welcome_shown_${sessionKey}`);
    const today = new Date().toDateString();
    
    if (shownToday === today) {
      return false; // Already shown today
    }
    
    // Mark as shown for today
    await AsyncStorage.default.setItem(`welcome_shown_${sessionKey}`, today);
    return true;
  } catch (error) {
    console.error('Error checking welcome message status:', error);
    return true; // Show by default if error
  }
} 