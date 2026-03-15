import React from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

type Props = {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  style?: any;
} & TextInputProps;

export default function Input({ label, value, onChangeText, style, ...rest }: Props) {
  const { isTablet, inputHeight, fontSize } = useResponsive();
  const bigInputHeight = isTablet ? 72 : 60;
  const bigFontSize = isTablet ? 22 : 20;
  
  return (
    <View style={{ marginBottom: isTablet ? 16 : 12 }}>
      {label ? <Text style={{ marginBottom: isTablet ? 10 : 6, color: '#111827', fontSize: fontSize.base, fontWeight: '500' }}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        {...rest}
        style={{
          borderWidth: 1,
          borderColor: '#E5E7EB',
          borderRadius: isTablet ? 12 : 8,
          paddingHorizontal: isTablet ? 20 : 16,
          paddingVertical: isTablet ? 20 : 16,
          fontSize: bigFontSize,
          color: '#111827',
          minHeight: bigInputHeight,
          ...(typeof style === 'object' ? style : {})
        }}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}
