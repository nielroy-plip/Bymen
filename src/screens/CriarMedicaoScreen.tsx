import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import { Client } from '../data/clients';
import { listProductsForClient, listClients, MedicaoRow, BancadaRow } from '../services/api';
import { PRODUTOS_BANCADA } from '../data/products';
import ProductRow, { Product } from '../components/ProductRow';
import BancadaRowComponent from '../components/BancadaRow';
import Button from '../components/Button';
import { formatCurrency, formatDateTime } from '../utils/format';
import { sum } from '../utils/calculate';
import { useResponsive } from '../hooks/useResponsive';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'CriarMedicao'>;

export default function CriarMedicaoScreen({ navigation, route }: Props) {
  const [bonusOpen, setBonusOpen] = useState(false);
  const clientId = route.params?.clientId;
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    listClients().then((clients) => {
      const c = clients.find((x) => x.id === clientId) || clients[0];
      setClient(c);
      if (c) {
        setLoading(true);
        listProductsForClient(c.id)
          .then((p) => {
            setProducts(p);
            // Preenche os campos de medição com valores de exemplo
            const medicaoInicial: Record<string, MedicaoRow> = {};
            p.forEach((prod) => {
              medicaoInicial[prod.id] = {
                id: prod.id,
                nome: prod.nome,
                linha: prod.linha,
                cap: prod.cap,
                preco: prod.preco,
                precoSugestao: prod.precoSugestao,
                estoqueAtual: prod.estoque,
                vendidos: 2, // valor baixo de exemplo
                repostos: 0,
                diferenca: 2, // vendido - reposto
                novoEstoque: prod.estoque - 2,
                valorMedicao: prod.preco * 2,
                produtosRetirados: 0
              };
            });
            setMedicaoRows(medicaoInicial);
          })
          .finally(() => setLoading(false));
      }
    });
  }, [clientId]);

  // ========================================
  // HANDLERS: ABA MEDIÇÃO
  // ========================================
  const handleMedicaoRowChange = useCallback((row: MedicaoRow) => {
    setMedicaoRows((prev) => ({
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
    }));
  }, []);

  const valorMedicao = useMemo(() => sum(medicaoArray.map((r) => r.valorMedicao)), [medicaoArray]);

  // ========================================
  // HANDLERS: ABA BANCADA
  // ========================================
  const handleBancadaRowChange = useCallback((row: BancadaRow) => {
    setBancadaRows((prev) => ({ ...prev, [row.id]: row }));
  }, []);

  const bancadaArray = useMemo(() => Object.values(bancadaRows), [bancadaRows]);
  const valorBancada = useMemo(() => sum(bancadaArray.map((r) => r.valorTotal)), [bancadaArray]);
  const bonusArray = useMemo(() => Object.values(bonusRows), [bonusRows]);
  const valorBonus = useMemo(() => sum(bonusArray.map((r) => r.valorTotal)), [bonusArray]);

  // ========================================
  // HANDLER: ABA BONIFICAÇÃO
  // ========================================
  const handleBonusRowChange = useCallback((row: BancadaRow) => {
    setBonusRows((prev) => ({ ...prev, [row.id]: row }));
  }, []);

  // ========================================
  // TOTAL GERAL
  // ========================================
  const totalGeral = useMemo(() => valorMedicao + valorBancada, [valorMedicao, valorBancada]);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* HEADER */}
      <View style={{ padding, paddingBottom: 0 }}>
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
            <Ionicons name="construct-outline" size={20} color={activeTab === 'bancada' ? '#fff' : '#DC2626'} style={{ marginRight: 4 }} />
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
      <ScrollView contentContainerStyle={{ padding }}>
        {loading ? <ActivityIndicator /> : null}

        {/* ABA: MEDIÇÃO */}
        {activeTab === 'medicao' && (
          <View>
            <Text style={{ fontSize: fontSize.base, color: '#6B7280', marginBottom: isTablet ? 12 : 8 }}>
              Produtos vendidos aos clientes finais
            </Text>
            {products.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                onChange={handleMedicaoRowChange}
                initialEstoque={p.estoque}
                initialVendidos={medicaoRows[p.id]?.vendidos ?? 0}
                initialRepostos={medicaoRows[p.id]?.repostos ?? 0}
              />
            ))}

            {/* Valor Medição */}
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
          </View>
        )}

        {/* ABA: BANCADA */}
        {activeTab === 'bancada' && (
          <View>
            <Text style={{ fontSize: fontSize.base, color: '#6B7280', marginBottom: isTablet ? 12 : 8 }}>
              Produtos para uso interno do barbeiro (não vendidos ao cliente)
            </Text>
            {PRODUTOS_BANCADA.map((p) => (
              <BancadaRowComponent
                key={p.id}
                product={{ ...p, precoSugestao: p.precoSugestao ?? 0 }}
                onChange={handleBancadaRowChange}
              />
            ))}
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

            {/* Seção de Bonificação Expandível */}
            <View style={{ marginTop: isTablet ? 24 : 16 }}>
              <Pressable
                onPress={() => setBonusOpen((open) => !open)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#D1FAE5',
                  borderRadius: isTablet ? 12 : 8,
                  padding: isTablet ? 16 : 12,
                  marginBottom: isTablet ? 8 : 6
                }}
              >
                <Text style={{ fontSize: fontSize.base, color: '#059669', fontWeight: '700' }}>
                  Bonificação
                </Text>
                <Text style={{ color: '#059669', fontWeight: '700', fontSize: fontSize.base }}>
                  {bonusOpen ? '▲' : '▼'}
                </Text>
              </Pressable>
              {bonusOpen && (
                <View>
                  {PRODUTOS_BANCADA.map((p) => (
                    <BancadaRowComponent
                      key={p.id + '-bonus'}
                      product={{ ...p, id: p.id + '-bonus', precoSugestao: p.precoSugestao ?? 0 }}
                      onChange={handleBonusRowChange}
                      hideValues={true}
                    />
                  ))}
                  <View
                    style={{
                      backgroundColor: '#D1FAE5',
                      borderRadius: isTablet ? 12 : 8,
                      padding: isTablet ? 16 : 12,
                      marginTop: isTablet ? 12 : 8,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#059669' }}>
                      Quantidade Bonificada:
                    </Text>
                    <Text style={{ fontSize: fontSize.large, fontWeight: '700', color: '#059669' }}>
                      {bonusArray.reduce((acc, r) => acc + (r.quantidadeComprada || 0), 0)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}


        {/* ================================================ */}
        {/* TOTAL GERAL                                     */}
        {/* ================================================ */}
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
          {/* Bonificação só aparece se houver produtos bonificados */}
          {bonusArray.reduce((acc, r) => acc + (r.quantidadeComprada || 0), 0) > 0 && (
            <Text style={{ fontSize: fontSize.base, color: '#059669', marginBottom: 8 }}>
              Bonificação: {bonusArray.reduce((acc, r) => acc + (r.quantidadeComprada || 0), 0)} produtos
            </Text>
          )}
          <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8 }}>
            <Text style={{ fontSize: fontSize.large, fontWeight: '600', color: '#111827' }}>Valor Total Geral</Text>
            <Text style={{ color: '#111827', fontSize: fontSize.xlarge, marginTop: 4, fontWeight: '700' }}>
              {formatCurrency(totalGeral)}
            </Text>
          </View>
        </View>

        {/* Botão: Finalizar Medição */}
        <Button
          title="Finalizar Medição"
          onPress={() =>
            navigation.navigate('FinalizarMedicao', {
              clientId: client?.id || '',
              medicaoRows: medicaoArray,
              bancadaRows: bancadaArray,
              bonusRows: bonusArray,
              valorMedicao,
              valorBancada,
              totalGeral,
              dateTime
            })
          }
        />
      </ScrollView>
    </View>
  );
}
