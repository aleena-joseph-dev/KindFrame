import { PaginationButton } from '@/components/ui/OptionsButton';
import { PopupBg } from '@/components/ui/PopupBg';
import { useViewport } from '@/hooks/useViewport';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface NicknamePopupProps {
  visible: boolean;
  onClose: () => void;
  onNext: (nickname: string) => void;
  onSkip?: () => void;
  defaultNickname?: string;
}

export const NicknamePopup: React.FC<NicknamePopupProps> = ({ 
  visible, 
  onClose, 
  onNext,
  onSkip,
  defaultNickname = 'Alex'
}) => {
  const [nickname, setNickname] = useState(defaultNickname);
  const { getResponsiveSize } = useViewport();

  const handleNext = () => {
    if (nickname.trim()) {
      onNext(nickname.trim());
    }
  };

  return (
    <PopupBg
      visible={visible}
      onRequestClose={onClose}
      size="medium"
      color="#fff"
      showSkip={true}
      closeOnOutsideTap={true}
      onSkip={onSkip}
    >
      {/* Main Content Container - Child of PopupBg */}
      <View style={[styles.content, { width: '100%' }]}> 
        {/* Title Section - Child of Content */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { fontSize: getResponsiveSize(20, 24, 28) }]}>Welcome to KindFrame</Text>
          <Text style={[styles.subtitle, { fontSize: getResponsiveSize(14, 16, 18) }]}>Let's personalize your experience. What would you like to be called?</Text>
        </View>
        {/* Input Section - Child of Content */}
        <View style={styles.inputSection}>
          <TextInput
            style={[styles.nicknameInput, {
              width: '100%',
              height: getResponsiveSize(45, 50, 55),
              fontSize: getResponsiveSize(14, 16, 18)
            }]}
            value={nickname}
            onChangeText={setNickname}
            placeholder="Enter your nickname"
            placeholderTextColor="#9ca3af"
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>
        {/* Button Section - Child of Content */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[styles.nextButton, {
              width: '100%',
              paddingVertical: getResponsiveSize(10, 12, 14)
            }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={[styles.nextButtonText, { fontSize: getResponsiveSize(14, 16, 18) }]}>Continue</Text>
          </TouchableOpacity>
        </View>
        {/* Pagination Section - Child of Content */}
        <View style={styles.paginationSection}>
          <PaginationButton 
            onPress={() => {/* TODO: handle pagination */}} 
            size="big" 
            style={{ alignSelf: 'center' }} 
          />
        </View>
      </View>
    </PopupBg>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 0,
    alignItems: 'center',
    width: '100%',
  },
  titleSection: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1f2937',
    width: '100%',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#6b7280',
    lineHeight: 22,
    width: '100%',
  },
  inputSection: {
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  nicknameInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    color: '#1f2937',
  },
  buttonSection: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    marginTop: 0,
    marginBottom: 0,
  },
  nextButton: {
    backgroundColor: '#8b9a8b',
    borderRadius: 8,
    marginTop: 0,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  paginationSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 2,
  },
}); 