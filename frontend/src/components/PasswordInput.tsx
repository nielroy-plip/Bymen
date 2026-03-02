import React, { useState } from 'react';
import { Text, TextInput, View, TouchableOpacity } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: any;
  inputContainerStyle?: any;
};

export default function PasswordInput({
  label = 'Senha',
  value,
  onChangeText,
  placeholder = 'senha',
  style,
  inputContainerStyle,
}: Props) {
  const { isTablet, fontSize } = useResponsive();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={{ marginBottom: isTablet ? 16 : 12, ...(typeof style === 'object' ? style : {}) }}>
      <Text
        style={{
          marginBottom: isTablet ? 10 : 6,
          color: '#111827',
          fontSize: fontSize.base,
          fontWeight: '500',
        }}
      >
        {label}
      </Text>
      <View
        style={{
          borderWidth: 1,
          borderColor: '#E5E7EB',
          borderRadius: isTablet ? 12 : 8,
          paddingHorizontal: isTablet ? 20 : 16,
          minHeight: isTablet ? 72 : 60,
          flexDirection: 'row',
          alignItems: 'center',
          ...(typeof inputContainerStyle === 'object' ? inputContainerStyle : {}),
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!isVisible}
          style={{
            flex: 1,
            fontSize: isTablet ? 22 : 20,
            color: '#111827',
          }}
        />
        <TouchableOpacity onPress={() => setIsVisible((current) => !current)}>
          <Ionicons
            name={isVisible ? 'eye-outline' : 'eye-off-outline'}
            size={22}
            color="#2563EB"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
