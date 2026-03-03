import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../routes';
import Button from '../components/Button';
import { listMeasurements, listProducts, listSyncPending, Measurement, SyncPendingItem } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [syncPending, setSyncPending] = useState<SyncPendingItem[]>([]);
  const [criticalStockCount, setCriticalStockCount] = useState(0);
  const [criticalStockItems, setCriticalStockItems] = useState<Array<{ id: string; nome: string; linha: string; estoque: number }>>([]);

  const loadData = useCallback(async () => {
      const [ms, pendings, products] = await Promise.all([
        listMeasurements(),
        listSyncPending(),
        listProducts(),
      ]);
      setMeasurements(ms);
      setSyncPending(pendings);
      const critical = products
        .filter((p: any) => (p.estoque ?? 0) <= 10)
        .map((p: any) => ({ id: p.id, nome: p.nome, linha: p.linha ?? '-', estoque: p.estoque ?? 0 }))
        .sort((a: any, b: any) => a.estoque - b.estoque);
      setCriticalStockCount(critical.length);
      setCriticalStockItems(critical);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      const timer = setInterval(() => {
        loadData();
      }, 5000);

      return () => clearInterval(timer);
    }, [loadData])
  );

  const kpis = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    const thisYear = now.getFullYear();

    const monthMeasurements = measurements.filter((m) => {
      const [datePart] = String(m.dateTime || '').split(' ');
      const [day, month, year] = (datePart || '').split('/');
      if (!month || !year) return false;
      return Number(month) === thisMonth && Number(year) === thisYear;
    });

    const totalValue = monthMeasurements.reduce((acc, item) => acc + (item.totalGeral || 0), 0);
    const totalMedicao = monthMeasurements.reduce((acc, item) => acc + (item.valorMedicao || 0), 0);
    const totalBancada = monthMeasurements.reduce((acc, item) => acc + (item.valorBancada || 0), 0);

    return {
      monthCount: monthMeasurements.length,
      monthTotal: totalValue,
      monthTotalMedicao: totalMedicao,
      monthTotalBancada: totalBancada,
      pendingSync: syncPending.length,
      criticalStock: criticalStockCount,
    };
  }, [measurements, syncPending, criticalStockCount]);

  const items = [
    {
      title: 'Barbearias',
      icon: 'people-outline' as const,
      onPress: () => navigation.navigate('Clientes'),
    },
    {
      title: 'Estoque',
      icon: 'cube-outline' as const,
      onPress: () => navigation.navigate('Estoque'),
    },
    {
      title: 'Importar Estoque Cliente',
      icon: 'cloud-download-outline' as const,
      onPress: () => navigation.navigate('ImportarEstoque'),
    },
    {
      title: 'Histórico',
      icon: 'time-outline' as const,
      onPress: () => navigation.navigate('HistoricoMedicoes'),
    },
    {
      title: 'Pendências Sync',
      icon: 'sync-outline' as const,
      onPress: () => navigation.navigate('PendenciasSync'),
    },
    {
      title: 'Relatórios',
      icon: 'bar-chart-outline' as const,
      onPress: () => navigation.navigate('Relatorios'),
    },
    {
      title: 'Usuário',
      icon: 'settings-outline' as const,
      onPress: () => navigation.navigate('ConfiguracoesUsuario'),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 32 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Dashboard</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ width: '48%', backgroundColor: '#EFF6FF', borderColor: '#DBEAFE', borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 }}>
            <Text style={{ color: '#1E40AF', fontSize: 12, fontWeight: '600' }}>Medições no mês</Text>
            <Text style={{ color: '#111827', fontSize: 20, fontWeight: '700', marginTop: 4 }}>{kpis.monthCount}</Text>
          </View>
          <View style={{ width: '48%', backgroundColor: '#F0FDF4', borderColor: '#DCFCE7', borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 }}>
            <Text style={{ color: '#166534', fontSize: 12, fontWeight: '600' }}>Valor do mês</Text>
            <Text style={{ color: '#111827', fontSize: 14, fontWeight: '700', marginTop: 4 }}>
              Total: R${kpis.monthTotal.toFixed(2).replace('.', ',')}
            </Text>
            <Text style={{ color: '#1E40AF', fontSize: 12, fontWeight: '600', marginTop: 2 }}>
              Medição: R${kpis.monthTotalMedicao.toFixed(2).replace('.', ',')}
            </Text>
            <Text style={{ color: '#991B1B', fontSize: 12, fontWeight: '600', marginTop: 2 }}>
              Bancada: R${kpis.monthTotalBancada.toFixed(2).replace('.', ',')}
            </Text>
          </View>
          <View style={{ width: '48%', backgroundColor: '#FEF2F2', borderColor: '#FEE2E2', borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 }}>
            <Text style={{ color: '#991B1B', fontSize: 12, fontWeight: '600' }}>Pendências sync</Text>
            <Text style={{ color: '#111827', fontSize: 20, fontWeight: '700', marginTop: 4 }}>{kpis.pendingSync}</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Estoque')}
            style={{ width: '48%', backgroundColor: '#FFFBEB', borderColor: '#FEF3C7', borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 }}
          >
            <Text style={{ color: '#92400E', fontSize: 12, fontWeight: '600' }}>Estoque crítico</Text>
            <Text style={{ color: '#111827', fontSize: 20, fontWeight: '700', marginTop: 4 }}>{kpis.criticalStock}</Text>
            {criticalStockItems.slice(0, 3).map((item) => (
              <Text key={item.id} style={{ color: '#92400E', fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                • {item.nome} {item.linha !== '-' ? `(${item.linha})` : ''} ({item.estoque})
              </Text>
            ))}
            {criticalStockItems.length > 3 && (
              <Text style={{ color: '#92400E', fontSize: 11, marginTop: 2 }}>
                +{criticalStockItems.length - 3} produtos
              </Text>
            )}
            <Text style={{ color: '#92400E', fontSize: 11, marginTop: 6, fontWeight: '700' }}>
              Toque para abrir estoque
            </Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {items.map((item) => (
            <View
              key={item.title}
              style={{
                width: '48%',
                marginBottom: 14,
              }}
            >
              <Button
                title={item.title}
                icon={item.icon}
                iconSize={item.title === 'Importar Estoque Cliente' ? 18 : 20}
                contentDirection="column"
                onPress={item.onPress}
                style={{
                  minHeight: 110,
                  borderRadius: 14,
                  width: '100%',
                  paddingHorizontal: 10,
                }}
              />
            </View>
          ))}
          {items.length % 2 !== 0 && <View style={{ width: '48%' }} />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
