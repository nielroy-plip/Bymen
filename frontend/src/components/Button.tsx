import React from 'react';
import { Pressable, Text, ViewStyle, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '../hooks/useResponsive';

type Props = {
  title: string;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconSize?: number;
  contentDirection?: 'row' | 'column';
};

export default function Button({
  title,
  onPress,
  style,
  disabled,
  variant = 'primary',
  icon,
  iconColor = '#fff',
  iconSize = 22,
  contentDirection = 'row',
}: Props) {
  const { isTablet, buttonHeight, fontSize } = useResponsive();
  
  const base = {
    paddingVertical: isTablet ? 16 : 14,
    paddingHorizontal: isTablet ? 24 : 16,
    borderRadius: isTablet ? 12 : 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: buttonHeight
  } as ViewStyle;
  const colors =
    variant === 'primary'
      ? { backgroundColor: '#111827' }
      : variant === 'secondary'
      ? { backgroundColor: '#C8A961' }
      : { backgroundColor: '#EF4444' };
  const combined = { ...base, ...colors, opacity: disabled ? 0.6 : 1, ...(style || {}) };
  return (
    <Pressable onPress={onPress} disabled={disabled} style={combined}>
      <View style={{ flexDirection: contentDirection, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        {icon && (
          <Ionicons
            name={icon}
            size={iconSize}
            color={iconColor}
            style={contentDirection === 'column' ? { marginBottom: 6 } : { marginRight: 8 }}
          />
        )}
        <Text
          numberOfLines={contentDirection === 'column' ? 2 : 1}
          style={{
            color: '#FFFFFF',
            fontSize: contentDirection === 'column' ? fontSize.small : fontSize.base,
            fontWeight: '600',
            textAlign: 'center',
            flexShrink: 1,
          }}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}
