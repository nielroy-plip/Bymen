import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Button from '../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flex: 1, padding: 24 }}>
        <View style={{ gap: 12 }}>
          <Button title="Barbearias" icon="people-outline" onPress={() => navigation.navigate('Clientes')} />
          <Button title="Estoque Bymen" icon="cube-outline" onPress={() => navigation.navigate('Estoque')} />
          <Button title="Importar Estoque Cliente" icon="cloud-download-outline" onPress={() => navigation.navigate('ImportarEstoque')} />
          <Button title="Histórico Medições" icon="time-outline" onPress={() => navigation.navigate('HistoricoMedicoes')} />
          <Button title="Relatórios" icon="bar-chart-outline" onPress={() => navigation.navigate('Relatorios')} />
        </View>
      </View>
    </SafeAreaView>
  );
}
