import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Modal, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { listClients, listMeasurements, listProducts, Measurement } from '../services/api';
import { Client } from '../data/clients';

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

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

function getLinhaColor(linha?: string) {
  const normalized = String(linha || '').toLowerCase();
  if (normalized.includes('wood')) return '#8B5A2B';
  if (normalized.includes('ocean')) return '#0EA5E9';
  return '#6B7280';
}

export default function RelatoriosScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isSmallScreen = screenWidth < 400;
  const [barbearias, setBarbearias] = useState<Client[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [barbeariaId, setBarbeariaId] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalFiltroMedicaoVisible, setModalFiltroMedicaoVisible] = useState(false);
  const [modalFiltroBancadaVisible, setModalFiltroBancadaVisible] = useState(false);
  const [periodo, setPeriodo] = useState<'12m' | '6m' | '3m'>('12m');
  const [produtoFiltroMedicao, setProdutoFiltroMedicao] = useState<string>('Todos');
  const [produtoFiltroBancada, setProdutoFiltroBancada] = useState<string>('Todos');
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

  const produtosFiltroMedicao = useMemo(() => {
    const names = Array.from(new Set(products.filter((p: any) => !String(p.id || '').startsWith('b')).map((p) => p.nome)));
    return ['Todos', ...names];
  }, [products]);

  const produtosFiltroBancada = useMemo(() => {
    const names = Array.from(new Set(products.filter((p: any) => String(p.id || '').startsWith('b')).map((p) => p.nome)));
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
        strokeWidth: 2
      }
    ],
  };

  const produtosData = useMemo(() => {
    const grouped = new Map<string, { label: string; linha: string; total: number }>();

    filteredMeasurementsInPeriod.forEach((m) => {
      (m.medicaoRows || []).forEach((row: any) => {
        const key = `${row.id || row.nome}-${row.linha || ''}`;
        const prev = grouped.get(key);
        const label = `${row.nome} (${row.linha || 'Bymen'})`;
        grouped.set(key, {
          label,
          linha: row.linha || 'Bymen',
          total: Number(row.vendidos || 0) + Number(prev?.total || 0),
        });
      });
    });

    let entries = Array.from(grouped.values());
    if (produtoFiltroMedicao !== 'Todos') {
      entries = entries.filter((item) => item.label.startsWith(`${produtoFiltroMedicao} (`));
    } else {
      entries = entries.sort((a, b) => b.total - a.total).slice(0, 8);
    }

    if (entries.length === 0) {
      return [] as Array<{ label: string; linha: string; total: number; color: string }>;
    }

    return entries.map((item) => ({
      ...item,
      color: getLinhaColor(item.linha),
    }));
  }, [filteredMeasurementsInPeriod, produtoFiltroMedicao]);

  const bancadaData = useMemo(() => {
    const grouped = new Map<string, { label: string; linha: string; total: number }>();

    filteredMeasurementsInPeriod.forEach((m) => {
      (m.bancadaRows || []).forEach((row: any) => {
        const key = `${row.id || row.nome}-${row.linha || ''}`;
        const prev = grouped.get(key);
        const label = `${row.nome} (${row.linha || 'Bymen'})`;
        grouped.set(key, {
          label,
          linha: row.linha || 'Bymen',
          total: Number(row.quantidadeComprada || 0) + Number(prev?.total || 0),
        });
      });
    });

    let entries = Array.from(grouped.values());

    if (produtoFiltroBancada !== 'Todos') {
      entries = entries.filter((item) => item.label.startsWith(`${produtoFiltroBancada} (`));
    } else {
      entries = entries.sort((a, b) => b.total - a.total).slice(0, 8);
    }

    return entries.map((item) => ({
      ...item,
      color: getLinhaColor(item.linha),
    }));
  }, [filteredMeasurementsInPeriod, produtoFiltroBancada]);

  const vendasChartWidth = Math.max(screenWidth - (isSmallScreen ? 16 : 48), salesData.labels.length * (isSmallScreen ? 70 : 84));

  function renderHorizontalRanking(
    title: string,
    subtitle: string,
    data: Array<{ label: string; linha: string; total: number; color: string }>,
    iconColor: string,
  ) {
    const max = Math.max(...data.map((d) => d.total), 1);

    return (
      <View
        style={{
          marginBottom: 16,
          backgroundColor: '#FEF2F2',
          borderRadius: 16,
          padding: isSmallScreen ? 10 : 16,
          borderWidth: 1,
          borderColor: '#FECACA',
        }}
      >
        <Text style={{ fontSize: isSmallScreen ? 14 : 16, fontWeight: '700', color: '#991B1B', marginBottom: 10 }}>
          {title}
        </Text>
        <Text style={{ fontSize: isSmallScreen ? 12 : 13, color: '#7F1D1D', marginBottom: 10 }}>
          {subtitle}
        </Text>

        {data.length === 0 ? (
          <Text style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Sem dados para o período selecionado.</Text>
        ) : (
          data.map((item, idx) => (
            <View key={`${item.label}-${idx}`} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: '#111827', fontSize: isSmallScreen ? 12 : 13, flex: 1, paddingRight: 8 }} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={{ color: iconColor, fontWeight: '700', fontSize: isSmallScreen ? 12 : 13 }}>{item.total}</Text>
              </View>
              <View style={{ height: 10, borderRadius: 6, backgroundColor: '#F3F4F6', overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${Math.max((item.total / max) * 100, 4)}%`,
                    backgroundColor: item.color,
                  }}
                />
              </View>
            </View>
          ))
        )}
      </View>
    );
  }

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
      contentContainerStyle={{ paddingHorizontal: isSmallScreen ? 8 : 24, paddingTop: 18, paddingBottom: 48 }}
    >
      <Text
        style={{
          fontSize: isSmallScreen ? 20 : 28,
          fontWeight: '800',
          color: '#111827',
          marginBottom: isSmallScreen ? 16 : 24,
          textAlign: 'left',
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
              <Text style={{ fontSize: isSmallScreen ? 15 : 19, fontWeight: '700', color: '#374151', marginBottom: isSmallScreen ? 10 : 18, textAlign: 'left' }}>Escolha a barbearia</Text>
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
                <Text style={{ color: '#3B82F6', fontWeight: '700', fontSize: isSmallScreen ? 14 : 17, textAlign: 'left' }}>Cancelar</Text>
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
              Vendas por mês (colunas)
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={vendasPorMesFiltrado}
            width={vendasChartWidth}
            height={isSmallScreen ? 200 : 230}
            yAxisLabel={''}
            yAxisSuffix={''}
            fromZero
            showValuesOnTopOfBars
            withInnerLines
            chartConfig={{
              backgroundColor: '#F0F9FF',
              backgroundGradientFrom: '#F0F9FF',
              backgroundGradientTo: '#F0F9FF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(30, 64, 175, ${opacity})`,
              style: { borderRadius: 16 },
              propsForBackgroundLines: {
                strokeDasharray: '',
              },
            }}
            style={{ borderRadius: 16 }}
          />
        </ScrollView>
      </View>

      {/* Card: Medição */}
      <View style={{
        marginBottom: 16,
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
              Medição
            </Text>
          </View>
          <TouchableOpacity
            style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#FECACA', borderWidth: 1, borderColor: '#FCA5A5' }}
            onPress={() => setModalFiltroMedicaoVisible(true)}
          >
            <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 12 }}>
              Filtro: {produtoFiltroMedicao}
            </Text>
          </TouchableOpacity>
        </View>
        {renderHorizontalRanking(
          'Produtos vendidos',
          'Cores por linha: Wood (madeira), Ocean (mar).',
          produtosData,
          '#B91C1C',
        )}
      </View>

      {/* Card: Bancada */}
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
            <Ionicons name="flask-outline" size={22} color="#B91C1C" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: isSmallScreen ? 15 : 19, fontWeight: '700', color: '#B91C1C', letterSpacing: 0.2 }}>
              Bancada
            </Text>
          </View>
          <TouchableOpacity
            style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#FECACA', borderWidth: 1, borderColor: '#FCA5A5' }}
            onPress={() => setModalFiltroBancadaVisible(true)}
          >
            <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 12 }}>
              Filtro: {produtoFiltroBancada}
            </Text>
          </TouchableOpacity>
        </View>
        {renderHorizontalRanking(
          'Produtos de bancada',
          'Quantidade consumida de itens de uso interno no período.',
          bancadaData,
          '#7F1D1D',
        )}
      </View>

      <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'left', marginTop: 8, fontStyle: 'italic' }}>
        * Dados reais da homologação (Supabase) conforme barbearias, medições e estoque sincronizados.
      </Text>

      <Modal
        visible={modalFiltroMedicaoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalFiltroMedicaoVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <View style={{ width: isSmallScreen ? '92%' : '70%', backgroundColor: '#fff', borderRadius: 16, padding: isSmallScreen ? 16 : 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 }}>Filtro • Medição</Text>
            {produtosFiltroMedicao.map((prod) => (
              <TouchableOpacity
                key={`med-${prod}`}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
                onPress={() => {
                  setProdutoFiltroMedicao(prod);
                  setModalFiltroMedicaoVisible(false);
                }}
              >
                <Text style={{ color: prod === produtoFiltroMedicao ? '#DC2626' : '#111827', fontWeight: prod === produtoFiltroMedicao ? '700' : '500' }}>
                  {prod}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setModalFiltroMedicaoVisible(false)} style={{ marginTop: 12 }}>
              <Text style={{ color: '#2563EB', fontWeight: '700' }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={modalFiltroBancadaVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalFiltroBancadaVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <View style={{ width: isSmallScreen ? '92%' : '70%', backgroundColor: '#fff', borderRadius: 16, padding: isSmallScreen ? 16 : 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 }}>Filtro • Bancada</Text>
            {produtosFiltroBancada.map((prod) => (
              <TouchableOpacity
                key={`ban-${prod}`}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
                onPress={() => {
                  setProdutoFiltroBancada(prod);
                  setModalFiltroBancadaVisible(false);
                }}
              >
                <Text style={{ color: prod === produtoFiltroBancada ? '#DC2626' : '#111827', fontWeight: prod === produtoFiltroBancada ? '700' : '500' }}>
                  {prod}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setModalFiltroBancadaVisible(false)} style={{ marginTop: 12 }}>
              <Text style={{ color: '#2563EB', fontWeight: '700' }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}
