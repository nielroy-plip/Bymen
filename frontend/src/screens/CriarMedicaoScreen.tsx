import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import { Client } from '../data/clients';
import {
  listProductsForClient,
  listBancadaProductsForConsignado,
  listClients,
  listMeasurements,
  MedicaoRow,
  BancadaRow,
} from '../services/api';
import ProductRow, { Product } from '../components/ProductRow';
import BancadaRowComponent from '../components/BancadaRow';
import Button from '../components/Button';
import OperationContextHeader from '../components/OperationContextHeader';
import { formatCurrency, formatDateTime } from '../utils/format';
import { sum } from '../utils/calculate';
import { useResponsive } from '../hooks/useResponsive';
import { sortByCatalogOrder } from '../utils/productOrder';
import BymenLoader from '../components/BymenLoader';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'CriarMedicao'>;

const MEDICAO_EXCLUDED_NAME_PATTERNS = ['esfoliante', 'leave-in', 'leave in', 'grooming'];
const MEDICAO_AVG_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function getMedicaoAvgCacheKey(clientId: string) {
  return `medicao_avg_sales:${clientId}`;
}

function shouldExcludeFromMedicao(name: string) {
  const normalized = String(name || '').toLowerCase();
  return MEDICAO_EXCLUDED_NAME_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export default function CriarMedicaoScreen({ navigation, route }: Props) {
  const [bonusOpen, setBonusOpen] = useState(false);
  const clientId = route.params?.clientId;
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [bancadaCatalog, setBancadaCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [averageSalesByProduct, setAverageSalesByProduct] = useState<Record<string, number>>({});

  // ========================================
  // NAVEGAÇÃO POR ABAS
  // ========================================
  const [activeTab, setActiveTab] = useState<'medicao' | 'bancada'>('medicao');

  // ========================================
  // ESTADO: ABA MEDIÇÃO (produtos vendidos)
  // ========================================
  const [medicaoRows, setMedicaoRows] = useState<Record<string, MedicaoRow>>({});

  // ========================================
  // ESTADO: ABA BANCADA (uso interno)
  // ========================================
  const [bancadaRows, setBancadaRows] = useState<Record<string, BancadaRow>>({});

  // ========================================
  // ESTADO: ABA BONIFICAÇÃO (produtos bônus)
  // ========================================
  const [bonusRows, setBonusRows] = useState<Record<string, BancadaRow>>({});

  const medicaoArray = useMemo(() => Object.values(medicaoRows), [medicaoRows]);

  // ======== NOVA LÓGICA DE ESTOQUE FINAL E PRODUTOS RETIRADOS ========
  // Calcula o estoque inicial, vendidos e repostos para todos produtos
  const estoqueInicial = useMemo(() => sum(products.map(p => p.estoque)), [products]);
  const produtosVendidos = useMemo(() => sum(medicaoArray.map(r => r.vendidos)), [medicaoArray]);
  const produtosRepostos = useMemo(() => sum(medicaoArray.map(r => r.repostos)), [medicaoArray]);
  const novoEstoqueCalculado = estoqueInicial - produtosRepostos + produtosVendidos;
  const [novoEstoqueFinal, setNovoEstoqueFinal] = useState<number>(novoEstoqueCalculado);
  // Soma dos produtos retirados de cada produto (campo produtosRetirados vindo do ProductRow)
  const produtosRetirados = useMemo(() => {
    return medicaoArray.reduce((acc, r) => acc + (typeof r.produtosRetirados === 'number' ? r.produtosRetirados : 0), 0);
  }, [medicaoArray]);
  const [erroRetirados, setErroRetirados] = useState<string | null>(null);

  useEffect(() => {
    setNovoEstoqueFinal(novoEstoqueCalculado); // Atualiza valor inicial ao recalcular
  }, [novoEstoqueCalculado]);

  useEffect(() => {
    if (produtosRetirados < 0) {
      setErroRetirados('Produtos Retirados não pode ser negativo.');
    } else {
      setErroRetirados(null);
    }
  }, [novoEstoqueFinal, novoEstoqueCalculado]);

  const dateTime = useMemo(() => formatDateTime(new Date()), []);
  const { isTablet, padding, fontSize } = useResponsive();

  function parseMeasurementDate(dateTimeValue: string): Date | null {
    const [datePart] = String(dateTimeValue || '').split(' ');
    const [d, m, y] = datePart.split('/');
    if (!d || !m || !y) return null;
    const day = Number(d);
    const month = Number(m) - 1;
    const year = Number(y);
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
    return new Date(year, month, day);
  }

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      const clients = await listClients();
      const c = clients.find((x) => x.id === clientId) || clients[0];
      if (!isActive) return;
      setClient(c);

      if (!c) {
        return;
      }

      setLoading(true);

      try {
        const [p, bancadaCatalogProducts] = await Promise.all([
          listProductsForClient(c.id),
          listBancadaProductsForConsignado(),
        ]);
        if (!isActive) return;

        const sortedProducts = sortByCatalogOrder(
          p.filter((prod) => !shouldExcludeFromMedicao(prod.nome)),
        );
        const sortedBancadaCatalog = sortByCatalogOrder(bancadaCatalogProducts);
        setProducts(sortedProducts);
        setBancadaCatalog(sortedBancadaCatalog);

        const medicaoInicial: Record<string, MedicaoRow> = {};
        sortedProducts.forEach((prod) => {
          medicaoInicial[prod.id] = {
            id: prod.id,
            nome: prod.nome,
            linha: prod.linha,
            cap: prod.cap,
            preco: prod.preco,
            precoSugestao: prod.precoSugestao,
            estoqueAtual: prod.estoque,
            vendidos: 0,
            repostos: 0,
            diferenca: prod.estoque,
            novoEstoque: prod.estoque,
            valorMedicao: 0,
            produtosRetirados: 0,
          };
        });
        setMedicaoRows(medicaoInicial);

        setLoading(false);

        // Hidrata com cache para mostrar sugestões instantaneamente na abertura.
        void (async () => {
          try {
            const cacheKey = getMedicaoAvgCacheKey(c.id);
            const cachedRaw = await AsyncStorage.getItem(cacheKey);
            const cached = cachedRaw ? JSON.parse(cachedRaw) : null;

            if (
              cached &&
              typeof cached.savedAt === 'number' &&
              cached.items &&
              typeof cached.items === 'object' &&
              Date.now() - cached.savedAt <= MEDICAO_AVG_CACHE_TTL_MS &&
              isActive
            ) {
              setAverageSalesByProduct(cached.items as Record<string, number>);
            }
          } catch {
            // Ignora cache inválido para não interromper o carregamento.
          }

          try {
            const measurements = await listMeasurements();
            if (!isActive) return;

            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            const productTotals: Record<string, number> = {};

            measurements
              .filter((m) => m.clientId === c.id)
              .forEach((m) => {
                const parsed = parseMeasurementDate(m.dateTime || '');
                if (!parsed || parsed < startDate) return;

                (m.medicaoRows || []).forEach((row: any) => {
                  productTotals[row.id] = (productTotals[row.id] || 0) + Number(row.vendidos || 0);
                });
              });

            const avgMap: Record<string, number> = {};
            sortedProducts.forEach((prod) => {
              avgMap[prod.id] = Number(((productTotals[prod.id] || 0) / 3).toFixed(1));
            });

            setAverageSalesByProduct(avgMap);

            const cacheKey = getMedicaoAvgCacheKey(c.id);
            await AsyncStorage.setItem(
              cacheKey,
              JSON.stringify({
                savedAt: Date.now(),
                items: avgMap,
              }),
            );
          } catch {
            // Mantém a tela fluida mesmo se a média histórica falhar.
          }
        })();
      } catch {
        if (!isActive) return;
        setLoading(false);
      }
    }

    loadData();

    return () => {
      isActive = false;
    };
  }, [clientId]);

  // ========================================
  // HANDLERS: ABA MEDIÇÃO
  // ========================================
  const handleMedicaoRowChange = useCallback((row: MedicaoRow) => {
    setMedicaoRows((prev) => {
      const current = prev[row.id];
      const same =
        current &&
        current.estoqueAtual === row.estoqueAtual &&
        current.vendidos === row.vendidos &&
        current.repostos === row.repostos &&
        current.diferenca === row.diferenca &&
        current.novoEstoque === row.novoEstoque &&
        current.valorMedicao === row.valorMedicao &&
        (current.produtosRetirados ?? 0) === (row.produtosRetirados ?? 0);

      if (same) {
        return prev;
      }

      return {
        ...prev,
        [row.id]: {
        id: row.id,
        nome: row.nome,
        linha: row.linha,
        cap: row.cap,
        preco: row.preco,
        precoSugestao: row.precoSugestao,
        estoqueAtual: row.estoqueAtual,
        vendidos: row.vendidos,
        repostos: row.repostos,
        diferenca: row.diferenca,
        novoEstoque: row.novoEstoque,
        valorMedicao: row.valorMedicao,
        produtosRetirados: row.produtosRetirados ?? 0
        }
      };
    });
  }, []);

  const valorMedicao = useMemo(() => sum(medicaoArray.map((r) => r.valorMedicao)), [medicaoArray]);

  // ========================================
  // HANDLERS: ABA BANCADA
  // ========================================
  const handleBancadaRowChange = useCallback((row: BancadaRow) => {
    setBancadaRows((prev) => {
      const current = prev[row.id];
      const same =
        current &&
        current.quantidadeComprada === row.quantidadeComprada &&
        current.valorTotal === row.valorTotal &&
        current.preco === row.preco &&
        current.faixaPrecoAplicada === row.faixaPrecoAplicada;

      if (same) return prev;
      return { ...prev, [row.id]: row };
    });
  }, []);

  const bancadaArray = useMemo(() => sortByCatalogOrder(Object.values(bancadaRows)), [bancadaRows]);
  const valorBancada = useMemo(() => sum(bancadaArray.map((r) => r.valorTotal)), [bancadaArray]);
  const bonusArray = useMemo(() => sortByCatalogOrder(Object.values(bonusRows)), [bonusRows]);
  const valorBonus = useMemo(() => sum(bonusArray.map((r) => r.valorTotal)), [bonusArray]);
  const bonusQuantidade = useMemo(
    () => bonusArray.reduce((acc, r) => acc + (r.quantidadeComprada || 0), 0),
    [bonusArray],
  );

  const bancadaProducts = useMemo(
    () => sortByCatalogOrder(bancadaCatalog.map((p) => ({ ...p, precoSugestao: p.precoSugestao ?? 0 }))),
    [bancadaCatalog],
  );

  const bonusProducts = useMemo(
    () =>
      sortByCatalogOrder(bancadaCatalog.map((p) => ({
        ...p,
        id: `${p.id}-bonus`,
        precoSugestao: p.precoSugestao ?? 0,
      }))),
    [bancadaCatalog],
  );

  // ========================================
  // HANDLER: ABA BONIFICAÇÃO
  // ========================================
  const handleBonusRowChange = useCallback((row: BancadaRow) => {
    setBonusRows((prev) => {
      const current = prev[row.id];
      const same =
        current &&
        current.quantidadeComprada === row.quantidadeComprada &&
        current.valorTotal === row.valorTotal &&
        current.preco === row.preco &&
        current.faixaPrecoAplicada === row.faixaPrecoAplicada;

      if (same) return prev;
      return { ...prev, [row.id]: row };
    });
  }, []);

  const renderBonusItem = useCallback(
    ({ item }: { item: typeof bonusProducts[number] }) => (
      <BancadaRowComponent product={item} onChange={handleBonusRowChange} hideValues={true} />
    ),
    [handleBonusRowChange],
  );

  // ========================================
  // TOTAL GERAL
  // ========================================
  const totalGeral = useMemo(() => valorMedicao + valorBancada, [valorMedicao, valorBancada]);

  const handleCreateMedicao = useCallback(() => {
    navigation.navigate('FinalizarMedicao', {
      clientId: client?.id || '',
      medicaoRows: medicaoArray,
      bancadaRows: bancadaArray,
      bonusRows: bonusArray,
      valorMedicao,
      valorBancada,
      totalGeral,
      dateTime,
    });
  }, [navigation, client?.id, medicaoArray, bancadaArray, bonusArray, valorMedicao, valorBancada, totalGeral, dateTime]);

  const renderMedicaoItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductRow
        product={item}
        onChange={handleMedicaoRowChange}
        initialEstoque={item.estoque}
        averageSale3Months={averageSalesByProduct[item.id] ?? 0}
      />
    ),
    [averageSalesByProduct, handleMedicaoRowChange],
  );

  const renderBancadaItem = useCallback(
    ({ item }: { item: typeof bancadaProducts[number] }) => (
      <BancadaRowComponent product={item} onChange={handleBancadaRowChange} />
    ),
    [handleBancadaRowChange],
  );

  const medicaoFooter = useMemo(
    () => (
      <>
        <View
          style={{
            backgroundColor: '#DBEAFE',
            borderRadius: isTablet ? 12 : 8,
            padding: isTablet ? 16 : 12,
            marginTop: isTablet ? 12 : 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#1E40AF' }}>Valor Medição:</Text>
          <Text style={{ fontSize: fontSize.large, fontWeight: '700', color: '#1E40AF' }}>
            {formatCurrency(valorMedicao)}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: '#F9FAFB',
            borderRadius: isTablet ? 16 : 12,
            padding: isTablet ? 24 : 16,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            marginTop: isTablet ? 16 : 12,
            marginBottom: isTablet ? 16 : 12
          }}
        >
          <Text style={{ fontSize: fontSize.base, color: '#6B7280', marginBottom: 4 }}>
            Medição: {formatCurrency(valorMedicao)}
          </Text>
          <Text style={{ fontSize: fontSize.base, color: '#6B7280', marginBottom: 8 }}>
            Bancada: {formatCurrency(valorBancada)}
          </Text>
          {bonusQuantidade > 0 && (
            <Text style={{ fontSize: fontSize.base, color: '#059669', marginBottom: 8 }}>
              Bonificação: {bonusQuantidade} produtos
            </Text>
          )}
          <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8 }}>
            <Text style={{ fontSize: fontSize.large, fontWeight: '600', color: '#111827' }}>Valor Total Geral</Text>
            <Text style={{ color: '#111827', fontSize: fontSize.xlarge, marginTop: 4, fontWeight: '700' }}>
              {formatCurrency(totalGeral)}
            </Text>
          </View>
        </View>

        <Button title="Criar Medição" onPress={handleCreateMedicao} />
      </>
    ),
    [isTablet, fontSize, valorMedicao, valorBancada, bonusQuantidade, totalGeral, handleCreateMedicao],
  );

  const bancadaFooter = useMemo(
    () => (
      <>
        <View
          style={{
            backgroundColor: '#FEE2E2',
            borderRadius: isTablet ? 12 : 8,
            padding: isTablet ? 16 : 12,
            marginTop: isTablet ? 12 : 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#991B1B' }}>Valor Bancada:</Text>
          <Text style={{ fontSize: fontSize.large, fontWeight: '700', color: '#991B1B' }}>
            {formatCurrency(valorBancada)}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: '#F9FAFB',
            borderRadius: isTablet ? 16 : 12,
            padding: isTablet ? 24 : 16,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            marginTop: isTablet ? 16 : 12,
            marginBottom: isTablet ? 16 : 12
          }}
        >
          <Text style={{ fontSize: fontSize.base, color: '#6B7280', marginBottom: 4 }}>
            Medição: {formatCurrency(valorMedicao)}
          </Text>
          <Text style={{ fontSize: fontSize.base, color: '#6B7280', marginBottom: 8 }}>
            Bancada: {formatCurrency(valorBancada)}
          </Text>
          {bonusQuantidade > 0 && (
            <Text style={{ fontSize: fontSize.base, color: '#059669', marginBottom: 8 }}>
              Bonificação: {bonusQuantidade} produtos
            </Text>
          )}
          <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8 }}>
            <Text style={{ fontSize: fontSize.large, fontWeight: '600', color: '#111827' }}>Valor Total Geral</Text>
            <Text style={{ color: '#111827', fontSize: fontSize.xlarge, marginTop: 4, fontWeight: '700' }}>
              {formatCurrency(totalGeral)}
            </Text>
          </View>
        </View>

        <Button title="Criar Medição" onPress={handleCreateMedicao} />
      </>
    ),
    [
      isTablet,
      fontSize,
      valorBancada,
      bonusQuantidade,
      valorMedicao,
      totalGeral,
      handleCreateMedicao,
    ],
  );

  const bonusSection = useMemo(
    () => (
      <View style={{ paddingHorizontal: padding }}>
        <View style={{ marginBottom: isTablet ? 10 : 8 }}>
          <Pressable
            onPress={() => setBonusOpen((open) => !open)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#D1FAE5',
              borderRadius: isTablet ? 12 : 8,
              padding: isTablet ? 16 : 12,
            }}
          >
            <Text style={{ fontSize: fontSize.base, color: '#059669', fontWeight: '700' }}>Bonificação</Text>
            <Text style={{ color: '#059669', fontWeight: '700', fontSize: fontSize.base }}>
              {bonusOpen ? '▲' : '▼'}
            </Text>
          </Pressable>
        </View>

        {bonusOpen && (
          <>
            <FlatList
              data={bonusProducts}
              keyExtractor={(item) => item.id}
              renderItem={renderBonusItem}
              scrollEnabled={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={2}
              maxToRenderPerBatch={2}
              windowSize={2}
              removeClippedSubviews={false}
            />

            <View
              style={{
                backgroundColor: '#D1FAE5',
                borderRadius: isTablet ? 12 : 8,
                padding: isTablet ? 16 : 12,
                marginTop: isTablet ? 12 : 8,
                marginBottom: isTablet ? 8 : 6,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#059669' }}>
                Quantidade Bonificada:
              </Text>
              <Text style={{ fontSize: fontSize.large, fontWeight: '700', color: '#059669' }}>{bonusQuantidade}</Text>
            </View>
          </>
        )}
      </View>
    ),
    [padding, isTablet, fontSize, bonusOpen, bonusProducts, renderBonusItem, bonusQuantidade],
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
      >
      {/* HEADER */}
      <View style={{ padding, paddingBottom: 0 }}>
        <OperationContextHeader
          title="Medição de Cliente"
          subtitle="Preencha vendas, reposições e itens de bancada"
          statusLabel="Operação em andamento"
        />
        <Text style={{ fontSize: fontSize.large, fontWeight: '700', color: '#111827', marginBottom: isTablet ? 8 : 6 }}>
          Cliente: {client?.nome || 'Carregando...'}
        </Text>
        <Text style={{ fontSize: fontSize.base, color: '#6B7280', marginBottom: isTablet ? 12 : 8 }}>Data: {dateTime}</Text>

        {/* ================================================ */}
        {/* NAVEGAÇÃO POR ABAS                              */}
        {/* ================================================ */}
        <View style={{ flexDirection: 'row', marginBottom: isTablet ? 16 : 12, gap: 8 }}>
          <Pressable
            onPress={() => setActiveTab('medicao')}
            style={{
              flex: 1,
              paddingVertical: isTablet ? 14 : 12,
              borderRadius: isTablet ? 12 : 8,
              backgroundColor: activeTab === 'medicao' ? '#3B82F6' : '#F3F4F6',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <Ionicons name="stats-chart-outline" size={20} color={activeTab === 'medicao' ? '#fff' : '#3B82F6'} style={{ marginRight: 4 }} />
            <Text
              style={{
                fontSize: fontSize.base,
                fontWeight: '700',
                color: activeTab === 'medicao' ? '#FFFFFF' : '#6B7280'
              }}
            >
              Medição
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('bancada')}
            style={{
              flex: 1,
              paddingVertical: isTablet ? 14 : 12,
              borderRadius: isTablet ? 12 : 8,
              backgroundColor: activeTab === 'bancada' ? '#DC2626' : '#F3F4F6',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <MaterialCommunityIcons name="table-furniture" size={18} color={activeTab === 'bancada' ? '#fff' : '#3B82F6'} style={{ marginRight: 4 }} />
            <Text
              style={{
                fontSize: fontSize.base,
                fontWeight: '700',
                color: activeTab === 'bancada' ? '#FFFFFF' : '#6B7280'
              }}
            >
              Bancada
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ================================================ */}
      {/* CONTEÚDO DAS ABAS                               */}
      {/* ================================================ */}
      <View style={{ flex: 1 }}>
        {activeTab === 'medicao' ? (
          <FlatList
            style={{ flex: 1 }}
            data={products}
            keyExtractor={(item) => item.id}
            renderItem={renderMedicaoItem}
            ListHeaderComponent={
              <>
                {loading ? <BymenLoader compact label="Carregando catálogo..." /> : null}
                <Text style={{ fontSize: fontSize.base, color: '#6B7280', marginBottom: isTablet ? 12 : 8 }}>
                  Produtos vendidos aos clientes finais
                </Text>
              </>
            }
            ListFooterComponent={medicaoFooter}
            contentContainerStyle={{ padding, paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={3}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={false}
            scrollEventThrottle={16}
          />
        ) : (
          <>
            {bonusSection}
            <FlatList
              style={{ flex: 1 }}
              data={bancadaProducts}
              keyExtractor={(item) => item.id}
              renderItem={renderBancadaItem}
              ListHeaderComponent={loading ? <BymenLoader compact label="Carregando bancada..." /> : null}
              ListFooterComponent={bancadaFooter}
              contentContainerStyle={{ padding, paddingBottom: 120 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              initialNumToRender={3}
              maxToRenderPerBatch={3}
              windowSize={3}
              updateCellsBatchingPeriod={50}
              removeClippedSubviews={false}
              scrollEventThrottle={16}
            />
          </>
        )}
      </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
