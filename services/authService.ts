import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { extractNameFromEmail } from '../utils/nameExtractor';

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

// Helper function to check for malformed URLs
function checkForMalformedUrl(url: string, context: string): boolean {
  const malformedUrl = 'www.googleapis.com/auth/drive.readonly%20https://www.googleapis.com/auth/drive.metadata.readonly';
  if (url.includes(malformedUrl)) {
    console.error(`🔍 MALFORMED URL DETECTED in ${context}:`, url);
    alert('Malformed URL Detected: The OAuth URL is malformed. This indicates a scope encoding issue.');
    return true;
  }
  return false;
}

// Helper function to check the last OAuth URL that was used
export function checkLastOAuthUrl(): string | null {
  const url = localStorage.getItem('last_oauth_url');
  const timestamp = localStorage.getItem('last_oauth_timestamp');
  if (url && timestamp) {
    const timeDiff = Date.now() - parseInt(timestamp);
    if (timeDiff < 60000) { // Within last minute
      return url;
    }
  }
  return null;
}

export class AuthService {
  // Email/Password Sign Up
  static async signUp(email: string, password: string, fullName?: string): Promise<AuthResult> {
    try {
      console.log('Attempting signup with:', { email, fullName });
      
      // Extract name from email if no fullName provided
      let nickname = fullName;
      if (!nickname) {
        const extractedName = extractNameFromEmail(email);
        nickname = extractedName.displayName;
        console.log('Extracted nickname from email:', nickname);
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nickname,
            nickname: nickname, // Store as nickname for easy access
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
        // Step 1: User created in auth.users successfully
        console.log('User created in auth.users successfully:', data.user.id);
        
        // Step 2: Store user data locally
        await AsyncStorage.setItem('userToken', data.session?.access_token || '');
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        await AsyncStorage.setItem('extractedNickname', nickname);

        // Step 3: Profile will be created by database trigger
        console.log('Profile will be created by database trigger');

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
        // Extract nickname from email for onboarding
        const extractedName = extractNameFromEmail(email);
        const nickname = extractedName.displayName;
        console.log('Extracted nickname from email for signin:', nickname);
        
        // Store the extracted nickname for onboarding
        await AsyncStorage.setItem('extractedNickname', nickname);
        
        // Get user profile from our custom user_profiles table
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
        }
        console.log('<<<<1User profile',data.user.id);
        // Check if this is the user's first login and initialize onboarding if needed
        if (userProfile && !userProfile.settings?.hasCompletedOnboarding) {
          try {
            await this.updateUserProfile(data.user.id, {
              settings: {
                ...userProfile.settings,
                nickname: nickname,
                full_name: nickname,
                hasCompletedOnboarding: false, // Will be set to true after onboarding
                firstLoginAt: userProfile.settings?.firstLoginAt || new Date().toISOString(),
              }
            });
            console.log('User profile updated with onboarding status for first login');
          } catch (error) {
            console.error('Error updating user profile for first login:', error);
          }
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
        console.log('🔗 REDIRECTING TO NOTION OAUTH:', notionAuthUrl);
        // window.location.href = notionAuthUrl;
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
      
      // Clear Google OAuth tokens from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('google_provider_token');
        localStorage.removeItem('google_keep_token');
        localStorage.removeItem('google_calendar_token');
        console.log('AuthService.signOut: All Google tokens cleared from localStorage');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      throw error; // Re-throw to let the calling function handle it
    }
  }

  // Get Current User
  static async getCurrentUser(): Promise<any | null> {
    try {
      console.log('👤 GETTING CURRENT USER: Attempting to get current authenticated user');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ AUTH ERROR: Error getting authenticated user:', authError);
        return null;
      }
      
      if (user) {
        console.log('✅ AUTH USER FOUND: Getting current user by user_id:', user.id);
        
        // Always query by user_id from Auth
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist yet, return user without profile
          console.log('⚠️ PROFILE NOT FOUND: User profile does not exist yet for user:', user.id);
          return {
            ...user,
            profile: null
          };
                 } else if (profileError) {
           console.error('❌ PROFILE FETCH ERROR: Error getting user profile:', {
             code: profileError.code,
             message: profileError.message,
             details: profileError.details,
             hint: profileError.hint
           });
           
           // Detect common database errors
           if (profileError.code === '23503') {
             console.error('🚨 FOREIGN KEY ERROR: User does not exist in auth.users:', user.id);
           } else if (profileError.code === '23502') {
             console.error('🚨 NOT NULL ERROR: Missing required field in profile');
           }
           
           return {
             ...user,
             profile: null
           };
         }

        // Return combined user data with auth user as primary
        const result = {
          ...user,
          profile: userProfile,
          // For backward compatibility, merge profile data
          ...userProfile
        };
        
        console.log('=== GET CURRENT USER RESULT STRUCTURE ===',result);
        console.log('🔍 AUTH USER DATA:', {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata
        });
        
        console.log('🔍 PROFILE DATA:', {
          profileExists: !!userProfile,
          profileId: userProfile?.id,
          profileUserId: userProfile?.user_id,
          profileSettings: userProfile?.settings,
          profileEmail: userProfile?.email
        });
        
        console.log('🔍 MERGED RESULT:', {
          resultId: result.id,
          resultUserId: result.user_id,
          resultSettings: result.settings,
          resultProfile: result.profile,
          hasProfileProperty: !!result.profile,
          hasSettingsProperty: !!result.settings
        });
        
        console.log('⚠️ WARNING: Profile data is merged into result object for backward compatibility');
        console.log('   - result.id = auth.users.id');
        console.log('   - result.user_id = user_profiles.user_id (same as result.id)');
        console.log('   - result.settings = user_profiles.settings');
        console.log('   - result.profile = full profile object');
        
        return result;
      }

      console.log('❌ NO AUTH USER: No authenticated user found');
      return null;
    } catch (error) {
      console.error('❌ GET CURRENT USER EXCEPTION:', error);
      return null;
    }
  }

           // Update User Profile
         // Helper method to get user profile
         static async getProfile(userId: string): Promise<any | null> {
           try {
             console.log('🔍 FETCHING PROFILE: Attempting to get profile for userId:', userId);
             
             const { data: profile, error } = await supabase
               .from('user_profiles')
               .select('*')
               .eq('user_id', userId)
               .single();
             
             if (error && error.code === 'PGRST116') {
               // Profile doesn't exist
               console.log('✅ PROFILE NOT FOUND: No profile exists for user:', userId);
               return null;
             } else if (error) {
               console.error('❌ PROFILE FETCH ERROR:', {
                 code: error.code,
                 message: error.message,
                 details: error.details,
                 hint: error.hint
               });
               return null;
             }
             
             console.log('✅ PROFILE FOUND: Retrieved profile for user:', userId, 'Data:', profile);
             return profile;
           } catch (error) {
             console.error('❌ PROFILE FETCH EXCEPTION:', error);
             return null;
           }
         }

         // Helper method to update profile
         static async updateProfile(userId: string, updates: any): Promise<any> {
           try {
             console.log('🔄 UPDATING PROFILE: Attempting to update profile for userId:', userId, 'with updates:', updates);
             
             const { data, error } = await supabase
               .from('user_profiles')
               .update(updates)
               .eq('user_id', userId)
               .select()
               .single();
             
             if (error) {
               console.error('❌ PROFILE UPDATE ERROR:', {
                 code: error.code,
                 message: error.message,
                 details: error.details,
                 hint: error.hint
               });
               
               // Detect common database errors
               if (error.code === '23505') {
                 console.error('🚨 DUPLICATE KEY ERROR: Attempted to create duplicate profile for user:', userId);
               } else if (error.code === '23503') {
                 console.error('🚨 FOREIGN KEY ERROR: User does not exist in auth.users:', userId);
               } else if (error.code === '23502') {
                 console.error('🚨 NOT NULL ERROR: Missing required field in profile update');
               }
               
               throw error;
             }
             
             console.log('✅ PROFILE UPDATED: Successfully updated profile for user:', userId, 'Result:', data);
             return data;
           } catch (error) {
             console.error('❌ PROFILE UPDATE EXCEPTION:', error);
             throw error;
           }
         }

         // Helper method to insert profile
         static async insertProfile(profileData: any): Promise<any> {
           try {
             console.log('➕ INSERTING PROFILE: Attempting to insert new profile with data:', profileData);
             
             const { data, error } = await supabase
               .from('user_profiles')
               .insert(profileData)
               .select()
               .single();
             
             if (error) {
               console.error('❌ PROFILE INSERT ERROR:', {
                 code: error.code,
                 message: error.message,
                 details: error.details,
                 hint: error.hint
               });
               
               // Detect common database errors
               if (error.code === '23505') {
                 console.error('🚨 DUPLICATE KEY ERROR: Attempted to create duplicate profile for user:', profileData.user_id);
               } else if (error.code === '23503') {
                 console.error('🚨 FOREIGN KEY ERROR: User does not exist in auth.users:', profileData.user_id);
               } else if (error.code === '23502') {
                 console.error('🚨 NOT NULL ERROR: Missing required field in profile creation');
               }
               
               throw error;
             }
             
             console.log('✅ PROFILE INSERTED: Successfully inserted new profile:', data);
             return data;
           } catch (error) {
             console.error('❌ PROFILE INSERT EXCEPTION:', error);
             throw error;
           }
         }

         // Helper method to ensure user exists in auth.users
         static async ensureUserExists(userId: string): Promise<boolean> {
           try {
             console.log('🔐 CHECKING AUTH USER: Verifying user exists in auth.users for userId:', userId);
             
             const { data: { user }, error } = await supabase.auth.getUser();
             if (error || !user || user.id !== userId) {
               console.error('❌ AUTH USER NOT FOUND:', { 
                 userId, 
                 error: error?.message,
                 authUserId: user?.id,
                 isMatch: user?.id === userId
               });
               return false;
             }
             
             console.log('✅ AUTH USER FOUND: User exists in auth.users:', user.id);
             return true;
           } catch (error) {
             console.error('❌ AUTH USER CHECK EXCEPTION:', error);
             return false;
           }
         }

         static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<AuthResult> {
           try {
             console.log('🚀 STARTING PROFILE UPDATE: updateUserProfile called for userId:', userId);
             console.log('📝 UPDATE DATA:', updates);
             
             // Get authenticated user first - this is the source of truth
             const { data: authUser, error: authError } = await supabase.auth.getUser();
             if (authError || !authUser.user) {
               console.error('❌ AUTHENTICATION ERROR: Error getting auth user:', authError);
               return {
                 success: false,
                 error: {
                   message: 'User not authenticated',
                 },
               };
             }

             // Always use the authenticated user's ID for profile operations
             const authenticatedUserId = authUser.user.id;
             console.log('✅ AUTHENTICATED USER ID:', authenticatedUserId);
             console.log('📝 PROVIDED USER ID:', userId);
             
             // Validate that the provided userId matches the authenticated user
             if (userId !== authenticatedUserId) {
               console.error('❌ USER ID MISMATCH: Provided userId does not match authenticated user:', {
                 providedUserId: userId,
                 authenticatedUserId: authenticatedUserId
               });
               return {
                 success: false,
                 error: {
                   message: 'User ID mismatch - use authenticated user ID',
                 },
               };
             }

             console.log('✅ USER ID VALIDATION PASSED: Using authenticated user ID:', authenticatedUserId);

             // Handle JSONB updates properly
             const updateData: any = {};
             
             if (updates.preferences) {
               updateData.preferences = updates.preferences;
             }
             
             if (updates.settings) {
               updateData.settings = updates.settings;
             }
             
             // Handle other fields
             if (updates.avatar_url) {
               updateData.avatar_url = updates.avatar_url;
             }
             
             if (updates.sensory_mode) {
               updateData.sensory_mode = updates.sensory_mode;
             }
             
             // Only update if we have data to update
             if (Object.keys(updateData).length === 0) {
               console.log('No valid update data provided');
               return {
                 success: false,
                 error: {
                   message: 'No valid update data provided',
                 },
               };
             }

             console.log('🔄 PROFILE LOGIC: Starting insert/update logic for user:', userId, 'with data:', updateData);

             // Use authenticated user ID for all profile operations
             const profile = await this.getProfile(authenticatedUserId);

             if (profile) {
               // update
               console.log('✅ PROFILE EXISTS: Profile found, updating existing profile');
               try {
                 const updatedProfile = await this.updateProfile(authenticatedUserId, updateData);
                 console.log('✅ PROFILE UPDATE SUCCESS: Profile updated successfully:', updatedProfile);
                 return {
                   success: true,
                   user: updatedProfile,
                 };
               } catch (updateError) {
                 console.error('❌ PROFILE UPDATE FAILED: Error updating profile:', updateError);
                 
                 // Detect common database errors
                 if (updateError?.code === '23505') {
                   console.error('🚨 DUPLICATE KEY ERROR: Attempted to create duplicate profile for user:', authenticatedUserId);
                   return {
                     success: false,
                     error: {
                       message: 'Profile already exists - use update instead of insert',
                       code: 'DUPLICATE_PROFILE',
                     },
                   };
                 } else if (updateError?.code === '23503') {
                   console.error('🚨 FOREIGN KEY ERROR: User does not exist in auth.users:', authenticatedUserId);
                   return {
                     success: false,
                     error: {
                       message: 'User does not exist - create user in auth.users first',
                       code: 'USER_NOT_FOUND',
                     },
                   };
                 }
                 
                 return {
                   success: false,
                   error: {
                     message: 'Failed to update profile',
                     code: updateError?.code,
                   },
                 };
               }
             } else {
               // insert
               console.log('➕ PROFILE NOT FOUND: Profile does not exist, inserting new profile');
               const userEmail = authUser.user.email;
               if (!userEmail) {
                 console.error('❌ EMAIL ERROR: User email is null');
                 return {
                   success: false,
                   error: {
                     message: 'User email not found',
                   },
                 };
               }

               console.log('✅ EMAIL FOUND: User email for profile creation:', userEmail);
               
               try {
                 const newProfile = await this.insertProfile({
                   user_id: authenticatedUserId,
                   email: userEmail,
                   ...updateData
                 });
                 console.log('✅ PROFILE INSERT SUCCESS: Profile inserted successfully:', newProfile);
                 return {
                   success: true,
                   user: newProfile,
                 };
               } catch (insertError) {
                 console.error('❌ PROFILE INSERT FAILED: Error inserting profile:', insertError);
                 
                 // Detect common database errors
                 if (insertError?.code === '23505') {
                   console.error('🚨 DUPLICATE KEY ERROR: Attempted to create duplicate profile for user:', authenticatedUserId);
                   return {
                     success: false,
                     error: {
                       message: 'Profile already exists - use update instead of insert',
                       code: 'DUPLICATE_PROFILE',
                     },
                   };
                 } else if (insertError?.code === '23503') {
                   console.error('🚨 FOREIGN KEY ERROR: User does not exist in auth.users:', authenticatedUserId);
                   return {
                     success: false,
                     error: {
                       message: 'User does not exist - create user in auth.users first',
                       code: 'USER_NOT_FOUND',
                     },
                   };
                 } else if (insertError?.code === '23502') {
                   console.error('🚨 NOT NULL ERROR: Missing required field in profile creation');
                   return {
                     success: false,
                     error: {
                       message: 'Missing required field - check email and user_id',
                       code: 'MISSING_REQUIRED_FIELD',
                     },
                   };
                 }
                 
                 return {
                   success: false,
                   error: {
                     message: 'Failed to insert profile',
                     code: insertError?.code,
                   },
                 };
               }
             }
           } catch (error) {
             console.error('❌ PROFILE UPDATE EXCEPTION: Unhandled error in updateUserProfile:', {
               error: error,
               message: error?.message,
               code: error?.code,
               stack: error?.stack
             });
             return {
               success: false,
               error: {
                 message: 'Failed to update profile. Please try again.',
                 code: error?.code,
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
            // User profile doesn't exist - let the database trigger handle it
            console.log('User profile does not exist yet - will be created by database trigger');
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
            // User profile doesn't exist - let the database trigger handle it
            console.log('User profile does not exist yet - will be created by database trigger');
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

  // Google Calendar OAuth
  static async initiateGoogleCalendarOAuth(): Promise<AuthResult> {
    try {
      console.log('=== ENVIRONMENT VARIABLES DEBUG ===');
      console.log('EXPO_PUBLIC_GOOGLE_CLIENT_ID:', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID);
      console.log('EXPO_PUBLIC_GOOGLE_CLIENT_SECRET:', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET ? '[SET]' : '[NOT SET]');
      console.log('EXPO_PUBLIC_GOOGLE_REDIRECT_URI:', process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI);
      console.log('NODE_ENV:', process.env.NODE_ENV);
      console.log('===================================');
      
      console.log('Initiating Google Calendar OAuth...');
      
      const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id';
      const redirectUri = process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || 'http://localhost:8082/auth-callback';
      
      // Use a single valid scope for Google Calendar
      const scopeString = 'https://www.googleapis.com/auth/calendar.readonly';
      
      console.log('=== OAUTH PARAMETERS DEBUG ===');
      console.log('clientId:', clientId);
      console.log('redirectUri:', redirectUri);
      console.log('scope string:', scopeString);
      console.log('===================================');
      
      // Check if we have a real client ID
      if (clientId === 'your-google-client-id') {
        console.error('Google Client ID not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file');
        return {
          success: false,
          error: {
            message: 'Google OAuth not configured. Please set up Google OAuth credentials.',
          },
        };
      }
      
      // Build the OAuth URL with properly encoded parameters
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopeString, // Use the properly encoded scope string
        access_type: 'offline',
        prompt: 'consent',
        state: 'calendar'
      });
      
      let googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      
    
      
      // Validate the URL starts correctly
      // if (!googleOAuthUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth?')) {
      //   console.error('Invalid OAuth URL generated:', googleOAuthUrl);
      //   return {
      //     success: false,
      //     error: {
      //       message: 'Failed to generate valid OAuth URL',
      //     },
      //   };
      // }
      
      // For web, we can redirect directly
      if (typeof window !== 'undefined') {
        // console.log('=== FINAL REDIRECT DEBUG (CALENDAR) ===');
        // console.log('Current window.location.origin:', window.location.origin);
        // console.log('Current window.location.href:', window.location.href);
        // console.log('About to redirect to:', googleOAuthUrl);
        // console.log('URL length:', googleOAuthUrl.length);
        // console.log('URL contains scope as path:', googleOAuthUrl.includes('/https://www.googleapis.com/'));
        // console.log('===================================');
        // // Use window.location.href for direct redirect
        // console.log('🔗 REDIRECTING TO GOOGLE CALENDAR OAUTH:', googleOAuthUrl);
        // console.log('🔗 URL validation - starts with Google endpoint:', googleOAuthUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth?'));
        // console.log('🔗 URL validation - contains scope as query param:', googleOAuthUrl.includes('scope='));
        // console.log('🔗 URL validation - contains scope as path:', googleOAuthUrl.includes('/https://www.googleapis.com/'));
        
        // Double-check the URL before redirecting
        // if (googleOAuthUrl.includes('/https://www.googleapis.com/')) {
        //   console.error('❌ MALFORMED URL DETECTED - scope is in path instead of query params!');
        //   console.error('❌ This should NOT happen with URLSearchParams!');
        //   return {
        //     success: false,
        //     error: {
        //       message: 'OAuth URL construction failed - scope malformed',
        //     },
        //   };
        // }
        
        // PROOF: Log the exact URL we're about to redirect to
        console.log('🔗 PROOF - About to redirect to:', googleOAuthUrl);
        console.log('🔗 PROOF - URL type:', typeof googleOAuthUrl);
        console.log('🔗 PROOF - URL length:', googleOAuthUrl.length);
        console.log('🔗 PROOF - URL starts with https://accounts.google.com:', googleOAuthUrl.startsWith('https://accounts.google.com'));
        console.log('🔗 PROOF - URL contains scope as query param:', googleOAuthUrl.includes('scope='));
        console.log('🔗 PROOF - URL contains scope as path:', googleOAuthUrl.includes('/https://www.googleapis.com/'));
        
        // Check for malformed URL before redirecting
        if (checkForMalformedUrl(googleOAuthUrl, 'Google Calendar OAuth')) {
          return {
            success: false,
            error: {
              message: 'OAuth URL is malformed due to scope encoding issue',
            },
          };
        }
        
        // PROOF: Alert the exact URL before redirect
        alert('Redirecting to: ' + googleOAuthUrl);
        
        window.location.href = googleOAuthUrl;
        return {
          success: true,
        };
      }
      
      // For mobile, you would use a WebView or deep linking
      return {
        success: false,
        error: {
          message: 'Google Calendar OAuth is not yet implemented for mobile',
        },
      };
    } catch (error) {
      console.error('Error initiating Google Calendar OAuth:', error);
      return {
        success: false,
        error: {
          message: 'Failed to initiate Google Calendar OAuth',
        },
      };
    }
  }

  // Google Keep OAuth (using Google Drive API since Keep notes are stored in Drive)
  static async initiateGoogleKeepOAuth(): Promise<AuthResult> {
    console.log('🔗 PROOF - initiateGoogleKeepOAuth() function started');
    try {
     
      const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id';
      const redirectUri = process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || 'http://localhost:8082/auth-callback';
      
      // Define scopes as separate values for proper encoding
      // For Google Keep integration, we need multiple scopes:
      // - drive.readonly: to read files
      // - drive.metadata.readonly: to read file metadata
      // - docs.readonly: to read Google Docs (Keep notes are stored as docs)
      const scopes = [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.metadata.readonly',
        'https://www.googleapis.com/auth/documents.readonly'
      ];
      // Encode each scope individually, then join with spaces
    
      const scopeString = scopes.join(' '); // Join encoded scopes with space
      
      // Ensure proper encoding of the scope string
      
      
    
      // Check if we have a real client ID
      if (clientId === 'your-google-client-id') {
        console.error('Google Client ID not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file');
        return {
          success: false,
          error: {
            message: 'Google OAuth not configured. Please set up Google OAuth credentials.',
          },
        };
      }
      
      // Build the OAuth URL with properly encoded parameters
      const params = new URLSearchParams();
      params.append('client_id', clientId);
      params.append('redirect_uri', redirectUri);
      params.append('response_type', 'code');
      params.append('scope', scopeString); // Use the properly encoded scope string
      params.append('access_type', 'offline');
      params.append('prompt', 'consent');
      params.append('state', 'keep');
      
      let googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      console.log('🔗 PROOF - googleOAuthUrl constructed:', googleOAuthUrl);
      
      // Debug the URL construction
      console.log('🔍 OAuth URL Debug:');
      console.log('🔍 Client ID:', clientId);
      console.log('🔍 Redirect URI:', redirectUri);
      console.log('🔍 Scope String:', scopeString);
      console.log('🔍 Params toString():', params.toString());
      console.log('🔍 Final URL:', googleOAuthUrl);
      console.log('🔍 URL validation - starts with Google endpoint:', googleOAuthUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth?'));
      console.log('🔍 URL validation - contains scope as query param:', googleOAuthUrl.includes('scope='));
      console.log('🔍 URL validation - contains scope as path:', googleOAuthUrl.includes('/https://www.googleapis.com/'));
      
      
      // Validate the URL starts correctly
      // if (!googleOAuthUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth?')) {
      //   console.error('Invalid OAuth URL generated:', googleOAuthUrl);
      //   return {
      //     success: false,
      //     error: {
      //       message: 'Failed to generate valid OAuth URL',
      //     },
      //   };
      // }
      
      console.log('🔗 PROOF - About to check if window is defined');
      // For web, we can redirect directly
      if (typeof window !== 'undefined') {
        console.log('🔗 PROOF - Window is defined, proceeding with redirect');
        // console.log('=== FINAL REDIRECT DEBUG (KEEP) ===');
        // console.log('Current window.location.origin:', window.location.origin);
        // console.log('Current window.location.href:', window.location.href);
        // console.log('About to redirect to:', googleOAuthUrl);
        // console.log('URL length:', googleOAuthUrl.length);
        // console.log('URL contains scope as path:', googleOAuthUrl.includes('/https://www.googleapis.com/'));
        // console.log('===================================');
        // Use window.location.href for direct redirect
        // console.log('🔗 REDIRECTING TO GOOGLE KEEP OAUTH:', googleOAuthUrl);
        // console.log('🔗 URL validation - starts with Google endpoint:', googleOAuthUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth?'));
        // console.log('🔗 URL validation - contains scope as query param:', googleOAuthUrl.includes('scope='));
        // console.log('🔗 URL validation - contains scope as path:', googleOAuthUrl.includes('/https://www.googleapis.com/'));
        
        // Double-check the URL before redirecting
        // if (googleOAuthUrl.includes('/https://www.googleapis.com/')) {
        //   console.error('❌ MALFORMED URL DETECTED - scope is in path instead of query params!');
        //   console.error('❌ This should NOT happen with URLSearchParams!');
        //   return {
        //     success: false,
        //     error: {
        //       message: 'OAuth URL construction failed - scope malformed',
        //     },
        //   };
        // }
        
        // PROOF: Log the exact URL we're about to redirect to
        console.log('🔗 PROOF - About to redirect to:', googleOAuthUrl);
        console.log('🔗 PROOF - URL type:', typeof googleOAuthUrl);
        console.log('🔗 PROOF - URL length:', googleOAuthUrl.length);
        console.log('🔗 PROOF - URL starts with https://accounts.google.com:', googleOAuthUrl.startsWith('https://accounts.google.com'));
        console.log('🔗 PROOF - URL contains scope as query param:', googleOAuthUrl.includes('scope='));
        console.log('🔗 PROOF - URL contains scope as path:', googleOAuthUrl.includes('/https://www.googleapis.com/'));
        
        // PROOF: Store the URL in localStorage before redirect so we can check it later
        localStorage.setItem('last_oauth_url', googleOAuthUrl);
        localStorage.setItem('last_oauth_timestamp', Date.now().toString());
        
        // Check for malformed URL before redirecting
        if (checkForMalformedUrl(googleOAuthUrl, 'Google Keep OAuth')) {
          return {
            success: false,
            error: {
              message: 'OAuth URL is malformed due to scope encoding issue',
            },
          };
        }
        
        // PROOF: Alert the exact URL before redirect
        alert('Redirecting to: ' + googleOAuthUrl);
        
        window.location.href = googleOAuthUrl;
        return {
          success: true,
        };
      }
      
      // For mobile, you would use a WebView or deep linking
      return {
        success: false,
        error: {
          message: 'Google Keep OAuth is not yet implemented for mobile',
        },
      };
    } catch (error) {
      console.error('🔗 PROOF - Error in initiateGoogleKeepOAuth:', error);
      return {
        success: false,
        error: {
          message: 'Failed to initiate Google Keep OAuth',
        },
      };
    }
  }

  // Google Calendar Data Fetching
  static async fetchGoogleCalendarEvents(): Promise<any[]> {
    try {
      console.log('Fetching Google Calendar events...');
      
      // Get the stored access token from localStorage (Calendar-specific)
      const accessToken = localStorage.getItem('google_calendar_token');
      
      if (!accessToken) {
        console.error('No Google Calendar access token found. User needs to authenticate first.');
        return [];
      }
      
      console.log('✅ Google Calendar access token found in localStorage');
      
      // For now, we'll skip token expiry check since we're using localStorage
      // In a production app, you'd want to store expiry info and refresh tokens
      
      // Fetch Google Calendar events
      const now = new Date();
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(now.getMonth() + 1);
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${oneMonthFromNow.toISOString()}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error fetching Google Calendar events:', response.status);
        console.error('❌ Error response:', errorText);
        throw new Error(`Google Calendar API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Google Calendar events fetched:', data.items?.length || 0);
      
      // Convert to our event format
      const convertedEvents = data.items?.map((event: any) => ({
        id: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description || '',
        start_time: event.start?.dateTime || event.start?.date,
        end_time: event.end?.dateTime || event.end?.date,
        all_day: !event.start?.dateTime,
        location: event.location || '',
        color: event.colorId ? `#${event.colorId}` : '#4285f4',
        external_id: event.id,
        sync_source: 'google_calendar',
        date: event.start?.dateTime ? new Date(event.start.dateTime).toISOString().split('T')[0] : event.start?.date,
        time: event.start?.dateTime ? new Date(event.start.dateTime).toTimeString().split(' ')[0] : undefined,
        type: 'event' as const,
        createdAt: new Date()
      })) || [];
      
      return convertedEvents;
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error);
      return [];
    }
  }

  // Exchange authorization code for access tokens
  static async exchangeGoogleCodeForTokens(code: string): Promise<AuthResult> {
    try {
      console.log('Exchanging Google authorization code for tokens...');
      
      const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
      const clientSecret = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || 'http://localhost:8082/auth-callback';
      
      if (!clientId || !clientSecret) {
        return {
          success: false,
          error: {
            message: 'Google OAuth credentials not configured',
          },
        };
      }
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', tokenData);
        return {
          success: false,
          error: {
            message: 'Failed to exchange authorization code for tokens',
          },
        };
      }
      
      console.log('Successfully obtained Google access tokens');
      
      // Store tokens securely (you might want to encrypt these)
      // For now, we'll store them in the user's profile
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) {
        await AuthService.updateUserProfile(currentUser.id, {
          settings: {
            ...currentUser.profile?.settings,
            googleAccessToken: tokenData.access_token,
            googleRefreshToken: tokenData.refresh_token,
            googleTokenExpiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          }
        });
      }
      
      return {
        success: true,
        user: {
          ...currentUser,
          googleTokens: {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in,
          }
        }
      };
    } catch (error) {
      console.error('Error exchanging Google code for tokens:', error);
      return {
        success: false,
        error: {
          message: 'Failed to exchange authorization code for tokens',
        },
      };
    }
  }

  // Refresh Google access tokens
  static async refreshGoogleTokens(): Promise<AuthResult> {
    try {
      console.log('Refreshing Google access tokens...');
      
      const currentUser = await AuthService.getCurrentUser();
      const refreshToken = currentUser?.profile?.settings?.googleRefreshToken;
      
      if (!refreshToken) {
        return {
          success: false,
          error: {
            message: 'No refresh token found. User needs to re-authenticate.',
          },
        };
      }
      
      const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
      const clientSecret = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        return {
          success: false,
          error: {
            message: 'Google OAuth credentials not configured',
          },
        };
      }
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }),
      });
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        console.error('Token refresh failed:', tokenData);
        return {
          success: false,
          error: {
            message: 'Failed to refresh access token',
          },
        };
      }
      
      console.log('Successfully refreshed Google access tokens');
      
      // Update the stored tokens
      if (currentUser) {
        await AuthService.updateUserProfile(currentUser.id, {
          settings: {
            ...currentUser.profile?.settings,
            googleAccessToken: tokenData.access_token,
            googleTokenExpiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          }
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error refreshing Google tokens:', error);
      return {
        success: false,
        error: {
          message: 'Failed to refresh access token',
        },
      };
    }
  }

  // Store OAuth tokens
  static async storeOAuthTokens(accessToken: string, providerToken: string): Promise<AuthResult> {
    try {
      console.log('Storing OAuth tokens...');
      
      // First, try to get current user
      const currentUser = await AuthService.getCurrentUser();
      
      if (currentUser) {
        // User session is available, store tokens in profile
        console.log('User session available, storing tokens in profile');
        
        const result = await AuthService.updateUserProfile(currentUser.id, {
          settings: {
            ...currentUser.profile?.settings,
            googleAccessToken: providerToken,
            googleTokenExpiry: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour expiry
            googleKeepConnected: true,
            googleKeepConnectedAt: new Date().toISOString(),
          }
        });
        
        if (result.success) {
          console.log('OAuth tokens stored successfully in profile');
          return { success: true };
        } else {
          console.error('Failed to store OAuth tokens in profile:', result.error);
          return result;
        }
      } else {
        // User session not available, store tokens in localStorage temporarily
        console.log('User session not available, storing tokens in localStorage');
        
        try {
          await AsyncStorage.setItem('pendingGoogleTokens', JSON.stringify({
            accessToken,
            providerToken,
            timestamp: Date.now(),
            expiry: new Date(Date.now() + 3600 * 1000).toISOString()
          }));
          
          console.log('OAuth tokens stored temporarily in localStorage');
          return { success: true };
        } catch (storageError) {
          console.error('Failed to store tokens in localStorage:', storageError);
          return {
            success: false,
            error: {
              message: 'Failed to store OAuth tokens temporarily',
            },
          };
        }
      }
    } catch (error) {
      console.error('Error storing OAuth tokens:', error);
      return {
        success: false,
        error: {
          message: 'Failed to store OAuth tokens',
        },
      };
    }
  }

  // Process pending OAuth tokens
  static async processPendingTokens(): Promise<void> {
    try {
      console.log('Checking for pending OAuth tokens...');
      
      const pendingTokensData = await AsyncStorage.getItem('pendingGoogleTokens');
      
      if (pendingTokensData) {
        const pendingTokens = JSON.parse(pendingTokensData);
        const currentUser = await AuthService.getCurrentUser();
        
        if (currentUser && pendingTokens.timestamp) {
          // Check if tokens are still valid (within 1 hour)
          const tokenAge = Date.now() - pendingTokens.timestamp;
          const maxAge = 60 * 60 * 1000; // 1 hour
          
          if (tokenAge < maxAge) {
            console.log('Processing pending OAuth tokens...');
            
            const result = await AuthService.updateUserProfile(currentUser.id, {
              settings: {
                ...currentUser.profile?.settings,
                googleAccessToken: pendingTokens.providerToken,
                googleTokenExpiry: pendingTokens.expiry,
                googleKeepConnected: true,
                googleKeepConnectedAt: new Date().toISOString(),
              }
            });
            
            if (result.success) {
              console.log('Pending OAuth tokens processed successfully');
              await AsyncStorage.removeItem('pendingGoogleTokens');
            } else {
              console.error('Failed to process pending OAuth tokens:', result.error);
            }
          } else {
            console.log('Pending OAuth tokens expired, removing...');
            await AsyncStorage.removeItem('pendingGoogleTokens');
          }
        }
      }
    } catch (error) {
      console.error('Error processing pending tokens:', error);
    }
  }

  // Google Keep Data Fetching
  static async fetchGoogleKeepNotes(): Promise<any[]> {
    try {
      console.log('Fetching Google Keep notes...');
      
      // Get the stored access token from localStorage (Notes/Keep-specific)
      const accessToken = localStorage.getItem('google_keep_token');
      
      if (!accessToken) {
        console.error('No Google access token found. User needs to authenticate first.');
        return [];
      }
      
      console.log('✅ Google access token found in localStorage');
      
      // For now, we'll skip token expiry check since we're using localStorage
      // In a production app, you'd want to store expiry info and refresh tokens
      
      // Fetch Google Keep notes via Google Drive API
      // Google Keep notes are stored as Google Docs in a specific folder
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.document"&spaces=drive&fields=files(id,name,createdTime,modifiedTime,parents)&orderBy=modifiedTime desc`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error fetching Google Drive files:', response.status);
        console.error('❌ Error response:', errorText);
        throw new Error(`Google Drive API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Google Drive files fetched:', data.files?.length || 0);
      
      // Filter for Google Keep notes (they have specific naming patterns)
      const keepNotes = data.files?.filter((file: any) => {
        // Google Keep notes typically have names that start with "Keep" or contain "note"
        return file.name.toLowerCase().includes('keep') || 
               file.name.toLowerCase().includes('note') ||
               file.name.toLowerCase().includes('memo');
      }) || [];
      
      console.log('✅ Google Keep notes found:', keepNotes.length);
      
      // Convert to our note format
      const convertedNotes = keepNotes.map((file: any) => ({
        id: file.id,
        title: file.name,
        content: `Google Keep note: ${file.name}`,
        category: 'personal' as const,
        createdAt: file.createdTime,
        updatedAt: file.modifiedTime,
        external_id: file.id,
        sync_source: 'google_keep'
      }));
      
      return convertedNotes;
    } catch (error) {
      console.error('Error fetching Google Keep notes:', error);
      return [];
    }
  }
} 