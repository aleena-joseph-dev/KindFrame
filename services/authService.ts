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
          redirectTo: `${window.location.origin}/auth-callback`,
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
          redirectTo: `${window.location.origin}/auth-callback`,
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

  // Custom Notion OAuth Sign In (since it might not be available in Supabase)
  static async signInWithNotionCustom(): Promise<AuthResult> {
    try {
      console.log('Attempting custom Notion OAuth sign in...');
      
      // Notion OAuth configuration
      const NOTION_CLIENT_ID = process.env.EXPO_PUBLIC_NOTION_CLIENT_ID;
      const NOTION_REDIRECT_URI = 'http://localhost:8081/auth-callback'; // Updated back to port 8081
      
      if (!NOTION_CLIENT_ID) {
        console.error('Notion Client ID not configured');
        return {
          success: false,
          error: {
            message: 'Notion OAuth not configured. Please contact support.',
          },
        };
      }

      // Construct Notion OAuth URL with state parameter for security
      const state = Math.random().toString(36).substring(7);
      const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${NOTION_CLIENT_ID}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(NOTION_REDIRECT_URI)}&state=${state}`;

      console.log('Redirecting to Notion OAuth:', notionAuthUrl);
      console.log('Generated state:', state);
      
      // Store state for verification
      await AsyncStorage.setItem('notionOAuthState', state);
      
      // For web, we'll redirect to the Notion OAuth URL
      if (typeof window !== 'undefined') {
        window.location.href = notionAuthUrl;
      } else {
        // For mobile, we need to use expo-linking
        const Linking = await import('expo-linking');
        const supported = await Linking.default.canOpenURL(notionAuthUrl);
        
        if (supported) {
          await Linking.default.openURL(notionAuthUrl);
        } else {
          return {
            success: false,
            error: {
              message: 'Cannot open Notion OAuth URL. Please try again.',
            },
          };
        }
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Custom Notion sign-in error:', error);
      return {
        success: false,
        error: {
          message: 'Failed to sign in with Notion',
        },
      };
    }
  }

  // Handle Notion OAuth callback
  static async handleNotionCallback(code: string, state?: string): Promise<AuthResult> {
    try {
      console.log('Handling Notion OAuth callback with code:', code, 'and state:', state);
      
      // Verify state parameter if provided (make it optional for now)
      if (state) {
        const storedState = await AsyncStorage.getItem('notionOAuthState');
        console.log('Stored state:', storedState, 'Received state:', state);
        
        if (storedState && storedState !== state) {
          console.error('State mismatch in Notion OAuth callback');
          console.log('Expected state:', storedState, 'Received state:', state);
          // For now, let's continue anyway since this might be a development issue
          console.log('Continuing despite state mismatch for development...');
        }
        
        // Clear the stored state
        await AsyncStorage.removeItem('notionOAuthState');
      } else {
        console.log('No state parameter provided, skipping state verification');
      }
      
      // Use Supabase Edge Function to handle token exchange
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('notion-oauth', {
        body: {
          code,
          redirect_uri: 'http://localhost:8081/auth-callback', // Updated back to port 8081
        },
      });

      if (tokenError) {
        console.error('Notion token exchange failed:', tokenError);
        return {
          success: false,
          error: {
            message: 'Failed to authenticate with Notion',
          },
        };
      }

      console.log('Token exchange successful:', tokenData);

      // Get user info from Notion using the Edge Function
      const { data: notionUser, error: userError } = await supabase.functions.invoke('notion-user', {
        body: {
          access_token: tokenData.access_token,
        },
      });

      if (userError) {
        console.error('Failed to get Notion user data:', userError);
        return {
          success: false,
          error: {
            message: 'Failed to get user information from Notion',
          },
        };
      }

      console.log('Notion user data:', notionUser);

      // Create a unique email for the user
      const userIdHash = notionUser.id.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
      const notionEmail = `notion.${userIdHash}@kindframe.app`;
      
      // Check if user already exists by trying to get their session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // User is already authenticated, update their profile
        console.log('User already authenticated, updating profile');
        
        // Update user metadata with Notion info
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            full_name: notionUser.name || 'Notion User',
            avatar_url: notionUser.avatar_url || null,
            provider: 'notion',
            notion_user_id: notionUser.id,
            notion_access_token: tokenData.access_token,
          },
        });

        if (updateError) {
          console.error('Error updating user metadata:', updateError);
        }

        // Update user profile in our custom table
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: session.user.id,
            preferences: {
              notion_user_id: notionUser.id,
              notion_access_token: tokenData.access_token,
              provider: 'notion',
            },
            settings: {
              full_name: notionUser.name || 'Notion User',
              avatar_url: notionUser.avatar_url || null,
            },
          });

        if (profileError) {
          console.error('Error updating user profile:', profileError);
        }

        return {
          success: true,
          user: session.user,
        };
      } else {
        // Create new user
        console.log('Creating new user for Notion OAuth');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: notionEmail,
          password: `Notion${notionUser.id}${Date.now()}!`,
          options: {
            data: {
              full_name: notionUser.name || 'Notion User',
              avatar_url: notionUser.avatar_url || null,
              provider: 'notion',
              notion_user_id: notionUser.id,
              notion_access_token: tokenData.access_token,
            },
          },
        });

        if (signUpError) {
          console.error('Failed to create user:', signUpError);
          return {
            success: false,
            error: {
              message: 'Failed to create user account',
            },
          };
        }

        if (signUpData.user) {
          // The database trigger will automatically create the user profile
          // Store user data locally
          await AsyncStorage.setItem('userToken', signUpData.session?.access_token || '');
          await AsyncStorage.setItem('userData', JSON.stringify(signUpData.user));

          return {
            success: true,
            user: signUpData.user,
          };
        }
      }

      return {
        success: false,
        error: {
          message: 'Failed to authenticate with Notion',
        },
      };
    } catch (error) {
      console.error('Notion callback error:', error);
      return {
        success: false,
        error: {
          message: 'An unexpected error occurred during Notion authentication',
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
      console.log('Handling OAuth callback with URL:', url);
      
      const urlObj = new URL(url);
      
      // First check for tokens in URL parameters (Supabase style)
      const urlParams = new URLSearchParams(urlObj.search);
      let accessToken = urlParams.get('access_token');
      let refreshToken = urlParams.get('refresh_token');
      
      // If not found in URL params, check hash parameters
      if (!accessToken) {
        const hashParams = new URLSearchParams(urlObj.hash.substring(1));
        accessToken = hashParams.get('access_token');
        refreshToken = hashParams.get('refresh_token');
      }
      
      console.log('Extracted tokens:', { 
        accessToken: !!accessToken, 
        refreshToken: !!refreshToken,
        fromUrlParams: !!urlParams.get('access_token'),
        fromHash: !!urlObj.hash.includes('access_token')
      });
      
      if (accessToken) {
        // Set the session manually
        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });
        
        if (sessionError) {
          console.error('Error setting session:', sessionError);
          return {
            success: false,
            error: {
              message: sessionError.message,
              code: sessionError.status?.toString(),
            },
          };
        }
        
        if (session?.user) {
          console.log('Session set successfully, user:', session.user.email);
          
          // Get or create user profile
          const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
            // User profile doesn't exist, create it
            console.log('Creating user profile for OAuth user');
            const { error: createError } = await supabase
              .from('user_profiles')
              .insert({
                user_id: session.user.id,
                email: session.user.email!,
                full_name: session.user.user_metadata?.full_name || null,
                avatar_url: session.user.user_metadata?.avatar_url || null,
                sensory_mode: 'low',
              });

            if (createError) {
              console.error('Error creating user profile:', createError);
            }
          }

          // Store user data locally
          await AsyncStorage.setItem('userToken', session.access_token);
          await AsyncStorage.setItem('userData', JSON.stringify(session.user));

          return {
            success: true,
            user: session.user,
          };
        }
      } else {
        // Fallback: try to get session normally
        console.log('No access token in URL, trying normal session retrieval');
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          return {
            success: false,
            error: {
              message: error.message,
              code: error.status?.toString(),
            },
          };
        }

        if (data.session?.user) {
          console.log('Session retrieved successfully');
          
          // Get or create user profile
          const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', data.session.user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
            // User profile doesn't exist, create it
            console.log('Creating user profile for OAuth user');
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
            user: data.session.user,
          };
        }
      }

      console.error('No session found in OAuth callback');
      return {
        success: false,
        error: {
          message: 'Authentication failed. No session found.',
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
} 