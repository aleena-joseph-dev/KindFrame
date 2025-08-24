import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { PopupBg } from './PopupBg';
import { useThemeColors } from '@/hooks/useThemeColors';

interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  sections: {
    title: string;
    content: string;
  }[];
  tips?: string[];
  description?: string;
}

export default function InfoModal({
  visible,
  onClose,
  title,
  sections,
  tips,
  description,
}: InfoModalProps) {
  const { colors } = useThemeColors();

  return (
    <PopupBg
      visible={visible}
      onRequestClose={onClose}
      size="medium"
      color={colors.surface}
      showSkip={false}
      closeOnOutsideTap={true}
    >
      <View style={[styles.popupContent, { width: '100%' }]}>
        <View style={styles.popupTitleSection}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {title}
          </Text>
        </View>

        <View style={[styles.infoContent, { marginBottom: 20 }]}>
          {sections.map((section, index) => (
            <View key={index} style={index > 0 ? { marginTop: 16 } : {}}>
              <Text style={[styles.infoSectionTitle, { color: colors.text }]}>
                {section.title}
              </Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {section.content}
              </Text>
            </View>
          ))}

          {tips && tips.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.infoSectionTitle, { color: colors.text }]}>
                Tips
              </Text>
              {tips.map((tip, index) => (
                <Text key={index} style={[styles.infoTip, { color: colors.textSecondary }]}>
                  • {tip}
                </Text>
              ))}
            </View>
          )}
          
          {description && (
            <Text style={[styles.infoDescription, { color: colors.textSecondary, marginTop: 16 }]}>
              {description}
            </Text>
          )}
        </View>

        <View style={styles.cancelButtonSection}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
              Got it
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </PopupBg>
  );
}

const styles = StyleSheet.create({
  popupContent: {
    alignItems: 'center',
    padding: 12,
  },
  popupTitleSection: {
    width: '100%',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    marginBottom: 20,
    width: '100%',
  },
  infoContent: {
    width: '100%',
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  infoTip: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 2,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  cancelButtonSection: {
    width: '100%',
    marginTop: 4,
  },
  cancelButton: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
    width: '90%',
    alignSelf: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
});
