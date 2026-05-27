import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Button from '../components/Button';
import { listMeasurements, listClients, listSales, Measurement, Sale } from '../services/api';
import { Client } from '../data/clients';
import { formatCurrency } from '../utils/format';
import { generateMeasurementPDF, generateSalePDF } from '../services/pdf';
import { sharePdf } from '../services/whatsapp';

type Props = NativeStackScreenProps<RootStackParamList, 'HistoricoMedicoes'>;

export default function HistoricoMedicoesScreen({ navigation }: Props) {
  const [items, setItems] = useState<Measurement[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  useEffect(() => {
    async function load() {
      const [savedMeasurements, savedSales, savedClients] = await Promise.all([
        listMeasurements(),
        listSales(),
        listClients(),
      ]);
      setClients(savedClients);
      setItems(savedMeasurements);
      setSales(savedSales);
    }

    load();
  }, []);

  function getPaymentLabel(method?: string) {
    if (method === 'PIX') return 'PIX';
    if (method === 'DINHEIRO') return 'Dinheiro';
    if (method === 'CARTAO') return 'Cartão';
    if (method === 'BOLETO') return 'Boleto';
    return 'Não informado';
  }

  function hasCashDiscount(method?: string) {
    return method === 'PIX' || method === 'DINHEIRO';
  }

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

  const historyItems = useMemo(() => {
    const measurementItems = items.map((m) => ({
      type: 'MEDICAO' as const,
      id: m.id,
      clientId: m.clientId,
      clientName: m.clientName,
      dateTime: m.dateTime,
      total: Number(m.totalGeral || 0),
      measurement: m,
    }));

    const saleItems = sales.map((s) => ({
      type: 'VENDA' as const,
      id: s.id,
      clientId: s.clientId,
      clientName: s.clientName,
      dateTime: s.dateTime,
      total: Number(s.total || 0),
      sale: s,
    }));

    return [...measurementItems, ...saleItems].sort((a, b) => {
      const [ad, am, ay] = String(a.dateTime || '').split(' ')[0]?.split('/') || [];
      const [bd, bm, by] = String(b.dateTime || '').split(' ')[0]?.split('/') || [];
      const at = new Date(Number(ay), Number(am) - 1, Number(ad)).getTime();
      const bt = new Date(Number(by), Number(bm) - 1, Number(bd)).getTime();
      return bt - at;
    });
  }, [items, sales]);

  // Agrupar histórico por mês/ano
  const monthGroups = useMemo(() => {
    const groups: Record<string, typeof historyItems> = {};
    
    historyItems.forEach((item) => {
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
  }, [historyItems]);

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
    return selectedMonth ? (monthGroups[selectedMonth] || []) : historyItems;
  }, [selectedMonth, monthGroups, historyItems]);

  async function handleEnviar(item: (typeof historyItems)[number]) {
    try {
      if (item.type === 'VENDA') {
        const sale = item.sale;
        if (!sale) {
          Alert.alert('Venda inválida', 'Não foi possível gerar o PDF desta venda.');
          return;
        }

        const pdfUri = await generateSalePDF({
          clientName: sale.clientName || clients.find((c) => c.id === sale.clientId)?.nome || 'Barbearia',
          dateTime: sale.dateTime,
          items: sale.items || [],
          subtotal: Number(sale.subtotal || sale.total || 0),
          total: Number(sale.total || 0),
          paymentMethod: sale.paymentMethod || 'PIX',
          pixDiscountPercent: Number(sale.pixDiscountPercent || 0),
          pixDiscountValue: Number(sale.pixDiscountValue || 0),
          responsavelVenda: sale.responsavel,
          observacoes: sale.observacoes,
          signatureDataUrl: sale.signatureDataUrl,
        });
        await sharePdf(pdfUri);
        return;
      }

      const m = item.measurement;
      if (!m) {
        Alert.alert('Medição inválida', 'Não foi possível gerar o PDF desta medição.');
        return;
      }

      const client = clients.find((c) => c.id === m.clientId);
      const pdfUri = await generateMeasurementPDF({
        client,
        totalGeral: Number(m.totalGeral || 0),
        dateTime: m.dateTime,
        bonusRows: m.bonusRows || [],
        valorBancada: Number(m.valorBancada || 0),
        bancadaRows: (m.bancadaRows || []).map((r: any) => ({
          ...r,
          quantidadeComprada: Number(r.quantidadeComprada || 0),
          valorTotal: Number(r.valorTotal || 0),
        })),
        valorMedicao: Number(m.valorMedicao || 0),
        pagamentoPix: m.pagamentoPix,
        paymentMethod: m.paymentMethod,
        medicaoRows: (m.medicaoRows || []).map((r: any) => ({
          ...r,
          quantidadeComprada: Number(r.estoqueAtual || 0),
          quantidadeVendida: Number(r.vendidos || 0),
          quantidadeReposta: Number(r.repostos || 0),
          quantidadeNaoVendida: Number(r.naoVendidos || 0),
          valorTotal: Number(r.valorMedicao || 0),
        })),
        linha: '',
        nome: '',
        cap: 0,
        preco: 0,
        precoSugestao: 0,
        quantidadeComprada: 0,
        quantidadeVendida: 0,
        quantidadeReposta: 0,
        quantidadeNaoVendida: 0,
        novoEstoque: 0,
        valorTotal: 0,
        signatureDataUrl: m.signatureDataUrl,
        responsavelMedicao: m.responsavel,
        observacoes: m.observacoes,
      });

      await sharePdf(pdfUri);
    } catch (error) {
      Alert.alert('Falha ao enviar PDF', (error as Error)?.message || 'Não foi possível compartilhar o PDF.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Histórico</Text>
        
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
                      {count} {count === 1 ? 'registro' : 'registros'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Lista do histórico */}
        {filteredItems.length === 0 ? (
          <Text style={{ color: '#6B7280', textAlign: 'center', marginTop: 16, fontStyle: 'italic' }}>
            {availableMonths.length === 0 ? 'Sem histórico salvo' : 'Nenhum registro neste mês'}
          </Text>
        ) : (
          filteredItems.map((it) => {
            const client = clients.find((c) => c.id === it.clientId);
            const clientDisplayName = client?.nome || it.clientName || 'Barbearia não encontrada';
            if (it.type === 'VENDA') {
              return (
                <View key={it.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                  <Text style={{ color: '#111827', fontWeight: '600' }}>{clientDisplayName}</Text>
                  <Text style={{ color: '#6B7280' }}>{it.dateTime}</Text>
                  <Text style={{ color: '#111827' }}>{formatCurrency(it.total).replace('.', ',')}</Text>
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      marginTop: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: '#DBEAFE',
                      borderWidth: 1,
                      borderColor: '#BFDBFE',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D4ED8' }}>Venda finalizada</Text>
                  </View>
                  {!!it.sale?.paymentMethod && (
                    <Text style={{ color: '#6B7280', marginTop: 6, fontSize: 12 }}>
                      Pagamento: {getPaymentLabel(it.sale.paymentMethod)}
                    </Text>
                  )}
                  {hasCashDiscount(it.sale?.paymentMethod) && (
                    <Text style={{ color: '#059669', marginTop: 2, fontSize: 12 }}>
                      Desconto à vista 5% aplicado
                    </Text>
                  )}
                  <View style={{ height: 8 }} />
                  <Button
                    title="Reabrir"
                    onPress={() =>
                      navigation.navigate('FinalizarVenda', {
                        clientId: it.clientId,
                        items: it.sale?.items || [],
                        total: Number(it.sale?.total || 0),
                      })
                    }
                  />
                  <View style={{ height: 8 }} />
                  <Button title="Enviar PDF" onPress={() => handleEnviar(it)} variant="secondary" />
                </View>
              );
            }

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
                {!!it.paymentMethod && (
                  <Text style={{ color: '#6B7280', marginTop: 6, fontSize: 12 }}>
                    Pagamento: {getPaymentLabel(it.paymentMethod)}
                  </Text>
                )}
                {hasCashDiscount(it.paymentMethod) && (
                  <Text style={{ color: '#059669', marginTop: 2, fontSize: 12 }}>
                    Desconto à vista 5% aplicado
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
                      paymentMethod: it.paymentMethod,
                      signatureDataUrl: it.signatureDataUrl
                    })
                  }
                />
                <View style={{ height: 8 }} />
                <Button title="Enviar PDF" onPress={() => handleEnviar(it)} variant="secondary" />
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
