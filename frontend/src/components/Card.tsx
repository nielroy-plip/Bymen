import React, { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
};

export default function Card({ children, style }: Props) {
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
        ...(style || {}),
      }}
    >
      {children}
    </View>
  );
}
