import { supabase } from '@/lib/supabase';
import { AuthService } from './authService';

export class QuickJotService {
  /**
   * Mark that the user has used Quick Jot to create a task
   * This updates the quick_jot field in user_profiles table
   */
  static async markQuickJotUsed(): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user
      const currentUser = await AuthService.getCurrentUser();
      
      if (!currentUser) {
        console.log('🎯 QUICK JOT: No authenticated user found, skipping quick_jot update');
        return { success: true }; // Success for guest users (no error, just skip)
      }

      // Update the quick_jot field to true
      const { error } = await supabase
        .from('user_profiles')
        .update({ quick_jot: true })
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('🎯 QUICK JOT: Error updating quick_jot field:', error);
        return { success: false, error: error.message };
      }

      console.log('🎯 QUICK JOT: Successfully marked quick_jot as used for user:', currentUser.id);
      return { success: true };
    } catch (error) {
      console.error('🎯 QUICK JOT: Unexpected error marking quick_jot as used:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  /**
   * Check if the user has used Quick Jot before
   * Returns false for guest users (they don't have user_profiles)
   */
  static async hasUsedQuickJot(): Promise<boolean> {
    try {
      // Get current user
      const currentUser = await AuthService.getCurrentUser();
      
      if (!currentUser) {
        console.log('🎯 QUICK JOT: No authenticated user found, returning false for guest user');
        return false; // Guest users haven't used Quick Jot
      }

      // Get the user's profile to check quick_jot field
      const { data, error } = await supabase
        .from('user_profiles')
        .select('quick_jot')
        .eq('user_id', currentUser.id)
        .single();

      if (error) {
        console.error('🎯 QUICK JOT: Error fetching quick_jot status:', error);
        return false; // Default to false on error
      }

      const hasUsed = data?.quick_jot || false;
      console.log('🎯 QUICK JOT: User has used Quick Jot:', hasUsed);
      return hasUsed;
    } catch (error) {
      console.error('🎯 QUICK JOT: Unexpected error checking quick_jot status:', error);
      return false; // Default to false on error
    }
  }

  /**
   * Reset the quick_jot field to false (for testing purposes)
   */
  static async resetQuickJotStatus(): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user
      const currentUser = await AuthService.getCurrentUser();
      
      if (!currentUser) {
        console.log('🎯 QUICK JOT: No authenticated user found, skipping reset');
        return { success: true }; // Success for guest users
      }

      // Reset the quick_jot field to false
      const { error } = await supabase
        .from('user_profiles')
        .update({ quick_jot: false })
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('🎯 QUICK JOT: Error resetting quick_jot field:', error);
        return { success: false, error: error.message };
      }

      console.log('🎯 QUICK JOT: Successfully reset quick_jot status for user:', currentUser.id);
      return { success: true };
    } catch (error) {
      console.error('🎯 QUICK JOT: Unexpected error resetting quick_jot status:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }
}
