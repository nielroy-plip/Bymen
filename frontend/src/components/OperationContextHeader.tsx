import React from 'react';
import { Text, View } from 'react-native';

type Props = {
  title: string;
  subtitle?: string;
  statusLabel?: string;
};

export default function OperationContextHeader({ title, subtitle, statusLabel }: Props) {
  return (
    <View
      style={{
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{title}</Text>
      {subtitle ? <Text style={{ marginTop: 2, color: '#6B7280' }}>{subtitle}</Text> : null}
      {statusLabel ? (
        <View style={{ marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <Text style={{ color: '#1E40AF', fontWeight: '600', fontSize: 12 }}>{statusLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}
