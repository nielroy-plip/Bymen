import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Modal, TouchableOpacity, useWindowDimensions, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listClients, listMeasurements, listProducts, listSales, Measurement, Sale } from '../services/api';
import { Client } from '../data/clients';
import { generateReportChartPDF } from '../services/pdf';
import { sharePdf } from '../services/whatsapp';
import { formatCurrency } from '../utils/format';
import { compareByCatalogOrder, compareCatalogNames } from '../utils/productOrder';
import BymenLoader from '../components/BymenLoader';

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const FILTER_ALL = '__ALL__';

type ProductFilterOption = {
  value: string;
  label: string;
  nome?: string;
  linha?: string;
};

type LinhaFilter = 'TODOS' | 'WOOD' | 'OCEAN' | 'BYMEN' | 'OUTROS';

const LINHA_FILTER_OPTIONS: Array<{ value: LinhaFilter; label: string }> = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'WOOD', label: 'Wood' },
  { value: 'OCEAN', label: 'Ocean' },
  { value: 'BYMEN', label: 'Bymen' },
  { value: 'OUTROS', label: 'Outros' },
];

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

function buildProductFilterKey(nome?: string, linha?: string) {
  return `${String(nome || '').trim()}::${String(linha || 'Bymen').trim()}`;
}

function buildProductFilterLabel(nome?: string, linha?: string) {
  return `${String(nome || '').trim()} (${String(linha || 'Bymen').trim()})`;
}

function getLinhaBucket(linha?: string): LinhaFilter {
  const normalized = String(linha || '').trim().toLowerCase();
  if (normalized.includes('wood')) return 'WOOD';
  if (normalized.includes('ocean')) return 'OCEAN';
  if (normalized.includes('bymen')) return 'BYMEN';
  return 'OUTROS';
}

function buildLinhaCounts(options: ProductFilterOption[]): Record<LinhaFilter, number> {
  const counts: Record<LinhaFilter, number> = {
    TODOS: 0,
    WOOD: 0,
    OCEAN: 0,
    BYMEN: 0,
    OUTROS: 0,
  };

  options.forEach((item) => {
    if (item.value === FILTER_ALL) return;
    const bucket = getLinhaBucket(item.linha);
    counts[bucket] += 1;
    counts.TODOS += 1;
  });

  return counts;
}

export default function RelatoriosScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isSmallScreen = screenWidth < 400;
  const [barbearias, setBarbearias] = useState<Client[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [barbeariaId, setBarbeariaId] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalFiltroMedicaoVisible, setModalFiltroMedicaoVisible] = useState(false);
  const [modalFiltroBancadaVisible, setModalFiltroBancadaVisible] = useState(false);
  const [periodo, setPeriodo] = useState<'12m' | '6m' | '3m'>('12m');
  const [produtoFiltroMedicao, setProdutoFiltroMedicao] = useState<string>(FILTER_ALL);
  const [produtoFiltroBancada, setProdutoFiltroBancada] = useState<string>(FILTER_ALL);
  const [searchFiltroMedicao, setSearchFiltroMedicao] = useState('');
  const [searchFiltroBancada, setSearchFiltroBancada] = useState('');
  const [linhaFiltroMedicao, setLinhaFiltroMedicao] = useState<LinhaFilter>('TODOS');
  const [linhaFiltroBancada, setLinhaFiltroBancada] = useState<LinhaFilter>('TODOS');
  // Feedback visual para modal
  const [modalOpening, setModalOpening] = useState(false);
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [clientsData, measurementsData, salesData, productsData] = await Promise.all([
        listClients(),
        listMeasurements(),
        listSales(),
        listProducts(),
      ]);

      setBarbearias(clientsData);
      setMeasurements(measurementsData);
      setSales(salesData);
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

  const selectedBarbearia = useMemo(
    () => barbearias.find((b) => b.id === barbeariaId),
    [barbearias, barbeariaId],
  );

  const isVendaClient = selectedBarbearia?.operationMode === 'VENDA';

  const produtosFiltroMedicao = useMemo<ProductFilterOption[]>(() => {
    const source = isVendaClient
      ? sales
          .filter((s) => (barbeariaId ? s.clientId === barbeariaId : true))
          .flatMap((s) => s.items || [])
          .filter((item: any) => !String(item.id || '').startsWith('b'))
      : products.filter((p: any) => !String(p.id || '').startsWith('b'));

    const unique = new Map<string, ProductFilterOption>();
    source.forEach((item: any) => {
      const nome = String(item.nome || '').trim();
      const linha = String(item.linha || 'Bymen').trim();
      const value = buildProductFilterKey(nome, linha);
      if (!nome || unique.has(value)) return;

      unique.set(value, {
        value,
        label: buildProductFilterLabel(nome, linha),
        nome,
        linha,
      });
    });

    const sorted = Array.from(unique.values()).sort((a, b) => {
      const byName = compareCatalogNames(String(a.nome || ''), String(b.nome || ''));
      if (byName !== 0) return byName;
      return String(a.linha || '').localeCompare(String(b.linha || ''), 'pt-BR', { sensitivity: 'base' });
    });

    return [{ value: FILTER_ALL, label: 'Todos' }, ...sorted];
  }, [isVendaClient, sales, barbeariaId, products]);

  const produtosFiltroBancada = useMemo<ProductFilterOption[]>(() => {
    const source = isVendaClient
      ? sales
          .filter((s) => (barbeariaId ? s.clientId === barbeariaId : true))
          .flatMap((s) => s.items || [])
          .filter((item: any) => String(item.id || '').startsWith('b'))
      : products.filter((p: any) => String(p.id || '').startsWith('b'));

    const unique = new Map<string, ProductFilterOption>();
    source.forEach((item: any) => {
      const nome = String(item.nome || '').trim();
      const linha = String(item.linha || 'Bymen').trim();
      const value = buildProductFilterKey(nome, linha);
      if (!nome || unique.has(value)) return;

      unique.set(value, {
        value,
        label: buildProductFilterLabel(nome, linha),
        nome,
        linha,
      });
    });

    const sorted = Array.from(unique.values()).sort((a, b) => {
      const byName = compareCatalogNames(String(a.nome || ''), String(b.nome || ''));
      if (byName !== 0) return byName;
      return String(a.linha || '').localeCompare(String(b.linha || ''), 'pt-BR', { sensitivity: 'base' });
    });

    return [{ value: FILTER_ALL, label: 'Todos' }, ...sorted];
  }, [isVendaClient, sales, barbeariaId, products]);

  const selectedProdutoFiltroMedicaoLabel = useMemo(
    () => produtosFiltroMedicao.find((item) => item.value === produtoFiltroMedicao)?.label || 'Todos',
    [produtosFiltroMedicao, produtoFiltroMedicao],
  );

  const selectedProdutoFiltroBancadaLabel = useMemo(
    () => produtosFiltroBancada.find((item) => item.value === produtoFiltroBancada)?.label || 'Todos',
    [produtosFiltroBancada, produtoFiltroBancada],
  );

  const linhaCountsMedicao = useMemo(() => buildLinhaCounts(produtosFiltroMedicao), [produtosFiltroMedicao]);
  const linhaCountsBancada = useMemo(() => buildLinhaCounts(produtosFiltroBancada), [produtosFiltroBancada]);

  const produtosFiltroMedicaoFiltrados = useMemo(() => {
    const term = String(searchFiltroMedicao || '').trim().toLowerCase();
    return produtosFiltroMedicao.filter((item) => {
      if (item.value === FILTER_ALL) return linhaFiltroMedicao === 'TODOS' && term.length === 0;
      const bucket = getLinhaBucket(item.linha);
      if (linhaFiltroMedicao !== 'TODOS' && bucket !== linhaFiltroMedicao) return false;
      if (!term) return true;
      return item.label.toLowerCase().includes(term);
    });
  }, [produtosFiltroMedicao, searchFiltroMedicao, linhaFiltroMedicao]);

  const produtosFiltroBancadaFiltrados = useMemo(() => {
    const term = String(searchFiltroBancada || '').trim().toLowerCase();
    return produtosFiltroBancada.filter((item) => {
      if (item.value === FILTER_ALL) return linhaFiltroBancada === 'TODOS' && term.length === 0;
      const bucket = getLinhaBucket(item.linha);
      if (linhaFiltroBancada !== 'TODOS' && bucket !== linhaFiltroBancada) return false;
      if (!term) return true;
      return item.label.toLowerCase().includes(term);
    });
  }, [produtosFiltroBancada, searchFiltroBancada, linhaFiltroBancada]);

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
    const sourceSales = sales.filter((s) => (barbeariaId ? s.clientId === barbeariaId : true));
    const mapByMonth: Record<string, number> = {};

    source.forEach((m) => {
      const parsed = parseMeasurementDate(m.dateTime);
      if (!parsed) return;
      const key = getMonthKey(parsed);
      mapByMonth[key] = (mapByMonth[key] || 0) + Number(m.totalGeral || 0);
    });

    sourceSales.forEach((s) => {
      const parsed = parseMeasurementDate(s.dateTime);
      if (!parsed) return;
      const key = getMonthKey(parsed);
      mapByMonth[key] = (mapByMonth[key] || 0) + Number(s.total || 0);
    });

    const labels = monthWindow.map((m) => m.label);
    const data = monthWindow.map((m) => Number((mapByMonth[m.key] || 0).toFixed(2)));

    return {
      labels,
      data,
    };
  }, [measurements, sales, barbeariaId, monthWindow]);

  const filteredMeasurementsInPeriod = useMemo(() => {
    const validMonthKeys = new Set(monthWindow.map((m) => m.key));
    return measurements.filter((m) => {
      if (barbeariaId && m.clientId !== barbeariaId) return false;
      const parsed = parseMeasurementDate(m.dateTime);
      if (!parsed) return false;
      return validMonthKeys.has(getMonthKey(parsed));
    });
  }, [measurements, barbeariaId, monthWindow]);

  const monthlySalesBars = useMemo(() => {
    const maxValue = Math.max(...salesData.data, 1);

    return salesData.labels.map((label, index) => {
      const value = Number(salesData.data[index] || 0);
      const ratio = value / maxValue;
      const widthPercent = Math.max(ratio * 100, value > 0 ? 10 : 2);

      return {
        label,
        value,
        widthPercent,
      };
    });
  }, [salesData]);

  const produtosData = useMemo(() => {
    const grouped = new Map<string, { nome: string; label: string; linha: string; total: number }>();

    filteredMeasurementsInPeriod.forEach((m) => {
      (m.medicaoRows || []).forEach((row: any) => {
        const key = `${row.id || row.nome}-${row.linha || ''}`;
        const prev = grouped.get(key);
        const label = `${row.nome} (${row.linha || 'Bymen'})`;
        grouped.set(key, {
          nome: row.nome,
          label,
          linha: row.linha || 'Bymen',
          total: Number(row.vendidos || 0) + Number(prev?.total || 0),
        });
      });
    });

    let entries = Array.from(grouped.values());
    if (produtoFiltroMedicao !== FILTER_ALL) {
      entries = entries.filter((item) => buildProductFilterKey(item.nome, item.linha) === produtoFiltroMedicao);
    } else {
      entries = entries.sort(compareByCatalogOrder);
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
    const grouped = new Map<string, { nome: string; label: string; linha: string; total: number }>();

    filteredMeasurementsInPeriod.forEach((m) => {
      (m.bancadaRows || []).forEach((row: any) => {
        const key = `${row.id || row.nome}-${row.linha || ''}`;
        const prev = grouped.get(key);
        const label = `${row.nome} (${row.linha || 'Bymen'})`;
        grouped.set(key, {
          nome: row.nome,
          label,
          linha: row.linha || 'Bymen',
          total: Number(row.quantidadeComprada || 0) + Number(prev?.total || 0),
        });
      });
    });

    let entries = Array.from(grouped.values());

    if (produtoFiltroBancada !== FILTER_ALL) {
      entries = entries.filter((item) => buildProductFilterKey(item.nome, item.linha) === produtoFiltroBancada);
    } else {
      entries = entries.sort(compareByCatalogOrder);
    }

    return entries.map((item) => ({
      ...item,
      color: getLinhaColor(item.linha),
    }));
  }, [filteredMeasurementsInPeriod, produtoFiltroBancada]);

  const vendasProdutosData = useMemo(() => {
    const grouped = new Map<string, { nome: string; label: string; linha: string; total: number }>();

    sales
      .filter((s) => (barbeariaId ? s.clientId === barbeariaId : true))
      .forEach((s) => {
        const parsed = parseMeasurementDate(s.dateTime);
        if (!parsed) return;
        if (!new Set(monthWindow.map((m) => m.key)).has(getMonthKey(parsed))) return;

        (s.items || []).forEach((item: any) => {
          if (String(item.id || '').startsWith('b')) return;
          const key = `${item.id || item.nome}-${item.linha || ''}`;
          const prev = grouped.get(key);
          const label = `${item.nome} (${item.linha || 'Bymen'})`;
          grouped.set(key, {
            nome: item.nome,
            label,
            linha: item.linha || 'Bymen',
            total: Number(item.quantidade || 0) + Number(prev?.total || 0),
          });
        });
      });

    let entries = Array.from(grouped.values());
    if (produtoFiltroMedicao !== FILTER_ALL) {
      entries = entries.filter((item) => buildProductFilterKey(item.nome, item.linha) === produtoFiltroMedicao);
    } else {
      entries = entries.sort(compareByCatalogOrder);
    }

    return entries.map((item) => ({
      ...item,
      color: getLinhaColor(item.linha),
    }));
  }, [sales, barbeariaId, monthWindow, produtoFiltroMedicao]);

  const vendasBancadaData = useMemo(() => {
    const grouped = new Map<string, { nome: string; label: string; linha: string; total: number }>();

    sales
      .filter((s) => (barbeariaId ? s.clientId === barbeariaId : true))
      .forEach((s) => {
        const parsed = parseMeasurementDate(s.dateTime);
        if (!parsed) return;
        if (!new Set(monthWindow.map((m) => m.key)).has(getMonthKey(parsed))) return;

        (s.items || []).forEach((item: any) => {
          if (!String(item.id || '').startsWith('b')) return;
          const key = `${item.id || item.nome}-${item.linha || ''}`;
          const prev = grouped.get(key);
          const label = `${item.nome} (${item.linha || 'Bymen'})`;
          grouped.set(key, {
            nome: item.nome,
            label,
            linha: item.linha || 'Bymen',
            total: Number(item.quantidade || 0) + Number(prev?.total || 0),
          });
        });
      });

    let entries = Array.from(grouped.values());
    if (produtoFiltroBancada !== FILTER_ALL) {
      entries = entries.filter((item) => buildProductFilterKey(item.nome, item.linha) === produtoFiltroBancada);
    } else {
      entries = entries.sort(compareByCatalogOrder);
    }

    return entries.map((item) => ({
      ...item,
      color: getLinhaColor(item.linha),
    }));
  }, [sales, barbeariaId, monthWindow, produtoFiltroBancada]);

  const periodLabel = useMemo(() => {
    const selected = periodos.find((p) => p.value === periodo);
    return selected?.label || 'Período customizado';
  }, [periodo]);

  async function handleExportChart(
    chartTitle: string,
    points: Array<{ label: string; value: number }>,
    valueType: 'currency' | 'quantity' = 'currency',
  ) {
    try {
      const uri = await generateReportChartPDF({
        clientName: selectedBarbearia?.nome || 'Barbearia',
        chartTitle,
        periodLabel,
        valueType,
        points,
      });
      await sharePdf(uri);
    } catch (error) {
      Alert.alert('Falha ao exportar', (error as Error)?.message || 'Não foi possível exportar este gráfico.');
    }
  }

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
    return <BymenLoader fullScreen label="Carregando relatórios..." />;
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

      <View
        style={{
          marginBottom: isSmallScreen ? 12 : 16,
          padding: isSmallScreen ? 10 : 12,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: '#A7F3D0',
          backgroundColor: '#ECFDF5',
        }}
      >
        <Text style={{ color: '#065F46', fontSize: isSmallScreen ? 12 : 13, fontWeight: '600' }}>
          Totais financeiros consideram desconto à vista de 5% quando o pagamento é PIX ou Dinheiro.
        </Text>
      </View>

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
          <TouchableOpacity
            style={{ padding: 6, borderRadius: 6, backgroundColor: '#DBEAFE' }}
            onPress={() =>
              handleExportChart(
                'Vendas por mês',
                salesData.labels.map((label, index) => ({
                  label,
                  value: Number(salesData.data[index] || 0),
                })),
                'currency',
              )
            }
          >
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
        <View style={{ marginTop: 2 }}>
          {monthlySalesBars.map((item, index) => (
            <View key={`sales-bar-${item.label}-${index}`} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ color: '#1E3A8A', fontSize: 12, fontWeight: '700', width: 34 }}>
                  {item.label}
                </Text>
                <View style={{ flex: 1, height: 28, borderRadius: 8, backgroundColor: '#DBEAFE', overflow: 'hidden' }}>
                  <View
                    style={{
                      width: `${item.widthPercent}%`,
                      height: '100%',
                      backgroundColor: '#2563EB',
                      borderRadius: 8,
                      justifyContent: 'center',
                      alignItems: 'flex-end',
                      paddingHorizontal: 8,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
                      {formatCurrency(item.value)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
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
              {isVendaClient ? 'Vendas - Produtos' : 'Medição'}
            </Text>
          </View>
          <TouchableOpacity
            style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#FECACA', borderWidth: 1, borderColor: '#FCA5A5' }}
            onPress={() => setModalFiltroMedicaoVisible(true)}
          >
            <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 12 }}>
              Filtro: {selectedProdutoFiltroMedicaoLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginTop: isSmallScreen ? 8 : 0, marginLeft: isSmallScreen ? 0 : 8, padding: 6, borderRadius: 6, backgroundColor: '#FECACA' }}
            onPress={() =>
              handleExportChart(
                isVendaClient ? 'Vendas - Produtos' : 'Medição - Produtos',
                (isVendaClient ? vendasProdutosData : produtosData).map((item) => ({
                  label: item.label,
                  value: Number(item.total || 0),
                })),
                'quantity',
              )
            }
          >
            <Ionicons name="share-outline" size={18} color="#B91C1C" />
          </TouchableOpacity>
        </View>
        {renderHorizontalRanking(
          isVendaClient ? 'Produtos vendidos no período' : 'Produtos vendidos',
          isVendaClient
            ? 'Ranking por quantidade vendida nas vendas finalizadas.'
            : 'Cores por linha: Wood (madeira), Ocean (mar).',
          isVendaClient ? vendasProdutosData : produtosData,
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
              {isVendaClient ? 'Vendas - Bancada' : 'Bancada'}
            </Text>
          </View>
          <TouchableOpacity
            style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#FECACA', borderWidth: 1, borderColor: '#FCA5A5' }}
            onPress={() => setModalFiltroBancadaVisible(true)}
          >
            <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 12 }}>
              Filtro: {selectedProdutoFiltroBancadaLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginTop: isSmallScreen ? 8 : 0, marginLeft: isSmallScreen ? 0 : 8, padding: 6, borderRadius: 6, backgroundColor: '#FECACA' }}
            onPress={() =>
              handleExportChart(
                isVendaClient ? 'Vendas - Bancada' : 'Bancada',
                (isVendaClient ? vendasBancadaData : bancadaData).map((item) => ({
                  label: item.label,
                  value: Number(item.total || 0),
                })),
                'quantity',
              )
            }
          >
            <Ionicons name="share-outline" size={18} color="#7F1D1D" />
          </TouchableOpacity>
        </View>
        {renderHorizontalRanking(
          isVendaClient ? 'Bancada vendida no período' : 'Produtos de bancada',
          isVendaClient
            ? 'Quantidade de itens de bancada vendidos nas vendas finalizadas.'
            : 'Quantidade consumida de itens de uso interno no período.',
          isVendaClient ? vendasBancadaData : bancadaData,
          '#7F1D1D',
        )}
      </View>

      <Modal
        visible={modalFiltroMedicaoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalFiltroMedicaoVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <View style={{ width: isSmallScreen ? '94%' : '72%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 18, padding: isSmallScreen ? 14 : 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 }}>Filtro • Medição</Text>
            <Text style={{ color: '#6B7280', marginBottom: 12, fontSize: 12 }}>
              Selecione o produto exato com a linha correta.
            </Text>
            <TextInput
              value={searchFiltroMedicao}
              onChangeText={setSearchFiltroMedicao}
              placeholder="Buscar produto..."
              placeholderTextColor="#9CA3AF"
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 10,
                color: '#111827',
                backgroundColor: '#FFFFFF',
              }}
            />
            <View style={{ marginBottom: 10, flexDirection: 'row', flexWrap: 'wrap' }}>
              {LINHA_FILTER_OPTIONS.map((bucket) => (
                <TouchableOpacity
                  key={`med-bucket-${bucket.value}`}
                  onPress={() => setLinhaFiltroMedicao(bucket.value as LinhaFilter)}
                  style={{
                    marginRight: 8,
                    marginBottom: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: linhaFiltroMedicao === bucket.value ? '#FCA5A5' : '#E5E7EB',
                    backgroundColor: linhaFiltroMedicao === bucket.value ? '#FEF2F2' : '#FFFFFF',
                  }}
                >
                  <Text style={{ color: linhaFiltroMedicao === bucket.value ? '#B91C1C' : '#374151', fontWeight: '700', fontSize: 12 }}>
                    {bucket.label} ({linhaCountsMedicao[bucket.value]})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
            {produtosFiltroMedicaoFiltrados.map((prod) => (
              <TouchableOpacity
                key={`med-${prod.value}`}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: prod.value === produtoFiltroMedicao ? '#FCA5A5' : '#E5E7EB',
                  backgroundColor: prod.value === produtoFiltroMedicao ? '#FEF2F2' : '#FFFFFF',
                  borderRadius: 12,
                  marginBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onPress={() => {
                  setProdutoFiltroMedicao(prod.value);
                  setModalFiltroMedicaoVisible(false);
                }}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ color: prod.value === produtoFiltroMedicao ? '#B91C1C' : '#111827', fontWeight: prod.value === produtoFiltroMedicao ? '700' : '600' }}>
                    {prod.label}
                  </Text>
                  {prod.value !== FILTER_ALL && (
                    <Text
                      style={{
                        marginTop: 4,
                        color: getLinhaColor(prod.linha),
                        fontWeight: '700',
                        fontSize: 11,
                      }}
                    >
                      {String(prod.linha || 'Bymen').toUpperCase()}
                    </Text>
                  )}
                </View>
                {prod.value === produtoFiltroMedicao && <Ionicons name="checkmark-circle" size={20} color="#DC2626" />}
              </TouchableOpacity>
            ))}
            {produtosFiltroMedicaoFiltrados.length === 0 && (
              <Text style={{ color: '#9CA3AF', fontStyle: 'italic', paddingVertical: 8 }}>
                Nenhum produto encontrado para este filtro.
              </Text>
            )}
            </ScrollView>
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
          <View style={{ width: isSmallScreen ? '94%' : '72%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 18, padding: isSmallScreen ? 14 : 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 }}>Filtro • Bancada</Text>
            <Text style={{ color: '#6B7280', marginBottom: 12, fontSize: 12 }}>
              Selecione o produto de bancada com a linha correta.
            </Text>
            <TextInput
              value={searchFiltroBancada}
              onChangeText={setSearchFiltroBancada}
              placeholder="Buscar produto..."
              placeholderTextColor="#9CA3AF"
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 10,
                color: '#111827',
                backgroundColor: '#FFFFFF',
              }}
            />
            <View style={{ marginBottom: 10, flexDirection: 'row', flexWrap: 'wrap' }}>
              {LINHA_FILTER_OPTIONS.map((bucket) => (
                <TouchableOpacity
                  key={`ban-bucket-${bucket.value}`}
                  onPress={() => setLinhaFiltroBancada(bucket.value as LinhaFilter)}
                  style={{
                    marginRight: 8,
                    marginBottom: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: linhaFiltroBancada === bucket.value ? '#FCA5A5' : '#E5E7EB',
                    backgroundColor: linhaFiltroBancada === bucket.value ? '#FEF2F2' : '#FFFFFF',
                  }}
                >
                  <Text style={{ color: linhaFiltroBancada === bucket.value ? '#B91C1C' : '#374151', fontWeight: '700', fontSize: 12 }}>
                    {bucket.label} ({linhaCountsBancada[bucket.value]})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
            {produtosFiltroBancadaFiltrados.map((prod) => (
              <TouchableOpacity
                key={`ban-${prod.value}`}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: prod.value === produtoFiltroBancada ? '#FCA5A5' : '#E5E7EB',
                  backgroundColor: prod.value === produtoFiltroBancada ? '#FEF2F2' : '#FFFFFF',
                  borderRadius: 12,
                  marginBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onPress={() => {
                  setProdutoFiltroBancada(prod.value);
                  setModalFiltroBancadaVisible(false);
                }}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ color: prod.value === produtoFiltroBancada ? '#B91C1C' : '#111827', fontWeight: prod.value === produtoFiltroBancada ? '700' : '600' }}>
                    {prod.label}
                  </Text>
                  {prod.value !== FILTER_ALL && (
                    <Text
                      style={{
                        marginTop: 4,
                        color: getLinhaColor(prod.linha),
                        fontWeight: '700',
                        fontSize: 11,
                      }}
                    >
                      {String(prod.linha || 'Bymen').toUpperCase()}
                    </Text>
                  )}
                </View>
                {prod.value === produtoFiltroBancada && <Ionicons name="checkmark-circle" size={20} color="#DC2626" />}
              </TouchableOpacity>
            ))}
            {produtosFiltroBancadaFiltrados.length === 0 && (
              <Text style={{ color: '#9CA3AF', fontStyle: 'italic', paddingVertical: 8 }}>
                Nenhum produto encontrado para este filtro.
              </Text>
            )}
            </ScrollView>
            <TouchableOpacity onPress={() => setModalFiltroBancadaVisible(false)} style={{ marginTop: 12 }}>
              <Text style={{ color: '#2563EB', fontWeight: '700' }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}
