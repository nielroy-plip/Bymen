import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Button from '../components/Button';
import { listMeasurements, listClients, Measurement } from '../services/api';
import { Client } from '../data/clients';
import { formatCurrency } from '../utils/format';
import { sharePdf } from '../services/whatsapp';
// import { generateMeasurementPDF } from '../services/pdf';

type Props = NativeStackScreenProps<RootStackParamList, 'HistoricoMedicoes'>;

// Dados mockados para demonstração do filtro
const MOCK_MEASUREMENTS: Measurement[] = [
  // Janeiro 2026
  {
    id: 'mock-1',
    clientId: 'barbearia-elite',
    dateTime: '15/01/2026 14:30',
    medicaoRows: [
      { id: 'p1', nome: 'Shampoo', linha: 'Wood', cap: 240, preco: 39.9, precoSugestao: 69.9, estoqueAtual: 50, vendidos: 20, repostos: 10, diferenca: 30, novoEstoque: 40, valorMedicao: 798 }
    ],
    bancadaRows: [
      { id: 'b1', nome: 'Shampoo', linha: 'Wood', cap: 1000, preco: 89.9, quantidadeComprada: 2, valorTotal: 179.8 }
    ],
    valorMedicao: 798,
    valorBancada: 179.8,
    totalGeral: 977.8
  },
  {
    id: 'mock-2',
    clientId: 'barbearia-style',
    dateTime: '22/01/2026 10:00',
    medicaoRows: [
      { id: 'p2', nome: 'Condicionador', linha: 'Wood', cap: 140, preco: 34.9, precoSugestao: 59.9, estoqueAtual: 30, vendidos: 15, repostos: 5, diferenca: 15, novoEstoque: 20, valorMedicao: 523.5 }
    ],
    bancadaRows: [],
    valorMedicao: 523.5,
    valorBancada: 0,
    totalGeral: 523.5
  },
  // Dezembro 2025
  {
    id: 'mock-3',
    clientId: 'barbearia-elite',
    dateTime: '10/12/2025 16:00',
    medicaoRows: [
      { id: 'p1', nome: 'Shampoo', linha: 'Wood', cap: 240, preco: 39.9, precoSugestao: 69.9, estoqueAtual: 60, vendidos: 25, repostos: 15, diferenca: 35, novoEstoque: 50, valorMedicao: 997.5 }
    ],
    bancadaRows: [],
    valorMedicao: 997.5,
    valorBancada: 0,
    totalGeral: 997.5
  },
  {
    id: 'mock-4',
    clientId: 'barbearia-style',
    dateTime: '18/12/2025 11:30',
    medicaoRows: [
      { id: 'p3', nome: 'Energizador', linha: 'Ocean', cap: 140, preco: 44.9, precoSugestao: 74.9, estoqueAtual: 40, vendidos: 18, repostos: 8, diferenca: 22, novoEstoque: 30, valorMedicao: 808.2 }
    ],
    bancadaRows: [
      { id: 'b2', nome: 'Gel de Barbear', linha: 'Wood', cap: 1000, preco: 94.9, quantidadeComprada: 1, valorTotal: 94.9 }
    ],
    valorMedicao: 808.2,
    valorBancada: 94.9,
    totalGeral: 903.1
  },
  // Novembro 2025
  {
    id: 'mock-5',
    clientId: 'barbearia-elite',
    dateTime: '20/11/2025 10:15',
    medicaoRows: [
      { id: 'p4', nome: 'Balm de Barba', linha: 'Wood', cap: 140, preco: 49.9, precoSugestao: 79.9, estoqueAtual: 35, vendidos: 12, repostos: 7, diferenca: 23, novoEstoque: 30, valorMedicao: 598.8 }
    ],
    bancadaRows: [],
    valorMedicao: 598.8,
    valorBancada: 0,
    totalGeral: 598.8
  },
  // Outubro 2025
  {
    id: 'mock-6',
    clientId: 'barbearia-style',
    dateTime: '05/10/2025 13:45',
    medicaoRows: [
      { id: 'p6', nome: 'Óleo de Barba', linha: 'Wood', cap: 30, preco: 54.9, precoSugestao: 89.9, estoqueAtual: 25, vendidos: 10, repostos: 5, diferenca: 15, novoEstoque: 20, valorMedicao: 549 }
    ],
    bancadaRows: [],
    valorMedicao: 549,
    valorBancada: 0,
    totalGeral: 549
  },
  {
    id: 'mock-7',
    clientId: 'barbearia-elite',
    dateTime: '28/10/2025 15:20',
    medicaoRows: [
      { id: 'p8', nome: 'Pomada Efeito Matte', linha: 'Wood', cap: 100, preco: 59.9, precoSugestao: 89.9, estoqueAtual: 30, vendidos: 8, repostos: 4, diferenca: 22, novoEstoque: 26, valorMedicao: 479.2 }
    ],
    bancadaRows: [
      { id: 'b3', nome: 'Condicionador', linha: 'Wood', cap: 500, preco: 64.9, quantidadeComprada: 1, valorTotal: 64.9 }
    ],
    valorMedicao: 479.2,
    valorBancada: 64.9,
    totalGeral: 544.1
  }
];

export default function HistoricoMedicoesScreen({ navigation }: Props) {
  const [items, setItems] = useState<Measurement[]>(MOCK_MEASUREMENTS);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  useEffect(() => {
    listClients().then((c) => setClients(c));
  }, []);

  // Agrupar medições por mês/ano
  const monthGroups = useMemo(() => {
    const groups: Record<string, Measurement[]> = {};
    
    items.forEach((item) => {
      // Converter data brasileira (dd/mm/yyyy) para formato parseável
      const [datePart] = item.dateTime.split(' ');
      const [day, month, year] = datePart.split('/');
      const monthKey = `${year}-${month.padStart(2, '0')}`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(item);
    });
    
    return groups;
  }, [items]);

  // Obter lista de meses ordenados (mais recente primeiro)
  const availableMonths = useMemo(() => {
    return Object.keys(monthGroups).sort((a, b) => b.localeCompare(a));
  }, [monthGroups]);

  // Definir mês padrão como o mais recente
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // Formatar mês para exibição
  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  // Medições filtradas pelo mês selecionado
  const filteredItems = useMemo(() => {
    return selectedMonth ? (monthGroups[selectedMonth] || []) : items;
  }, [selectedMonth, monthGroups, items]);

  async function handleEnviar(id: string) {
    // Removido: geração e envio de PDF de medição
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Histórico de Medições</Text>
        
        {/* Filtro por mês */}
        {availableMonths.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>Filtrar por mês:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {availableMonths.map((month) => {
                const isSelected = month === selectedMonth;
                const count = monthGroups[month].length;
                return (
                  <Pressable
                    key={month}
                    onPress={() => setSelectedMonth(month)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: isSelected ? '#3B82F6' : '#F3F4F6',
                      borderWidth: isSelected ? 0 : 1,
                      borderColor: '#E5E7EB'
                    }}
                  >
                    <Text style={{ color: isSelected ? '#FFFFFF' : '#111827', fontWeight: isSelected ? '700' : '500', fontSize: 14 }}>
                      {formatMonth(month)}
                    </Text>
                    <Text style={{ color: isSelected ? '#DBEAFE' : '#6B7280', fontSize: 12, textAlign: 'center', marginTop: 2 }}>
                      {count} {count === 1 ? 'medição' : 'medições'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Lista de medições */}
        {filteredItems.length === 0 ? (
          <Text style={{ color: '#6B7280', textAlign: 'center', marginTop: 16, fontStyle: 'italic' }}>
            {availableMonths.length === 0 ? 'Sem medições salvas' : 'Nenhuma medição neste mês'}
          </Text>
        ) : (
          filteredItems.map((it) => {
            const client = clients.find((c) => c.id === it.clientId);
            return (
              <View key={it.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                <Text style={{ color: '#111827', fontWeight: '600' }}>{client?.nome || 'Cliente não encontrado'}</Text>
                <Text style={{ color: '#6B7280' }}>{it.dateTime}</Text>
                <Text style={{ color: '#111827' }}>{formatCurrency(it.totalGeral || 0).replace('.', ',')}</Text>
                <View style={{ height: 8 }} />
                <Button
                  title="Reabrir"
                  onPress={() =>
                    navigation.navigate('FinalizarMedicao', {
                      clientId: it.clientId,
                      medicaoRows: it.medicaoRows || [],
                      bancadaRows: it.bancadaRows || [],
                      valorMedicao: it.valorMedicao || 0,
                      valorBancada: it.valorBancada || 0,
                      totalGeral: it.totalGeral || 0,
                      dateTime: it.dateTime,
                      responsavel: it.responsavel,
                      signatureDataUrl: it.signatureDataUrl
                    })
                  }
                />
                <View style={{ height: 8 }} />
                <Button title="Enviar PDF" onPress={() => handleEnviar(it.id)} variant="secondary" />
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
