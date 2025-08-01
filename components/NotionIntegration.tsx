import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SensoryColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthService } from '@/services/authService';
import { NotionService, NotionPage, NotionDatabase } from '@/services/notionService';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { TopBar } from '@/components/ui/TopBar';

export default function NotionIntegration() {
  const colorScheme = useColorScheme();
  const colors = SensoryColors['calm'];
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkNotionAuth();
  }, []);

  const checkNotionAuth = async () => {
    try {
      setIsLoading(true);
      const authenticated = await NotionService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        await loadNotionData();
      }
    } catch (error) {
      console.error('Error checking Notion auth:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotionData = async () => {
    try {
      // Get user info
      const user = await NotionService.getCurrentUser();
      setUserInfo(user);

      // Get recent pages and databases
      const { pages: recentPages, databases: recentDatabases } = await NotionService.search();
      setPages(recentPages.slice(0, 5)); // Show only 5 most recent
      setDatabases(recentDatabases.slice(0, 3)); // Show only 3 most recent
    } catch (error) {
      console.error('Error loading Notion data:', error);
      Alert.alert('Error', 'Failed to load Notion data. Please try again.');
    }
  };

  const handleConnectNotion = async () => {
    setIsConnecting(true);
    try {
      const result = await AuthService.signInWithNotionCustom();
      
      if (result.success) {
        Alert.alert(
          'Notion Connection',
          'Redirecting to Notion... Please complete the authorization process.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Connection Failed',
          result.error?.message || 'Failed to connect to Notion. Please try again.'
        );
      }
    } catch (error) {
      console.error('Notion connection error:', error);
      Alert.alert(
        'Connection Error',
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectNotion = async () => {
    Alert.alert(
      'Disconnect Notion',
      'Are you sure you want to disconnect your Notion account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await NotionService.signOut();
              setIsAuthenticated(false);
              setUserInfo(null);
              setPages([]);
              setDatabases([]);
              Alert.alert('Success', 'Notion account disconnected successfully.');
            } catch (error) {
              console.error('Error disconnecting Notion:', error);
              Alert.alert('Error', 'Failed to disconnect Notion account.');
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    if (isAuthenticated) {
      await loadNotionData();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <TopBar title="Notion Integration" />
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="Notion Integration" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!isAuthenticated ? (
          <View style={styles.connectContainer}>
            <ThemedText style={styles.title}>Connect to Notion</ThemedText>
            <ThemedText style={styles.subtitle}>
              Connect your Notion account to sync your notes, tasks, and ideas with KindFrame.
            </ThemedText>
            
            <Button
              title={isConnecting ? "Connecting..." : "Connect Notion Account"}
              onPress={handleConnectNotion}
              disabled={isConnecting}
              style={styles.connectButton}
            />
          </View>
        ) : (
          <View style={styles.connectedContainer}>
            <View style={styles.header}>
              <ThemedText style={styles.title}>Connected to Notion</ThemedText>
              <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                <ThemedText style={styles.refreshText}>Refresh</ThemedText>
              </TouchableOpacity>
            </View>

            {userInfo && (
              <View style={styles.userInfo}>
                <ThemedText style={styles.userName}>{userInfo.name}</ThemedText>
                <ThemedText style={styles.userEmail}>{userInfo.email}</ThemedText>
              </View>
            )}

            {pages.length > 0 && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Recent Pages</ThemedText>
                {pages.map((page) => (
                  <View key={page.id} style={styles.item}>
                    <ThemedText style={styles.itemTitle}>{page.title}</ThemedText>
                    <ThemedText style={styles.itemDate}>
                      {new Date(page.last_edited_time).toLocaleDateString()}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}

            {databases.length > 0 && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Recent Databases</ThemedText>
                {databases.map((database) => (
                  <View key={database.id} style={styles.item}>
                    <ThemedText style={styles.itemTitle}>{database.title}</ThemedText>
                    <ThemedText style={styles.itemDate}>
                      {new Date(database.last_edited_time).toLocaleDateString()}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}

            <Button
              title="Disconnect Notion"
              onPress={handleDisconnectNotion}
              style={styles.disconnectButton}
              textStyle={styles.disconnectButtonText}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  connectContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    opacity: 0.8,
  },
  connectButton: {
    marginTop: 20,
  },
  connectedContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    padding: 8,
  },
  refreshText: {
    fontSize: 14,
    color: '#007AFF',
  },
  userInfo: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.7,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  item: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  itemDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
    marginTop: 20,
  },
  disconnectButtonText: {
    color: '#FFFFFF',
  },
}); 