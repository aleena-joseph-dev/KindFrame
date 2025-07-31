import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '../lib/supabase';
import { supabase } from '../lib/supabase';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResult {
  success: boolean;
  user?: any; // Using any for now since we're working with auth.users
  error?: AuthError;
}

export class AuthService {
  // Email/Password Sign Up
  static async signUp(email: string, password: string, fullName?: string): Promise<AuthResult> {
    try {
      console.log('Attempting signup with:', { email, fullName });
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.error('Supabase signup error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack
        });
        
        // Provide more specific error messages
        let errorMessage = error.message;
        if (error.status === 400) {
          if (error.message.includes('password')) {
            errorMessage = 'Password does not meet requirements. Please use a stronger password.';
          } else if (error.message.includes('email') || error.message.includes('invalid')) {
            errorMessage = 'Invalid email address. Please use a valid email domain (e.g., gmail.com, outlook.com).';
          } else {
            errorMessage = 'Invalid signup data. Please check your information and try again.';
          }
        }
        
        return {
          success: false,
          error: {
            message: errorMessage,
            code: error.status?.toString(),
          },
        };
      }

      console.log('Signup successful:', data);

      if (data.user) {
        // Since email confirmation is disabled, we need to manually confirm the email
        // This is a workaround for users who signed up when email confirmation was enabled
        if (!data.user.email_confirmed_at) {
          console.log('Email not confirmed, attempting to confirm manually...');
          // Note: This would require admin privileges, so we'll handle it differently
          // For now, we'll just proceed and let the user know they need to confirm manually
        }

        // The database trigger will automatically create the user profile
        // No need to manually create it here

        // Store user data locally
        await AsyncStorage.setItem('userToken', data.session?.access_token || '');
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));

        return {
          success: true,
          user: data.user,
        };
      }

      return {
        success: false,
        error: {
          message: 'Sign up failed. Please try again.',
        },
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        error: {
          message: 'An unexpected error occurred. Please try again.',
        },
      };
    }
  }

  // Email/Password Sign In
  static async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      console.log('Attempting signin with:', { email });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase signin error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack
        });
        
        // Provide more specific error messages
        let errorMessage = error.message;
        if (error.status === 400) {
          if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. Please check your credentials.';
          } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please check your email and confirm your account before signing in.';
          } else {
            errorMessage = 'Sign in failed. Please check your email and password.';
          }
        }
        
        return {
          success: false,
          error: {
            message: errorMessage,
            code: error.status?.toString(),
          },
        };
      }

      console.log('Signin successful:', data);

      if (data.user) {
        // Get user profile from our custom user_profiles table
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
        }

        // Store user data locally
        await AsyncStorage.setItem('userToken', data.session?.access_token || '');
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));

        return {
          success: true,
          user: userProfile || data.user,
        };
      }

      return {
        success: false,
        error: {
          message: 'Sign in failed. Please try again.',
        },
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: {
          message: 'An unexpected error occurred. Please try again.',
        },
      };
    }
  }

  // Google OAuth Sign In
  static async signInWithGoogle(): Promise<AuthResult> {
    try {
      console.log('Attempting Google OAuth sign in...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'kindframe://auth-callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google OAuth error:', error);
        return {
          success: false,
          error: {
            message: error.message,
            code: error.status?.toString(),
          },
        };
      }

      console.log('Google OAuth initiated successfully:', data);
      
      // For OAuth, we need to handle the redirect flow
      // This will be handled by the app's deep linking
      return {
        success: true,
      };
    } catch (error) {
      console.error('Google sign in error:', error);
      return {
        success: false,
        error: {
          message: 'Google sign in failed. Please try again.',
        },
      };
    }
  }

  // Comment out Apple Sign-In for now
  // static async signInWithApple(): Promise<AuthResult> {
  //   try {
  //     const { data, error } = await supabase.auth.signInWithOAuth({
  //       provider: 'apple',
  //       options: {
  //         redirectTo: 'kindframe://auth-callback',
  //         queryParams: {
  //           response_mode: 'form_post',
  //         },
  //       },
  //     });
  //     if (error) {
  //       return {
  //         success: false,
  //         error: {
  //           message: error.message,
  //         },
  //       };
  //     }
  //     return {
  //       success: true,
  //       user: data.user as unknown as User,
  //     };
  //   } catch (error) {
  //     console.error('Apple sign-in error:', error);
  //     return {
  //       success: false,
  //       error: {
  //         message: 'Failed to sign in with Apple',
  //       },
  //     };
  //   }
  // }

  // Notion OAuth Sign In
  static async signInWithNotion(): Promise<AuthResult> {
    try {
      console.log('Attempting Notion OAuth sign in...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'notion',
        options: {
          redirectTo: 'kindframe://auth-callback',
          queryParams: {
            response_type: 'code',
          },
        },
      });
      
      if (error) {
        console.error('Notion OAuth error:', error);
        return {
          success: false,
          error: {
            message: error.message,
          },
        };
      }
      
      console.log('Notion OAuth initiated successfully:', data);
      
      return {
        success: true,
        user: data.user,
      };
    } catch (error) {
      console.error('Notion sign-in error:', error);
      return {
        success: false,
        error: {
          message: 'Failed to sign in with Notion',
        },
      };
    }
  }

  // Sign Out
  static async signOut(): Promise<void> {
    try {
      console.log('AuthService.signOut: Starting sign out process...');
      await supabase.auth.signOut();
      console.log('AuthService.signOut: Supabase auth signOut completed');
      await AsyncStorage.multiRemove(['userToken', 'userData']);
      console.log('AuthService.signOut: AsyncStorage cleared');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error; // Re-throw to let the calling function handle it
    }
  }

  // Get Current User
  static async getCurrentUser(): Promise<any | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get user profile from our custom user_profiles table
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        return userProfile || user;
      }

      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

           // Update User Profile
         static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<AuthResult> {
           try {
             const { data, error } = await supabase
               .from('user_profiles')
               .update(updates)
               .eq('user_id', userId)
               .select()
               .single();

      if (error) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.code,
          },
        };
      }

      return {
        success: true,
        user: data,
      };
    } catch (error) {
      console.error('Update user profile error:', error);
      return {
        success: false,
        error: {
          message: 'Failed to update profile. Please try again.',
        },
      };
    }
  }

  // Reset Password
  static async resetPassword(email: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'kindframe://auth/reset-password',
      });

      if (error) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.status?.toString(),
          },
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        error: {
          message: 'Failed to send reset email. Please try again.',
        },
      };
    }
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch (error) {
      console.error('Check authentication error:', error);
      return false;
    }
  }

  // Handle OAuth callback
  static async handleOAuthCallback(url: string): Promise<AuthResult> {
    try {
      // Extract the session from the URL
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        return {
          success: false,
          error: {
            message: error.message,
            code: error.status?.toString(),
          },
        };
      }

      if (data.session?.user) {
        // Get or create user profile
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', data.session.user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // User profile doesn't exist, create it
          const { error: createError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: data.session.user.id,
              email: data.session.user.email!,
              full_name: data.session.user.user_metadata?.full_name || null,
              avatar_url: data.session.user.user_metadata?.avatar_url || null,
              sensory_mode: 'low',
            });

          if (createError) {
            console.error('Error creating user profile:', createError);
          }
        }

        // Store user data locally
        await AsyncStorage.setItem('userToken', data.session.access_token);
        await AsyncStorage.setItem('userData', JSON.stringify(data.session.user));

        return {
          success: true,
          user: data.session.user as unknown as User,
        };
      }

      return {
        success: false,
        error: {
          message: 'Authentication failed. Please try again.',
        },
      };
    } catch (error) {
      console.error('OAuth callback error:', error);
      return {
        success: false,
        error: {
          message: 'An unexpected error occurred. Please try again.',
        },
      };
    }
  }

  // Manually confirm email for users who signed up when email confirmation was enabled
  static async confirmEmailManually(email: string): Promise<AuthResult> {
    try {
      console.log('Attempting to manually confirm email for:', email);
      
      // First, try to sign in with the current password to get the user
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: 'temp_password_for_confirmation', // This will fail, but we need the user
      });

      if (signInError && signInError.message.includes('Email not confirmed')) {
        // The user exists but email is not confirmed
        // We need to update the user's email_confirmed_at field directly in the database
        console.log('User exists but email not confirmed, attempting to confirm...');
        
        // Get the user by email
        const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
        
        if (userError) {
          console.error('Error listing users:', userError);
          return {
            success: false,
            error: {
              message: 'Unable to confirm email. Please contact support.',
            },
          };
        }

        const user = users?.find(u => u.email === email);
        if (user) {
          // Update the user's email_confirmed_at
          const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            email_confirmed_at: new Date().toISOString(),
          });

          if (updateError) {
            console.error('Error updating user:', updateError);
            return {
              success: false,
              error: {
                message: 'Unable to confirm email. Please contact support.',
              },
            };
          }

          console.log('Email confirmed successfully');
          return {
            success: true,
            user: user,
          };
        }
      }

      return {
        success: false,
        error: {
          message: 'Unable to confirm email. Please try signing up again.',
        },
      };
    } catch (error) {
      console.error('Confirm email error:', error);
      return {
        success: false,
        error: {
          message: 'An unexpected error occurred while confirming email.',
        },
      };
    }
  }
} 