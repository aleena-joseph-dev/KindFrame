import { useGuestMode } from '@/contexts/GuestModeContext';
import { supabase } from '@/lib/supabase';
import { AuthService } from '@/services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function AuthCallback() {
  const router = useRouter();
  const session = useSession();
  const { isGuestMode, migrateGuestDataToUser } = useGuestMode();
  
  // Track if we've already processed the callback to avoid double processing
  const [hasProcessed, setHasProcessed] = React.useState(false);
  const [isMigrating, setIsMigrating] = React.useState(false);

  const checkOnboardingStatus = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) return false;

      // Check if user has completed onboarding in their profile
      const hasCompletedInProfile = currentUser.profile?.settings?.hasCompletedOnboarding;
      let hasCompletedInStorage = await AsyncStorage.getItem('hasCompletedOnboarding');
      
      console.log('Auth callback onboarding check:', {
        hasCompletedInProfile,
        hasCompletedInStorage,
        profileExists: !!currentUser.profile,
        settingsExist: !!currentUser.profile?.settings
      });
      
      // ADDITIONAL FIX: Clear AsyncStorage flag if it exists but profile doesn't have explicit flag
      if (hasCompletedInStorage === 'true' && !hasCompletedInProfile) {
        console.log('🔧 ADDITIONAL FIX: Clearing AsyncStorage flag because profile has no explicit completion flag');
        await AsyncStorage.removeItem('hasCompletedOnboarding');
        hasCompletedInStorage = null;
      }
      
      // Only consider it completed if hasCompletedOnboarding is explicitly true
      const isOnboardingCompleted = hasCompletedInProfile === true || hasCompletedInStorage === 'true';
      
      console.log('Auth callback onboarding completion:', isOnboardingCompleted);
      return isOnboardingCompleted;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  };

  const redirectToApp = async () => {
    // Check if user needs onboarding
    const hasCompletedOnboarding = await checkOnboardingStatus();
    if (hasCompletedOnboarding) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding');
    }
  };

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Prevent double processing
      if (hasProcessed) {
        console.log('🔍 Auth callback already processed, skipping...');
        return;
      }
      
      setHasProcessed(true);
      try {
        console.log('🔍 Processing Supabase OAuth callback...');
        
        // Check if supabase client is available
        if (!supabase || !supabase.auth) {
          console.error('❌ Supabase client is not available');
          router.replace('/');
          return;
        }
        
        // Get the current URL
        const url = window.location.href;
        console.log('🔍 Current URL:', url);
        
        // Check if this is an OAuth callback (has access_token in URL)
        if (url.includes('access_token=') || url.includes('code=')) {
          console.log('🔍 OAuth callback detected, processing...');
          
          // Extract provider token from URL hash if present
          if (url.includes('provider_token=')) {
            console.log('🔍 Extracting provider token from URL...');
            const hashString = url.split('#')[1];
            console.log('🔍 Hash string:', hashString);
            const hashParams = new URLSearchParams(hashString);
            const providerToken = hashParams.get('provider_token');
            
            console.log('🔍 Provider token extracted:', !!providerToken);
            console.log('🔍 Provider token length:', providerToken ? providerToken.length : 0);
            
            if (providerToken) {
              // Determine which service this token is for based on state parameter
              const urlParams = new URLSearchParams(window.location.search);
              const state = urlParams.get('state');
              
              let storageKey = 'google_provider_token'; // default
              if (state === 'calendar') {
                storageKey = 'google_calendar_token';
                console.log('🔍 Calendar OAuth detected, storing in google_calendar_token');
              } else if (state === 'notes') {
                storageKey = 'google_keep_token';
                console.log('🔍 Notes OAuth detected, storing in google_keep_token');
              } else {
                console.log('🔍 Default OAuth detected, storing in google_provider_token');
              }
              
              localStorage.setItem(storageKey, providerToken);
              console.log(`🔍 Provider token stored in localStorage as ${storageKey}`);
              console.log('🔍 Provider token (first 20 chars):', providerToken.substring(0, 20) + '...');
              
              // Verify storage
              const storedToken = localStorage.getItem(storageKey);
              console.log(`🔍 Verification - stored token exists in ${storageKey}:`, !!storedToken);
            } else {
              console.log('❌ No provider token found in URL');
            }
          } else {
            console.log('❌ No provider_token= found in URL');
          }
          
          // For OAuth callbacks, we need to let Supabase process the URL
          // The URL contains the tokens that need to be processed
          let data, error;
          try {
            const result = await supabase.auth.getSession();
            data = result.data;
            error = result.error;
          } catch (sessionError) {
            console.error('❌ Error getting session:', sessionError);
            error = sessionError;
            data = { session: null };
          }
          
          // If no session yet, try to set the session from the URL
          if (!data.session && url.includes('access_token=')) {
            console.log('🔍 Attempting to set session from URL tokens...');
            // Extract the access token from URL and set it
            const hashString = url.split('#')[1];
            const hashParams = new URLSearchParams(hashString);
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            
            console.log('🔍 Extracted tokens from URL:');
            console.log('🔍 Access token exists:', !!accessToken);
            console.log('🔍 Refresh token exists:', !!refreshToken);
            
            if (accessToken) {
              console.log('🔍 Setting session with access token...');
              try {
                const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken || ''
                });
                
                if (sessionError) {
                  console.error('❌ Error setting session:', sessionError);
                  // If setting session fails, try to refresh the token
                  if (refreshToken) {
                    console.log('🔍 Attempting to refresh token...');
                    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                    if (refreshError) {
                      console.error('❌ Error refreshing session:', refreshError);
                    } else if (refreshData.session) {
                      console.log('✅ Session refreshed successfully');
                      data.session = refreshData.session;
                    }
                  }
                } else if (sessionData.session) {
                  console.log('✅ Session set successfully from URL tokens');
                  data.session = sessionData.session;
                }
              } catch (error) {
                console.error('❌ Error in setSession:', error);
              }
            }
          }
          
          if (error) {
            console.error('❌ Auth callback error:', error);
            router.replace('/calendar');
            return;
          }
          
          if (data.session) {
            console.log('✅ OAuth successful, session created');
            console.log('🔍 User:', data.session.user.email);
            console.log('🔍 Provider token exists:', !!data.session.provider_token);
            console.log('🔍 Provider token (first 20 chars):', data.session.provider_token ? data.session.provider_token.substring(0, 20) + '...' : 'NO TOKEN');
            
            // Check if we came from the test page, calendar page, or notes page
            const urlParams = new URLSearchParams(window.location.search);
            const urlHash = window.location.hash;
            
            // Parse the hash fragment more carefully
            let state = urlParams.get('state');
            if (!state && urlHash) {
              // Try to extract state from hash fragment
              const hashString = urlHash.substring(1); // Remove the #
              console.log('🔍 Hash string:', hashString);
              
              // Look for state parameter in the hash
              const stateMatch = hashString.match(/[?&]state=([^&]+)/);
              if (stateMatch) {
                state = stateMatch[1];
                console.log('🔍 Found state in hash:', state);
              }
            }
            
            const referrer = document.referrer;
            
            console.log('🔍 URL params:', window.location.search);
            console.log('🔍 URL hash:', urlHash);
            console.log('🔍 State parameter:', state);
            console.log('🔍 Referrer:', referrer);
            
            // Check referrer first, then state parameter
            if (referrer.includes('test-google-calendar') || window.location.href.includes('test-google-calendar')) {
              console.log('🔍 Redirecting back to test page');
              window.location.href = '/test-google-calendar.html';
            } else if (state === 'calendar' || referrer.includes('calendar')) {
              console.log('🔍 Redirecting to calendar page');
              router.replace('/calendar');
            } else if (state === 'notes' || referrer.includes('notes')) {
              console.log('🔍 Redirecting to notes page');
              router.replace('/notes');
            } else if (referrer.includes('localhost:8082') && !referrer.includes('calendar') && !referrer.includes('notes')) {
              // If coming from localhost:8082 but not specifically calendar or notes, 
              // check if we have Google Drive scope (Keep) or Calendar scope
              const urlHash = window.location.hash;
              if (urlHash.includes('scope=')) {
                const scopeMatch = urlHash.match(/scope=([^&]+)/);
                if (scopeMatch) {
                  const scope = decodeURIComponent(scopeMatch[1]);
                  console.log('🔍 Detected scope:', scope);
                  if (scope.includes('drive.readonly')) {
                    console.log('🔍 Google Keep scope detected, redirecting to notes page');
                    router.replace('/notes');
                  } else if (scope.includes('calendar')) {
                    console.log('🔍 Google Calendar scope detected, redirecting to calendar page');
                    router.replace('/calendar');
                  } else {
                    console.log('🔍 Unknown scope, defaulting to home page');
                    router.replace('/(tabs)');
                  }
                } else {
                  console.log('🔍 No scope detected, defaulting to home page');
                  router.replace('/(tabs)');
                }
              } else {
                console.log('🔍 No scope in URL, defaulting to home page');
                router.replace('/(tabs)');
              }
            } else {
              console.log('🔍 Default redirect to home page');
              await redirectToApp();
            }
          } else {
            console.log('⚠️ No session found after OAuth, redirecting to home page');
            await redirectToApp();
          }
        } else {
          console.log('🔍 No OAuth callback detected, checking existing session...');
          
          // Check if user already has a session
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('❌ Session check error:', error);
            router.replace('/(tabs)');
            return;
          }
          
          if (data.session) {
            console.log('✅ Existing session found');
            console.log('🔍 User:', data.session.user.email);
            console.log('🔍 Provider token exists:', !!data.session.provider_token);
            
            // Check if user was in guest mode and migrate data
            if (isGuestMode) {
              try {
                setIsMigrating(true);
                console.log('🔍 Migrating guest data to user account...');
                await migrateGuestDataToUser(data.session.user.id);
                console.log('🔍 Guest data migration completed');
              } catch (error) {
                console.error('❌ Error migrating guest data:', error);
              } finally {
                setIsMigrating(false);
              }
            }
            
            await redirectToApp();
          } else {
            console.log('⚠️ No session found, redirecting to home page');
            await redirectToApp();
          }
        }
      } catch (error) {
        console.error('❌ Error in auth callback:', error);
        router.replace('/(tabs)');
      }
    };

    handleAuthCallback();
  }, [router, supabase.auth]);

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#f5f5f5'
    }}>
      <ActivityIndicator size="large" color="#4285f4" />
      <Text style={{ 
        marginTop: 16, 
        fontSize: 16, 
        color: '#333',
        textAlign: 'center'
      }}>
        {isMigrating ? 'Migrating your data...' : 'Processing authentication...'}
      </Text>
    </View>
  );
} 