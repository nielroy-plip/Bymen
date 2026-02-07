import React, { useState } from 'react';
import { View, Text, ScrollView, Dimensions, Modal, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LineChart, BarChart } from 'react-native-chart-kit';

// Dados de homologação
const barbearias = [
  { id: '1', nome: 'Barbearia Elite' },
  { id: '2', nome: 'Barbearia Cental' },
  { id: '3', nome: 'Barbearia da Praça' },
   { id: '4', nome: 'Barbearia Premium' }
];

const vendasPorBarbearia: Record<string, number[]> = {
  '1': [1200, 1500, 1100, 1800, 2000, 1700, 2100, 2300, 1900, 2500, 2200, 2400],
  '2': [900, 1100, 950, 1200, 1300, 1250, 1400, 1600, 1500, 1700, 1650, 1800],
  '3': [600, 700, 800, 900, 950, 1000, 1100, 1200, 1150, 1300, 1250, 1400],
  '4': [1000, 1100, 1050, 1150, 1200, 1250, 1300, 1350, 1400, 1450, 1500, 1550],
};

const vendasPorMes = (barbeariaId: string) => ({
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  datasets: [
    {
      data: vendasPorBarbearia[barbeariaId],
      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // azul
      strokeWidth: 3
    }
  ],
});

const allProdutos = ['Shampoo', 'Condicionador', 'Pomada', 'Óleo', 'Pó Modelador'];
const allEstoque = [80, 60, 40, 30, 20];

const screenWidth = Dimensions.get('window').width;
const isSmallScreen = screenWidth < 400;

export default function RelatoriosScreen() {
  const [barbeariaId, setBarbeariaId] = useState<'1' | '2' | '3' | '4'>('1');
  const [modalVisible, setModalVisible] = useState(false);
  const [periodo, setPeriodo] = useState<'12m' | '6m' | '3m'>('12m');
  const [produtoFiltro, setProdutoFiltro] = useState<string>('Todos');
  const [detalheModal, setDetalheModal] = useState<{visible: boolean, label?: string, valor?: number}>({visible: false});
  // Feedback visual para modal
  const [modalOpening, setModalOpening] = useState(false);
  // Filtro de período para vendas
  const periodos = [
    { label: 'Últimos 12 meses', value: '12m' },
    { label: 'Últimos 6 meses', value: '6m' },
    { label: 'Últimos 3 meses', value: '3m' },
  ];
  // Filtro de produto para estoque
  const produtosFiltro = ['Todos', ...allProdutos];

  // Dados filtrados para gráfico de vendas
  const vendasData = vendasPorBarbearia[barbeariaId];
  let vendasFiltradas = vendasData;
  let labelsFiltradas = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  if (periodo === '6m') {
    vendasFiltradas = vendasData.slice(-6);
    labelsFiltradas = labelsFiltradas.slice(-6);
  } else if (periodo === '3m') {
    vendasFiltradas = vendasData.slice(-3);
    labelsFiltradas = labelsFiltradas.slice(-3);
  }
  const vendasPorMesFiltrado = {
    labels: labelsFiltradas,
    datasets: [
      {
        data: vendasFiltradas,
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 3
      }
    ],
  };

  // Dados filtrados para gráfico de estoque
  let estoqueLabels = allProdutos;
  let estoqueData = allEstoque;
  if (produtoFiltro !== 'Todos') {
    const idx = allProdutos.indexOf(produtoFiltro);
    estoqueLabels = [produtoFiltro];
    estoqueData = [allEstoque[idx]];
  }
  const estoqueProdutos = {
    labels: estoqueLabels,
    datasets: [
      { data: estoqueData },
    ],
  };

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
          <Text style={{ fontSize: isSmallScreen ? 14 : 17, color: '#111827', fontWeight: '600' }}>{barbearias.find(b => b.id === barbeariaId)?.nome}</Text>
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
                    setBarbeariaId(b.id as '1' | '2' | '3' | '4');
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
              <Text style={{ fontSize: 15, color: '#2563EB', fontWeight: '500' }}> — {barbearias.find(b => b.id === barbeariaId)?.nome}</Text>
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
            onPress: () => setDetalheModal({ visible: true, label: labelsFiltradas[index], valor: value }),
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
              Estoque de Produtos
              <Text style={{ fontSize: 15, color: '#B91C1C', fontWeight: '500' }}> — {barbearias.find(b => b.id === barbeariaId)?.nome}</Text>
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
        <BarChart
          data={estoqueProdutos}
          width={screenWidth - (isSmallScreen ? 16 : 48)}
          height={isSmallScreen ? 160 : 220}
          yAxisLabel={''}
          yAxisSuffix={''}
          chartConfig={{
            backgroundColor: '#FEF2F2',
            backgroundGradientFrom: '#FEF2F2',
            backgroundGradientTo: '#FEF2F2',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(220, 38, 38, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(153, 27, 27, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          style={{ borderRadius: 16 }}
          withCustomBarColorFromData={false}
          showBarTops={true}
        />
      </View>

      <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>
        * Dados fictícios para homologação. Gráficos responsivos e prontos para tablets e celulares.
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
