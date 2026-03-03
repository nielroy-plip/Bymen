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

export default function HistoricoMedicoesScreen({ navigation }: Props) {
  const [items, setItems] = useState<Measurement[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  useEffect(() => {
    async function load() {
      const [savedMeasurements, savedClients] = await Promise.all([
        listMeasurements(),
        listClients(),
      ]);
      setClients(savedClients);
      setItems(savedMeasurements);
    }

    load();
  }, []);

  function getStatusLabel(status?: string) {
    if (status === 'SIGNED') return 'Assinada';
    if (status === 'FINALIZED') return 'Finalizada';
    return 'Rascunho';
  }

  function getStatusStyle(status?: string) {
    if (status === 'SIGNED') {
      return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' };
    }
    if (status === 'FINALIZED') {
      return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
    }
    return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
  }

  function getSyncLabel(syncStatus?: string) {
    if (syncStatus === 'SYNCED') return 'Sincronizada';
    if (syncStatus === 'FAILED') return 'Falhou';
    return 'Pendente';
  }

  function getSyncStyle(syncStatus?: string) {
    if (syncStatus === 'SYNCED') {
      return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' };
    }
    if (syncStatus === 'FAILED') {
      return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' };
    }
    return { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' };
  }

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
            const clientDisplayName = client?.nome || it.clientName || 'Barbearia não encontrada';
            const statusStyle = getStatusStyle(it.status);
            const syncStyle = getSyncStyle(it.syncStatus);
            const timeline = Array.isArray(it.timeline) ? it.timeline : [];
            const lastEvent = timeline.length ? timeline[timeline.length - 1] : null;

            return (
              <View key={it.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                <Text style={{ color: '#111827', fontWeight: '600' }}>{clientDisplayName}</Text>
                <Text style={{ color: '#6B7280' }}>{it.dateTime}</Text>
                <Text style={{ color: '#111827' }}>{formatCurrency(it.totalGeral || 0).replace('.', ',')}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: statusStyle.bg,
                      borderWidth: 1,
                      borderColor: statusStyle.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: statusStyle.text }}>{getStatusLabel(it.status)}</Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: syncStyle.bg,
                      borderWidth: 1,
                      borderColor: syncStyle.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: syncStyle.text }}>{getSyncLabel(it.syncStatus)}</Text>
                  </View>
                </View>
                {!!lastEvent && (
                  <Text style={{ color: '#6B7280', marginTop: 6, fontSize: 12 }}>
                    Último evento: {lastEvent.message}
                  </Text>
                )}
                <View style={{ height: 8 }} />
                <Button
                  title="Reabrir"
                  onPress={() =>
                    navigation.navigate('FinalizarMedicao', {
                      clientId: it.clientId,
                      medicaoRows: it.medicaoRows || [],
                      bancadaRows: it.bancadaRows || [],
                      bonusRows: it.bonusRows || [],
                      valorMedicao: it.valorMedicao || 0,
                      valorBancada: it.valorBancada || 0,
                      totalGeral: it.totalGeral || 0,
                      dateTime: it.dateTime,
                      responsavel: it.responsavel,
                      observacoes: it.observacoes,
                      pagamentoPix: it.pagamentoPix,
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
