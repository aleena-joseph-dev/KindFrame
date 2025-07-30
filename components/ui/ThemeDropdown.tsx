import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface ThemeDropdownProps {
  currentTheme: 'calm' | 'highEnergy' | 'normal' | 'relax';
  onThemeChange: (theme: 'calm' | 'highEnergy' | 'normal' | 'relax') => void;
  colors: any;
}

export const ThemeDropdown: React.FC<ThemeDropdownProps> = ({ 
  currentTheme, 
  onThemeChange, 
  colors 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { key: 'calm', label: 'Calm & Low Sensory' },
    { key: 'highEnergy', label: 'High Energy' },
    { key: 'normal', label: 'Normal' },
    { key: 'relax', label: 'Relax & Restore' },
  ] as const;

  const currentThemeData = themes.find(t => t.key === currentTheme);

  const ChevronDownIcon = () => (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path 
        d="m6 9 6 6 6-6" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </Svg>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[
          styles.button, 
          { 
            backgroundColor: colors.buttonBackground,
            borderColor: colors.buttonBackground,
          }
        ]}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.8}
      >
        <View style={[styles.indicator, { backgroundColor: colors.buttonBackground }]} />
        <Text style={[styles.buttonText, { color: colors.buttonText }]}>
          {currentThemeData?.label}
        </Text>
        <View style={[
          styles.chevron, 
          { transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }
        ]}>
          <ChevronDownIcon />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={[styles.dropdown, { backgroundColor: colors.cardBackground }]}>
            {themes.map((theme) => (
              <TouchableOpacity
                key={theme.key}
                style={[
                  styles.option,
                  theme.key === currentTheme && { backgroundColor: colors.buttonBackground + '13' }
                ]}
                onPress={() => {
                  onThemeChange(theme.key);
                  setIsOpen(false);
                }}
              >
                <View style={[
                  styles.optionIndicator, 
                  { 
                    backgroundColor: theme.key === currentTheme ? colors.buttonBackground : 'rgba(0, 0, 0, 0)',
                    borderColor: colors.buttonBackground
                  }
                ]} />
                <Text style={[
                  styles.optionText, 
                  { 
                    color: theme.key === currentTheme ? colors.buttonBackground : colors.text 
                  }
                ]}>
                  {theme.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  chevron: {
    marginLeft: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 50,
    paddingRight: 60,
  },
  dropdown: {
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 160,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  optionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
}); 