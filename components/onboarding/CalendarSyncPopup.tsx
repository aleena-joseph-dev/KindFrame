import React, { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PopupBg } from '@/components/ui/PopupBg';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { SkipButton } from '@/components/ui/SkipButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';
import { googleCalendarService } from '@/services/googleCalendarService';

interface CalendarSyncPopupProps {
  visible: boolean;
  onClose: () => void;
  onConnect: () => void;
}

export function CalendarSyncPopup({ visible, onClose, onConnect }: CalendarSyncPopupProps) {
  const { mode, colors } = useThemeColors();
  const { vw, vh, getResponsiveSize } = useViewport();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      console.log('🔗 INITIATING GOOGLE CALENDAR CONNECTION...');
      
      const success = await googleCalendarService.connect();
      
      if (success) {
        console.log('✅ SUCCESS: Google Calendar connected successfully');
        Alert.alert(
          'Calendar Connected!',
          'Your Google Calendar is now synced. You can view your events in the calendar.',
          [{ text: 'OK', onPress: onConnect }]
        );
      } else {
        console.log('❌ FAILED: Google Calendar connection failed');
        Alert.alert(
          'Connection Failed',
          'Unable to connect to Google Calendar. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ ERROR: Google Calendar connection error:', error);
      Alert.alert(
        'Connection Error',
        'An error occurred while connecting to Google Calendar. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLater = () => {
    console.log('⏰ USER CHOSE LATER: Calendar sync postponed');
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <PopupBg>
          <SafeAreaView style={styles.container}>
            <View style={[styles.content, { backgroundColor: colors.background }]}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Sync Your Calendar
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Connect your Google Calendar to see your events here
                </Text>
              </View>

              {/* Benefits */}
              <View style={styles.benefits}>
                <View style={styles.benefitItem}>
                  <Text style={[styles.benefitIcon, { color: colors.primary }]}>📅</Text>
                  <Text style={[styles.benefitText, { color: colors.text }]}>
                    View all your events in one place
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={[styles.benefitIcon, { color: colors.primary }]}>🔄</Text>
                  <Text style={[styles.benefitText, { color: colors.text }]}>
                    Automatic sync with your Google Calendar
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={[styles.benefitIcon, { color: colors.primary }]}>⚡</Text>
                  <Text style={[styles.benefitText, { color: colors.text }]}>
                    Quick access to your schedule
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <SubmitButton
                  title={isConnecting ? "Connecting..." : "Connect"}
                  onPress={handleConnect}
                  disabled={isConnecting}
                  style={styles.connectButton}
                />
                <SkipButton
                  title="Later"
                  onPress={handleLater}
                  style={styles.laterButton}
                />
              </View>

              {/* Privacy Note */}
              <Text style={[styles.privacyNote, { color: colors.textSecondary }]}>
                We only access your calendar data to display events. Your data remains secure and private.
              </Text>
            </View>
          </SafeAreaView>
        </PopupBg>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  benefits: {
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  benefitIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  benefitText: {
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  actions: {
    marginBottom: 16,
  },
  connectButton: {
    marginBottom: 12,
  },
  laterButton: {
    marginBottom: 0,
  },
  privacyNote: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
}); 