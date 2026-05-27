import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Text, View } from 'react-native';

type Props = {
  label?: string;
  compact?: boolean;
  fullScreen?: boolean;
};

export default function BymenLoader({
  label = 'Carregando dados...',
  compact = false,
  fullScreen = false,
}: Props) {
  const pulse = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.92,
          duration: 520,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const content = (
    <View
      style={{
        minWidth: compact ? 170 : 220,
        paddingVertical: compact ? 12 : 16,
        paddingHorizontal: compact ? 12 : 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
      }}
    >
      <Animated.View
        style={{
          width: compact ? 38 : 46,
          height: compact ? 38 : 46,
          borderRadius: 999,
          backgroundColor: '#111827',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pulse }],
        }}
      >
        <Text style={{ color: '#C8A961', fontWeight: '800', letterSpacing: 1 }}>B</Text>
      </Animated.View>

      <View style={{ height: compact ? 8 : 10 }} />
      <ActivityIndicator color="#C8A961" />
      <View style={{ height: 8 }} />
      <Text style={{ color: '#111827', fontWeight: '700', fontSize: compact ? 12 : 13 }}>BYMEN</Text>
      <Text style={{ color: '#6B7280', fontSize: compact ? 12 : 13, marginTop: 4 }}>{label}</Text>
    </View>
  );

  if (fullScreen) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {content}
      </View>
    );
  }

  return content;
}
