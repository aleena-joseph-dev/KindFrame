# 👥 User Management with Supabase

## Overview

This guide covers comprehensive user management features in Supabase for the KindFrame app, including user profiles, preferences, sensory settings, and advanced user data management.

## Prerequisites

1. **Supabase Project**: Active Supabase project with auth configured
2. **React Native App**: KindFrame app with Supabase client configured
3. **Basic Auth Setup**: Authentication system working

## Step 1: User Profile Management

### 1.1 Enhanced User Schema

```sql
-- Enhanced users table with KindFrame-specific fields
CREATE TABLE users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  sensory_mode TEXT DEFAULT 'low' CHECK (sensory_mode IN ('low', 'medium', 'high')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  profile_image_url TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'UTC',
  preferences JSONB DEFAULT '{}',
  accessibility_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User preferences table for extensible settings
CREATE TABLE user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);

-- User accessibility settings
CREATE TABLE user_accessibility (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  high_contrast BOOLEAN DEFAULT FALSE,
  reduced_motion BOOLEAN DEFAULT FALSE,
  screen_reader_friendly BOOLEAN DEFAULT FALSE,
  font_size TEXT DEFAULT 'medium',
  color_blindness_support BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accessibility ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Similar policies for other tables...
```

### 1.2 User Profile Service

```typescript
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  sensory_mode: 'low' | 'medium' | 'high';
  onboarding_completed: boolean;
  profile_image_url?: string;
  bio?: string;
  timezone: string;
  preferences: Record<string, any>;
  accessibility_settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export class UserProfileService {
  // Get user profile
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_preferences(preference_key, preference_value),
          user_accessibility(*)
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  // Update user profile
  static async updateUserProfile(userId: string, updates: Partial<UserProfile>) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Update user preference
  static async updateUserPreference(userId: string, key: string, value: any) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          preference_key: key,
          preference_value: value,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user preference:', error);
      throw error;
    }
  }

  // Update accessibility settings
  static async updateAccessibilitySettings(userId: string, settings: any) {
    try {
      const { data, error } = await supabase
        .from('user_accessibility')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating accessibility settings:', error);
      throw error;
    }
  }

  // Upload profile image
  static async uploadProfileImage(userId: string, imageUri: string) {
    try {
      const fileName = `profile-${userId}-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('profile-images')
        .upload(fileName, {
          uri: imageUri,
          type: 'image/jpeg',
          name: fileName,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      // Update user profile with new image URL
      await this.updateUserProfile(userId, {
        profile_image_url: urlData.publicUrl,
      });

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw error;
    }
  }
}
```

## Step 2: Sensory Mode Management

### 2.1 Sensory Mode Context

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfileService } from '../services/UserProfileService';

interface SensoryModeContextType {
  sensoryMode: 'low' | 'medium' | 'high';
  setSensoryMode: (mode: 'low' | 'medium' | 'high') => Promise<void>;
  isLoading: boolean;
}

const SensoryModeContext = createContext<SensoryModeContextType | undefined>(undefined);

export function SensoryModeProvider({ children }: { children: React.ReactNode }) {
  const [sensoryMode, setSensoryModeState] = useState<'low' | 'medium' | 'high'>('low');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSensoryMode();
  }, []);

  const loadSensoryMode = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        const profile = await UserProfileService.getUserProfile(user.id);
        if (profile?.sensory_mode) {
          setSensoryModeState(profile.sensory_mode);
        }
      }
    } catch (error) {
      console.error('Error loading sensory mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setSensoryMode = async (mode: 'low' | 'medium' | 'high') => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await UserProfileService.updateUserProfile(user.id, { sensory_mode: mode });
        setSensoryModeState(mode);
      }
    } catch (error) {
      console.error('Error updating sensory mode:', error);
      throw error;
    }
  };

  return (
    <SensoryModeContext.Provider value={{
      sensoryMode,
      setSensoryMode,
      isLoading,
    }}>
      {children}
    </SensoryModeContext.Provider>
  );
}

export function useSensoryMode() {
  const context = useContext(SensoryModeContext);
  if (context === undefined) {
    throw new Error('useSensoryMode must be used within a SensoryModeProvider');
  }
  return context;
}
```

### 2.2 Sensory Mode Selector

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSensoryMode } from '../contexts/SensoryModeContext';

export function SensoryModeSelector() {
  const { sensoryMode, setSensoryMode, isLoading } = useSensoryMode();

  const modes = [
    { key: 'low', label: 'Low Sensory', description: 'Calm, muted colors' },
    { key: 'medium', label: 'Medium Sensory', description: 'Balanced stimulation' },
    { key: 'high', label: 'High Sensory', description: 'Bold, vibrant colors' },
  ] as const;

  const handleModeChange = async (mode: 'low' | 'medium' | 'high') => {
    try {
      await setSensoryMode(mode);
    } catch (error) {
      Alert.alert('Error', 'Failed to update sensory mode');
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sensory Mode</Text>
      <Text style={styles.subtitle}>
        Choose the visual stimulation level that works best for you
      </Text>
      
      {modes.map((mode) => (
        <TouchableOpacity
          key={mode.key}
          style={[
            styles.modeOption,
            sensoryMode === mode.key && styles.selectedMode
          ]}
          onPress={() => handleModeChange(mode.key)}
        >
          <View style={styles.modeContent}>
            <Text style={styles.modeLabel}>{mode.label}</Text>
            <Text style={styles.modeDescription}>{mode.description}</Text>
          </View>
          {sensoryMode === mode.key && (
            <View style={styles.checkmark}>
              <Text>✓</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

## Step 3: User Preferences System

### 3.1 Preferences Manager

```typescript
export class UserPreferencesManager {
  // Get all user preferences
  static async getUserPreferences(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preference_key, preference_value')
        .eq('user_id', userId);

      if (error) throw error;

      const preferences: Record<string, any> = {};
      data.forEach(pref => {
        preferences[pref.preference_key] = pref.preference_value;
      });

      return preferences;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return {};
    }
  }

  // Set a specific preference
  static async setPreference(userId: string, key: string, value: any) {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          preference_key: key,
          preference_value: value,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error setting preference:', error);
      throw error;
    }
  }

  // Get a specific preference
  static async getPreference(userId: string, key: string, defaultValue?: any) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preference_value')
        .eq('user_id', userId)
        .eq('preference_key', key)
        .single();

      if (error) return defaultValue;
      return data?.preference_value ?? defaultValue;
    } catch (error) {
      console.error('Error getting preference:', error);
      return defaultValue;
    }
  }

  // Delete a preference
  static async deletePreference(userId: string, key: string) {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', userId)
        .eq('preference_key', key);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting preference:', error);
      throw error;
    }
  }
}
```

### 3.2 Preferences Hook

```typescript
import { useState, useEffect } from 'react';
import { UserPreferencesManager } from '../services/UserPreferencesManager';

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        const prefs = await UserPreferencesManager.getUserPreferences(user.id);
        setPreferences(prefs);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setPreference = async (key: string, value: any) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await UserPreferencesManager.setPreference(user.id, key, value);
        setPreferences(prev => ({ ...prev, [key]: value }));
      }
    } catch (error) {
      console.error('Error setting preference:', error);
      throw error;
    }
  };

  const getPreference = (key: string, defaultValue?: any) => {
    return preferences[key] ?? defaultValue;
  };

  const deletePreference = async (key: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await UserPreferencesManager.deletePreference(user.id, key);
        setPreferences(prev => {
          const newPrefs = { ...prev };
          delete newPrefs[key];
          return newPrefs;
        });
      }
    } catch (error) {
      console.error('Error deleting preference:', error);
      throw error;
    }
  };

  return {
    preferences,
    setPreference,
    getPreference,
    deletePreference,
    isLoading,
  };
}
```

## Step 4: Accessibility Settings

### 4.1 Accessibility Manager

```typescript
export class AccessibilityManager {
  // Get user accessibility settings
  static async getAccessibilitySettings(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_accessibility')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching accessibility settings:', error);
      return null;
    }
  }

  // Update accessibility settings
  static async updateAccessibilitySettings(userId: string, settings: any) {
    try {
      const { data, error } = await supabase
        .from('user_accessibility')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating accessibility settings:', error);
      throw error;
    }
  }

  // Apply accessibility settings to UI
  static applyAccessibilitySettings(settings: any, baseStyles: any) {
    const modifiedStyles = { ...baseStyles };

    if (settings.high_contrast) {
      // Increase contrast
      modifiedStyles.backgroundColor = '#000000';
      modifiedStyles.color = '#FFFFFF';
    }

    if (settings.reduced_motion) {
      // Disable animations
      modifiedStyles.animationDuration = '0s';
    }

    if (settings.font_size === 'large') {
      // Increase font size
      modifiedStyles.fontSize = modifiedStyles.fontSize * 1.2;
    }

    return modifiedStyles;
  }
}
```

### 4.2 Accessibility Settings Screen

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, Switch, TouchableOpacity, Alert } from 'react-native';
import { AccessibilityManager } from '../services/AccessibilityManager';

export function AccessibilitySettingsScreen() {
  const [settings, setSettings] = useState({
    high_contrast: false,
    reduced_motion: false,
    screen_reader_friendly: false,
    font_size: 'medium',
    color_blindness_support: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        const accessibilitySettings = await AccessibilityManager.getAccessibilitySettings(user.id);
        if (accessibilitySettings) {
          setSettings(accessibilitySettings);
        }
      }
    } catch (error) {
      console.error('Error loading accessibility settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        const newSettings = { ...settings, [key]: value };
        await AccessibilityManager.updateAccessibilitySettings(user.id, newSettings);
        setSettings(newSettings);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update accessibility setting');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accessibility Settings</Text>
      
      <View style={styles.setting}>
        <Text style={styles.settingLabel}>High Contrast</Text>
        <Switch
          value={settings.high_contrast}
          onValueChange={(value) => updateSetting('high_contrast', value)}
        />
      </View>
      
      <View style={styles.setting}>
        <Text style={styles.settingLabel}>Reduced Motion</Text>
        <Switch
          value={settings.reduced_motion}
          onValueChange={(value) => updateSetting('reduced_motion', value)}
        />
      </View>
      
      <View style={styles.setting}>
        <Text style={styles.settingLabel}>Screen Reader Friendly</Text>
        <Switch
          value={settings.screen_reader_friendly}
          onValueChange={(value) => updateSetting('screen_reader_friendly', value)}
        />
      </View>
      
      <View style={styles.setting}>
        <Text style={styles.settingLabel}>Font Size</Text>
        <View style={styles.fontSizeOptions}>
          {['small', 'medium', 'large'].map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.fontSizeOption,
                settings.font_size === size && styles.selectedFontSize
              ]}
              onPress={() => updateSetting('font_size', size)}
            >
              <Text style={styles.fontSizeText}>{size}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}
```

## Step 5: User Data Export/Import

### 5.1 Data Export Service

```typescript
export class UserDataExportService {
  // Export all user data
  static async exportUserData(userId: string) {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      const { data: brainDumps, error: brainDumpsError } = await supabase
        .from('brain_dumps')
        .select('*')
        .eq('user_id', userId);

      if (brainDumpsError) throw brainDumpsError;

      const { data: moodEntries, error: moodEntriesError } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId);

      if (moodEntriesError) throw moodEntriesError;

      const exportData = {
        user: userData,
        brain_dumps: brainDumps,
        mood_entries: moodEntries,
        export_date: new Date().toISOString(),
        version: '1.0',
      };

      return exportData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  // Import user data
  static async importUserData(userId: string, importData: any) {
    try {
      // Validate import data
      if (!importData.user || !importData.version) {
        throw new Error('Invalid import data format');
      }

      // Import brain dumps
      if (importData.brain_dumps) {
        for (const brainDump of importData.brain_dumps) {
          const { error } = await supabase
            .from('brain_dumps')
            .insert({
              ...brainDump,
              user_id: userId,
              id: undefined, // Let Supabase generate new ID
            });

          if (error) throw error;
        }
      }

      // Import mood entries
      if (importData.mood_entries) {
        for (const moodEntry of importData.mood_entries) {
          const { error } = await supabase
            .from('mood_entries')
            .insert({
              ...moodEntry,
              user_id: userId,
              id: undefined, // Let Supabase generate new ID
            });

          if (error) throw error;
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error importing user data:', error);
      throw error;
    }
  }
}
```

## Step 6: User Analytics

### 6.1 User Analytics Service

```typescript
export class UserAnalyticsService {
  // Track user activity
  static async trackActivity(userId: string, activity: string, metadata?: any) {
    try {
      const { error } = await supabase
        .from('user_activities')
        .insert({
          user_id: userId,
          activity,
          metadata,
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  }

  // Get user analytics
  static async getUserAnalytics(userId: string, timeframe: 'day' | 'week' | 'month' = 'week') {
    try {
      const startDate = new Date();
      switch (timeframe) {
        case 'day':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      const { data, error } = await supabase
        .from('user_activities')
        .select('activity, timestamp')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString());

      if (error) throw error;

      // Process analytics data
      const analytics = {
        total_activities: data.length,
        activity_breakdown: data.reduce((acc, activity) => {
          acc[activity.activity] = (acc[activity.activity] || 0) + 1;
          return acc;
        }, {}),
        most_active_day: this.getMostActiveDay(data),
      };

      return analytics;
    } catch (error) {
      console.error('Error getting user analytics:', error);
      return null;
    }
  }

  private static getMostActiveDay(activities: any[]) {
    const dayCounts = activities.reduce((acc, activity) => {
      const day = new Date(activity.timestamp).toDateString();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(dayCounts).reduce((a, b) => 
      dayCounts[a[0]] > dayCounts[b[0]] ? a : b
    )[0];
  }
}
```

## Step 7: Testing

### 7.1 User Management Testing

```typescript
// Test utilities for user management
export class UserManagementTestUtils {
  static async createTestUser(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    
    // Create user profile
    await UserProfileService.updateUserProfile(data.user!.id, {
      first_name: 'Test',
      last_name: 'User',
      sensory_mode: 'low',
      onboarding_completed: true,
    });
    
    return data;
  }

  static async cleanupTestUser(userId: string) {
    // Delete all user data
    await supabase.from('brain_dumps').delete().eq('user_id', userId);
    await supabase.from('mood_entries').delete().eq('user_id', userId);
    await supabase.from('user_preferences').delete().eq('user_id', userId);
    await supabase.from('user_accessibility').delete().eq('user_id', userId);
    await supabase.from('users').delete().eq('id', userId);
  }
}
```

## Security Best Practices

1. **Always validate user input** before storing
2. **Use RLS policies** to ensure data isolation
3. **Encrypt sensitive data** in the database
4. **Implement proper error handling** without exposing sensitive information
5. **Regularly audit user data** access
6. **Provide data export/import** for user control
7. **Implement data retention policies**
8. **Monitor for suspicious activity**

## Next Steps

1. **Database Views**: See `tableview-supabase.md`
2. **Advanced Auth**: See `supabase-auth.md`
3. **MCP Integration**: See `supabase-mcp.md`

This setup provides comprehensive user management for KindFrame! 🎉 