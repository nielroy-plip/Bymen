import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import { Client, CLIENTS } from '../data/clients';
import { PRODUCTS, PRODUTOS_BANCADA } from '../data/products';
import ProductRow from '../components/ProductRow';
import Button from '../components/Button';
import { formatDateTime } from '../utils/format';
import { generateEstoquePDF } from '../services/pdf';
import { sharePdf } from '../services/whatsapp';
import * as Sharing from 'expo-sharing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import OperationContextHeader from '../components/OperationContextHeader';
import { addClientInitialStock, removeProductStock } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'EnviarEstoque'>;

export default function EnviarEstoqueScreen({ navigation, route }: Props) {
  const clientId = route.params?.clientId;
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [rows, setRows] = useState<Record<string, any>>({});
  const [bancadaRows, setBancadaRows] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'produtos' | 'bancada'>('produtos');

  useEffect(() => {
    const c = CLIENTS.find((x) => x.id === clientId) || CLIENTS[0];
    setClient(c);
  }, [clientId]);

  const handleRowChange = useCallback((row: any) => {
    setRows((prev) => ({ ...prev, [row.id]: row }));
  }, []);

  const handleBancadaRowChange = useCallback((row: any) => {
    setBancadaRows((prev) => ({ ...prev, [row.id]: row }));
  }, []);


  const rowsArray = useMemo(() => Object.values(rows), [rows]);
  const bancadaRowsArray = useMemo(() => Object.values(bancadaRows), [bancadaRows]);
  const dateTime = useMemo(() => formatDateTime(new Date()), []);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [stockApplied, setStockApplied] = useState(false);

  async function handleGerarPDF() {
    if (rowsArray.length === 0 && bancadaRowsArray.length === 0) {
      Alert.alert('Erro', 'Preencha pelo menos um produto');
      return;
    }
    try {
      if (!stockApplied) {
        const selectedProdutos = rowsArray.filter((row: any) => Number(row.estoqueAtual ?? 0) > 0);
        const selectedBancada = bancadaRowsArray.filter((row: any) => Number(row.estoqueAtual ?? 0) > 0);

        if (!clientId) {
          Alert.alert('Erro', 'Cliente não encontrado para aplicar reposição extra.');
          return;
        }

        for (const row of selectedProdutos) {
          const qty = Number(row.estoqueAtual ?? 0);
          const ok = await removeProductStock(row.id, qty);
          if (!ok) {
            Alert.alert('Erro', `Estoque insuficiente para reposição de ${row.nome}.`);
            return;
          }
        }

        for (const row of selectedBancada) {
          const qty = Number(row.estoqueAtual ?? 0);
          const ok = await removeProductStock(row.id, qty);
          if (!ok) {
            Alert.alert('Erro', `Estoque insuficiente para reposição de bancada ${row.nome}.`);
            return;
          }
        }

        const estoque: Record<string, string> = {};
        selectedProdutos.forEach((row: any) => {
          estoque[row.id] = String(Number(row.estoqueAtual ?? 0));
        });

        const bancada: Record<string, string> = {};
        selectedBancada.forEach((row: any) => {
          bancada[row.id] = String(Number(row.estoqueAtual ?? 0));
        });

        await addClientInitialStock(clientId, { estoque, bancada });

        setStockApplied(true);
      }

      const estoque: Record<string, string> = {};
      rowsArray.forEach((row: any) => { estoque[row.id] = row.estoqueAtual?.toString() || '0'; });
      const bancada: Record<string, string> = {};
      bancadaRowsArray.forEach((row: any) => { bancada[row.id] = row.estoqueAtual?.toString() || '0'; });
      const uri = await generateEstoquePDF({
        estoque,
        bancada,
        clientName: client?.nome || 'Barbearia',
        dateTime,
        filePrefix: 'EstoqueExtra',
      });
      setPdfUri(uri);
      Alert.alert('Sucesso', 'PDF gerado com sucesso!');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao gerar PDF');
    }
  }

  async function handleEnviarWhatsApp() {
    if (!pdfUri) {
      Alert.alert('Erro', 'Gere o PDF antes de enviar.');
      return;
    }
    try {
      await sharePdf(pdfUri);
      Alert.alert('Sucesso', 'PDF enviado via WhatsApp');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao enviar PDF para o WhatsApp');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flexDirection: 'row', marginHorizontal: 24, marginTop: 16, marginBottom: 8 }}>
        <TouchableOpacity
          style={{ flex: 1, padding: 12, backgroundColor: activeTab === 'produtos' ? '#3B82F6' : '#F3F4F6', borderRadius: 8, marginRight: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          onPress={() => setActiveTab('produtos')}
        >
          <Ionicons name="cube-outline" size={18} color={activeTab === 'produtos' ? '#fff' : '#3B82F6'} style={{ marginRight: 4 }} />
          <Text style={{ color: activeTab === 'produtos' ? '#FFF' : '#111827', textAlign: 'center', fontWeight: '700' }}>Produtos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, padding: 12, backgroundColor: activeTab === 'bancada' ? '#3B82F6' : '#F3F4F6', borderRadius: 8, marginLeft: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          onPress={() => setActiveTab('bancada')}
        >
          <MaterialCommunityIcons name="table-furniture" size={18} color={activeTab === 'bancada' ? '#fff' : '#3B82F6'} style={{ marginRight: 4 }} />
          <Text style={{ color: activeTab === 'bancada' ? '#FFF' : '#111827', textAlign: 'center', fontWeight: '700' }}>Bancada</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <OperationContextHeader
          title={client?.nome || 'Selecionado automaticamente'}
          subtitle={`Data: ${dateTime}`}
          statusLabel="Reposição extra"
        />

        {activeTab === 'produtos' && PRODUCTS.map((p) => (
          <ProductRow key={p.id} product={p} onChange={handleRowChange} isStockOnly initialEstoque={0} showSugestao />
        ))}
        {activeTab === 'bancada' && PRODUTOS_BANCADA.map((p) => (
          <ProductRow key={p.id} product={p} onChange={handleBancadaRowChange} isStockOnly initialEstoque={0} showSugestao={false} />
        ))}

        <View style={{ marginTop: 24, gap: 12 }}>
          <Button title="Gerar PDF" onPress={handleGerarPDF} />
          <Button title="Enviar PDF via WhatsApp" onPress={handleEnviarWhatsApp} disabled={!pdfUri} />
        </View>
      </ScrollView>
    </View>
  );
}