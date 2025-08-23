import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

interface BottomSaveBarProps {
  totalItems: number;
  selectedItems: number;
  onSelectAll: () => void;
  onSave: () => void;
  isLoading?: boolean;
}

export default function BottomSaveBar({
  totalItems,
  selectedItems,
  onSelectAll,
  onSave,
  isLoading = false
}: BottomSaveBarProps) {
  const { colors } = useThemeColors();
  
  const isAllSelected = totalItems > 0 && selectedItems === totalItems;
  const hasSelection = selectedItems > 0;
  
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {/* Select All Section */}
      <View style={styles.selectAllSection}>
        <Pressable 
          style={[styles.checkbox, { borderColor: colors.border }]} 
          onPress={onSelectAll}
          hitSlop={8}
        >
          {isAllSelected && (
            <Icon name="check" size={16} color={colors.primary} />
          )}
        </Pressable>
        <Text style={[styles.selectAllText, { color: colors.text }]}>
          Select All ({selectedItems}/{totalItems})
        </Text>
      </View>
      
      {/* Save Button */}
      <Pressable
        style={[
          styles.saveButton, 
          { 
            backgroundColor: hasSelection ? colors.primary : colors.border,
            opacity: hasSelection ? 1 : 0.5
          }
        ]}
        onPress={onSave}
        disabled={!hasSelection || isLoading}
        hitSlop={8}
      >
        {isLoading ? (
          <Text style={[styles.saveButtonText, { color: colors.buttonText }]}>
            Saving...
          </Text>
        ) : (
          <Text style={[styles.saveButtonText, { color: colors.buttonText }]}>
            Save {selectedItems} Item{selectedItems !== 1 ? 's' : ''}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  selectAllSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
