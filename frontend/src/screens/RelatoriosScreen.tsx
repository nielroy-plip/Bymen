import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Dimensions, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { listClients, listMeasurements, listProducts, Measurement } from '../services/api';
import { Client } from '../data/clients';

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const screenWidth = Dimensions.get('window').width;
const isSmallScreen = screenWidth < 400;

function getMonthKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function parseMeasurementDate(dateTime: string): Date | null {
  const [datePart] = String(dateTime || '').split(' ');
  const [d, m, y] = datePart.split('/');
  if (!d || !m || !y) return null;
  const day = Number(d);
  const month = Number(m) - 1;
  const year = Number(y);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
  return new Date(year, month, day);
}

export default function RelatoriosScreen() {
  const [barbearias, setBarbearias] = useState<Client[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [barbeariaId, setBarbeariaId] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [periodo, setPeriodo] = useState<'12m' | '6m' | '3m'>('12m');
  const [produtoFiltro, setProdutoFiltro] = useState<string>('Todos');
  const [detalheModal, setDetalheModal] = useState<{visible: boolean, label?: string, valor?: number}>({visible: false});
  // Feedback visual para modal
  const [modalOpening, setModalOpening] = useState(false);
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [clientsData, measurementsData, productsData] = await Promise.all([
        listClients(),
        listMeasurements(),
        listProducts(),
      ]);

      setBarbearias(clientsData);
      setMeasurements(measurementsData);
      setProducts(productsData);

      if (!barbeariaId && clientsData.length > 0) {
        setBarbeariaId(clientsData[0].id);
      }
      setLoading(false);
    }

    loadData();
  }, []);

  const periodos = [
    { label: 'Últimos 12 meses', value: '12m' },
    { label: 'Últimos 6 meses', value: '6m' },
    { label: 'Últimos 3 meses', value: '3m' },
  ];

  const produtosFiltro = useMemo(() => {
    const names = Array.from(new Set(products.map((p) => p.nome)));
    return ['Todos', ...names];
  }, [products]);

  const monthWindow = useMemo(() => {
    const count = periodo === '12m' ? 12 : periodo === '6m' ? 6 : 3;
    const now = new Date();
    const months: { key: string; label: string }[] = [];

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: getMonthKey(d), label: monthNames[d.getMonth()] });
    }

    return months;
  }, [periodo]);

  const salesData = useMemo(() => {
    const source = measurements.filter((m) => (barbeariaId ? m.clientId === barbeariaId : true));
    const mapByMonth: Record<string, number> = {};

    source.forEach((m) => {
      const parsed = parseMeasurementDate(m.dateTime);
      if (!parsed) return;
      const key = getMonthKey(parsed);
      mapByMonth[key] = (mapByMonth[key] || 0) + Number(m.totalGeral || 0);
    });

    const labels = monthWindow.map((m) => m.label);
    const data = monthWindow.map((m) => Number((mapByMonth[m.key] || 0).toFixed(2)));

    return {
      labels,
      data,
    };
  }, [measurements, barbeariaId, monthWindow]);

  const filteredMeasurementsInPeriod = useMemo(() => {
    const validMonthKeys = new Set(monthWindow.map((m) => m.key));
    return measurements.filter((m) => {
      if (barbeariaId && m.clientId !== barbeariaId) return false;
      const parsed = parseMeasurementDate(m.dateTime);
      if (!parsed) return false;
      return validMonthKeys.has(getMonthKey(parsed));
    });
  }, [measurements, barbeariaId, monthWindow]);

  const vendasPorMesFiltrado = {
    labels: salesData.labels,
    datasets: [
      {
        data: salesData.data,
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 3
      }
    ],
  };

  const stockData = useMemo(() => {
    const grouped = new Map<string, number>();
    filteredMeasurementsInPeriod.forEach((m) => {
      (m.medicaoRows || []).forEach((row: any) => {
        grouped.set(row.nome, (grouped.get(row.nome) || 0) + Number(row.vendidos || 0));
      });
      (m.bancadaRows || []).forEach((row: any) => {
        grouped.set(row.nome, (grouped.get(row.nome) || 0) + Number(row.quantidadeComprada || 0));
      });
    });

    let entries = Array.from(grouped.entries());
    if (produtoFiltro !== 'Todos') {
      entries = entries.filter(([name]) => name === produtoFiltro);
    } else {
      entries = entries.sort((a, b) => b[1] - a[1]).slice(0, 6);
    }

    if (entries.length === 0) {
      entries = [['Sem dados', 0]];
    }

    return {
      labels: entries.map(([name]) => name),
      data: entries.map(([_, value]) => value),
    };
  }, [filteredMeasurementsInPeriod, produtoFiltro]);

  const estoqueProdutos = {
    labels: stockData.labels,
    datasets: [
      { data: stockData.data },
    ],
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#3B82F6" />
        <Text style={{ marginTop: 8, color: '#6B7280' }}>Carregando relatórios...</Text>
      </View>
    );
  }

  if (!barbearias.length) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: '#6B7280', textAlign: 'center' }}>
          Não há barbearias cadastradas para exibir relatórios.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{ paddingHorizontal: isSmallScreen ? 8 : 24, paddingTop: 18, paddingBottom: 24 }}
    >
      <Text
        style={{
          fontSize: isSmallScreen ? 20 : 28,
          fontWeight: '800',
          color: '#111827',
          marginBottom: isSmallScreen ? 16 : 24,
          textAlign: 'center',
          letterSpacing: 0.5,
        }}
      >
        Relatórios e Gráficos
      </Text>

      {/* Filtro de Barbearia */}
      <View style={{ marginBottom: isSmallScreen ? 18 : 32 }}>
        <Text style={{ fontSize: isSmallScreen ? 14 : 17, color: '#374151', marginBottom: 8, fontWeight: '600' }}>Selecione a barbearia:</Text>
        <TouchableOpacity
          style={{
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 10,
            backgroundColor: modalOpening ? '#E0E7FF' : '#F9FAFB',
            padding: isSmallScreen ? 10 : 14,
          }}
          onPress={() => {
            setModalOpening(true);
            setTimeout(() => {
              setModalVisible(true);
              setModalOpening(false);
            }, 120);
          }}>
          <Text style={{ fontSize: isSmallScreen ? 14 : 17, color: '#111827', fontWeight: '600' }}>{barbearias.find(b => b.id === barbeariaId)?.nome || 'Selecionar'}</Text>
        </TouchableOpacity>
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <View style={{ width: isSmallScreen ? '95%' : '80%', backgroundColor: '#fff', borderRadius: 16, padding: isSmallScreen ? 16 : 28, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 8 }}>
              <Text style={{ fontSize: isSmallScreen ? 15 : 19, fontWeight: '700', color: '#374151', marginBottom: isSmallScreen ? 10 : 18, textAlign: 'center' }}>Escolha a barbearia</Text>
              {barbearias.map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                  onPress={() => {
                    setBarbeariaId(b.id);
                    setModalVisible(false);
                  }}>
                  <Text style={{ fontSize: isSmallScreen ? 14 : 17, color: '#111827', fontWeight: '600' }}>{b.nome}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={{ marginTop: 18 }} onPress={() => setModalVisible(false)}>
                <Text style={{ color: '#3B82F6', fontWeight: '700', fontSize: isSmallScreen ? 14 : 17, textAlign: 'center' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>

      {/* Gráfico de Vendas */}
      <View style={{
        marginBottom: isSmallScreen ? 18 : 36,
        backgroundColor: '#F0F9FF',
        borderRadius: 16,
        padding: isSmallScreen ? 10 : 20,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.10,
        shadowRadius: 8,
        elevation: 6,
      }}>
        <View style={{ flexDirection: isSmallScreen ? 'column' : 'row', alignItems: isSmallScreen ? 'flex-start' : 'center', marginBottom: isSmallScreen ? 6 : 10, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: isSmallScreen ? 6 : 0 }}>
            <Ionicons name="trending-up-outline" size={22} color="#3B82F6" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: isSmallScreen ? 15 : 19, fontWeight: '700', color: '#3B82F6', letterSpacing: 0.2 }}>
              Vendas por mês
              <Text style={{ fontSize: 15, color: '#2563EB', fontWeight: '500' }}> — {barbearias.find(b => b.id === barbeariaId)?.nome || ''}</Text>
            </Text>
          </View>
          <TouchableOpacity style={{ padding: 6, borderRadius: 6, backgroundColor: '#DBEAFE' }} onPress={() => alert('Exportação em breve!')}>
            <Ionicons name="share-outline" size={18} color="#2563EB" />
          </TouchableOpacity>
        </View>
        {/* Filtro de período */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {periodos.map(p => (
            <TouchableOpacity
              key={p.value}
              style={{
                backgroundColor: periodo === p.value ? '#2563EB' : '#E0E7FF',
                paddingVertical: isSmallScreen ? 2 : 4,
                paddingHorizontal: isSmallScreen ? 8 : 12,
                borderRadius: 8,
                marginRight: 6,
                marginBottom: isSmallScreen ? 4 : 0,
              }}
              onPress={() => setPeriodo(p.value as '12m' | '6m' | '3m')}
            >
              <Text style={{ color: periodo === p.value ? '#fff' : '#2563EB', fontWeight: '600', fontSize: isSmallScreen ? 11 : 13 }}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <LineChart
          data={vendasPorMesFiltrado}
          width={screenWidth - (isSmallScreen ? 16 : 48)}
          height={isSmallScreen ? 160 : 220}
          chartConfig={{
            backgroundColor: '#F0F9FF',
            backgroundGradientFrom: '#F0F9FF',
            backgroundGradientTo: '#F0F9FF',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(30, 64, 175, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#3B82F6',
            },
          }}
          bezier
          style={{ borderRadius: 16 }}
          getDotProps={(value, index) => ({
            onPress: () => setDetalheModal({ visible: true, label: salesData.labels[index], valor: value }),
          })}
        />
      </View>

      {/* Gráfico de Estoque */}
      <View style={{
        marginBottom: isSmallScreen ? 18 : 36,
        backgroundColor: '#FEF2F2',
        borderRadius: 16,
        padding: isSmallScreen ? 10 : 20,
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.10,
        shadowRadius: 8,
        elevation: 6,
      }}>
        <View style={{ flexDirection: isSmallScreen ? 'column' : 'row', alignItems: isSmallScreen ? 'flex-start' : 'center', marginBottom: isSmallScreen ? 6 : 10, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: isSmallScreen ? 6 : 0 }}>
            <Ionicons name="cube-outline" size={22} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: isSmallScreen ? 15 : 19, fontWeight: '700', color: '#DC2626', letterSpacing: 0.2 }}>
              Produtos no período
              <Text style={{ fontSize: 15, color: '#B91C1C', fontWeight: '500' }}> — {barbearias.find(b => b.id === barbeariaId)?.nome || ''}</Text>
            </Text>
          </View>
          <TouchableOpacity style={{ padding: 6, borderRadius: 6, backgroundColor: '#FEE2E2' }} onPress={() => alert('Exportação em breve!')}>
            <Ionicons name="share-outline" size={18} color="#B91C1C" />
          </TouchableOpacity>
        </View>
        {/* Filtro de produto */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {produtosFiltro.map(prod => (
            <TouchableOpacity
              key={prod}
              style={{
                backgroundColor: produtoFiltro === prod ? '#DC2626' : '#FECACA',
                paddingVertical: isSmallScreen ? 2 : 4,
                paddingHorizontal: isSmallScreen ? 8 : 12,
                borderRadius: 8,
                marginRight: 6,
                marginBottom: isSmallScreen ? 4 : 0,
              }}
              onPress={() => setProdutoFiltro(prod)}
            >
              <Text style={{ color: produtoFiltro === prod ? '#fff' : '#B91C1C', fontWeight: '600', fontSize: isSmallScreen ? 11 : 13 }}>{prod}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={estoqueProdutos}
            width={Math.max(screenWidth - (isSmallScreen ? 16 : 48), estoqueProdutos.labels.length * 120)}
            height={isSmallScreen ? 200 : 260}
            yAxisLabel={''}
            yAxisSuffix={''}
            verticalLabelRotation={20}
            chartConfig={{
              backgroundColor: '#FEF2F2',
              backgroundGradientFrom: '#FEF2F2',
              backgroundGradientTo: '#FEF2F2',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(220, 38, 38, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(153, 27, 27, ${opacity})`,
              style: { borderRadius: 16 },
              propsForLabels: {
                fontSize: '11',
              },
            }}
            style={{ borderRadius: 16 }}
            withCustomBarColorFromData={false}
            showBarTops={true}
            fromZero
          />
        </ScrollView>
      </View>

      <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>
        * Dados reais da homologação (Supabase) conforme barbearias, medições e estoque sincronizados.
      </Text>

      {/* Modal de detalhamento */}
      <Modal visible={detalheModal.visible} transparent animationType="fade" onRequestClose={() => setDetalheModal({ visible: false })}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.18)' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: isSmallScreen ? 16 : 28, minWidth: isSmallScreen ? 160 : 220, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 8 }}>
            <Text style={{ fontSize: isSmallScreen ? 15 : 18, fontWeight: '700', marginBottom: 8, color: '#111827' }}>Detalhe</Text>
            <Text style={{ fontSize: isSmallScreen ? 13 : 16, color: '#374151', marginBottom: 12 }}>{detalheModal.label}</Text>
            <Text style={{ fontSize: isSmallScreen ? 18 : 22, fontWeight: '700', color: '#2563EB', marginBottom: 18 }}>{detalheModal.valor}</Text>
            <TouchableOpacity style={{ marginTop: 8, backgroundColor: '#E0E7FF', borderRadius: 8, paddingVertical: isSmallScreen ? 6 : 8, paddingHorizontal: isSmallScreen ? 16 : 24 }} onPress={() => setDetalheModal({ visible: false })}>
              <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: isSmallScreen ? 13 : 16 }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
