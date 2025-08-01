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
import { googleKeepService } from '@/services/googleKeepService';

interface NotesSyncPopupProps {
  visible: boolean;
  onClose: () => void;
  onConnect: () => void;
}

export function NotesSyncPopup({ visible, onClose, onConnect }: NotesSyncPopupProps) {
  const { mode, colors } = useThemeColors();
  const { vw, vh, getResponsiveSize } = useViewport();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      console.log('🔗 INITIATING GOOGLE KEEP CONNECTION...');
      
      const success = await googleKeepService.connect();
      
      if (success) {
        console.log('✅ SUCCESS: Google Keep connected successfully');
        Alert.alert(
          'Notes Connected!',
          'Your Google Keep notes are now synced. You can view and manage your notes here.',
          [{ text: 'OK', onPress: onConnect }]
        );
      } else {
        console.log('❌ FAILED: Google Keep connection failed');
        Alert.alert(
          'Connection Failed',
          'Unable to connect to Google Keep. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ ERROR: Google Keep connection error:', error);
      Alert.alert(
        'Connection Error',
        'An error occurred while connecting to Google Keep. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLater = () => {
    console.log('⏰ USER CHOSE LATER: Notes sync postponed');
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
                  Sync Your Notes
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Connect your Google Keep notes for easy access and management
                </Text>
              </View>

              {/* Benefits */}
              <View style={styles.benefits}>
                <View style={styles.benefitItem}>
                  <Text style={[styles.benefitIcon, { color: colors.primary }]}>📝</Text>
                  <Text style={[styles.benefitText, { color: colors.text }]}>
                    Access all your notes in one place
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={[styles.benefitIcon, { color: colors.primary }]}>🔄</Text>
                  <Text style={[styles.benefitText, { color: colors.text }]}>
                    Automatic sync with your Google Keep
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={[styles.benefitIcon, { color: colors.primary }]}>🏷️</Text>
                  <Text style={[styles.benefitText, { color: colors.text }]}>
                    Organize with labels and colors
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={[styles.benefitIcon, { color: colors.primary }]}>📱</Text>
                  <Text style={[styles.benefitText, { color: colors.text }]}>
                    Edit and create notes on any device
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
                We only access your notes to display and manage them. Your data remains secure and private.
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