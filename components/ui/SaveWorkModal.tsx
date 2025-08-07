import { SensoryColors } from '@/constants/Colors';
import { useSensoryMode } from '@/contexts/SensoryModeContext';
import React from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path, Polyline, Rect } from 'react-native-svg';

interface SaveWorkModalProps {
  visible: boolean;
  onClose: () => void;
  onGoogleSignIn: () => void;
  onEmailSignIn: () => void;
  onSkip: () => void;
  onSignInLink: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

// SVG Icon Components
const CloudIcon = ({ size = 24, color = '#6B7280' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </Svg>
);

const ShieldIcon = ({ size = 24, color = '#6B7280' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </Svg>
);

const TrendingUpIcon = ({ size = 24, color = '#6B7280' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <Polyline points="16 7 22 7 22 13" />
  </Svg>
);

const SmartphoneIcon = ({ size = 24, color = '#6B7280' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <Path d="M12 18h.01" />
  </Svg>
);

const MailIcon = ({ size = 24, color = '#333' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect width="20" height="16" x="2" y="4" rx="2" />
    <Path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </Svg>
);

const XIcon = ({ size = 24, color = '#6B7280' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 6 6 18" />
    <Path d="m6 6 12 12" />
  </Svg>
);

export function SaveWorkModal({
  visible,
  onClose,
  onGoogleSignIn,
  onEmailSignIn,
  onSkip,
  onSignInLink
}: SaveWorkModalProps) {
  const { mode } = useSensoryMode();
  const colors = SensoryColors[mode];

  const benefits = [
    {
      icon: <CloudIcon size={20} color={colors.textSecondary} />,
      title: 'Access anywhere',
      subtitle: 'Your work synced across all devices'
    },
    {
      icon: <ShieldIcon size={20} color={colors.textSecondary} />,
      title: 'Automatic backup',
      subtitle: 'Never lose your progress again'
    },
    {
      icon: <TrendingUpIcon size={20} color={colors.textSecondary} />,
      title: 'Track progress',
      subtitle: 'Monitor your productivity over time'
    },
    {
      icon: <SmartphoneIcon size={20} color={colors.textSecondary} />,
      title: 'Multi-device sync',
      subtitle: 'Seamless experience everywhere'
    }
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <XIcon size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <CloudIcon size={32} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Don't lose your work</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Sign in or create a free account to save your progress securely
            </Text>
          </View>

          {/* Separator */}
          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          {/* Benefits Section */}
          <View style={styles.benefitsContainer}>
            {benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <View style={styles.benefitIconContainer}>
                  {benefit.icon}
                </View>
                <View style={styles.benefitTextContainer}>
                  <Text style={[styles.benefitTitle, { color: colors.text }]}>
                    {benefit.title}
                  </Text>
                  <Text style={[styles.benefitSubtitle, { color: colors.textSecondary }]}>
                    {benefit.subtitle}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* CTA Section */}
          <View style={styles.ctaSection}>
            <Text style={[styles.ctaTitle, { color: colors.text }]}>
              Choose how to continue:
            </Text>

            {/* Google Button */}
            <TouchableOpacity
              style={[styles.googleButton, { backgroundColor: colors.primary }]}
              onPress={onGoogleSignIn}
              activeOpacity={0.8}
            >
              <Text style={[styles.googleIcon, { color: colors.surface }]}>G</Text>
              <Text style={[styles.googleButtonText, { color: colors.surface }]}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            {/* Email Button */}
            <TouchableOpacity
              style={[styles.emailButton, { borderColor: colors.border }]}
              onPress={onEmailSignIn}
              activeOpacity={0.8}
            >
              <MailIcon size={20} color={colors.text} />
              <Text style={[styles.emailButtonText, { color: colors.text }]}>
                Continue with Email
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer Links */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onSignInLink} activeOpacity={0.7}>
              <Text style={[styles.signInLink, { color: colors.primary }]}>
                Already have an account? Sign in
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onSkip} activeOpacity={0.7}>
              <Text style={[styles.skipButton, { color: colors.textSecondary }]}>
                Continue without saving
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: isTablet ? 480 : '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  separator: {
    height: 1,
    marginBottom: 24,
  },
  benefitsContainer: {
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  benefitIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    lineHeight: 22,
  },
  benefitSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4a5565',
  },
  ctaSection: {
    marginBottom: 24,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  googleButton: {
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emailButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
  },
  signInLink: {
    fontSize: 14,
    textDecorationLine: 'underline',
    marginBottom: 12,
    textAlign: 'center',
  },
  skipButton: {
    fontSize: 14,
    textAlign: 'center',
  },
}); 