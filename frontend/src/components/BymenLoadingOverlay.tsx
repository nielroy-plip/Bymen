import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import BymenLoader from './BymenLoader';

type Props = {
  visible: boolean;
  label?: string;
};

export default function BymenLoadingOverlay({ visible, label = 'Processando...' }: Props) {
  if (!visible) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => undefined}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(17, 24, 39, 0.35)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
        onPress={() => undefined}
      >
        <View style={{ width: '100%', alignItems: 'center' }}>
          <BymenLoader compact label={label} />
        </View>
      </Pressable>
    </Modal>
  );
}
