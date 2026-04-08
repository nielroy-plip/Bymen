import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Card from '../components/Card';
import Button from '../components/Button';
import { Client } from '../data/clients';
import { listClients, removeProductStock, saveSale } from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/format';
import { generateSalePDF } from '../services/pdf';
import { sharePdf } from '../services/whatsapp';
import * as Sharing from 'expo-sharing';

type Props = NativeStackScreenProps<RootStackParamList, 'FinalizarVenda'>;

type PaymentMethod = 'PIX' | 'DINHEIRO' | 'CARTAO' | 'BOLETO';

const PAYMENT_OPTIONS: Array<{ id: PaymentMethod; label: string }> = [
  { id: 'PIX', label: 'PIX' },
  { id: 'DINHEIRO', label: 'Dinheiro' },
  { id: 'CARTAO', label: 'Cartao' },
  { id: 'BOLETO', label: 'Boleto' },
];

export default function FinalizarVendaScreen({ navigation, route }: Props) {
  const { clientId, items, total } = route.params;
  const [client, setClient] = useState<Client | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [pdfUri, setPdfUri] = useState<string | undefined>();

  useEffect(() => {
    listClients().then((clients) => setClient(clients.find((c) => c.id === clientId)));
  }, [clientId]);

  const totalWithPix = useMemo(() => {
    if (paymentMethod !== 'PIX') return total;
    return total * 0.95;
  }, [paymentMethod, total]);

  async function handleSalvarPdf() {
    if (!client) {
      Alert.alert('Cliente não encontrado', 'Não foi possível gerar o PDF sem a barbearia definida.');
      return;
    }

    try {
      const uri = await generateSalePDF({
        clientName: client.nome,
        dateTime: formatDateTime(new Date()),
        items,
        subtotal: total,
        total: totalWithPix,
        paymentMethod,
      });
      setPdfUri(uri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Salvar PDF da venda',
        });
      } else {
        Alert.alert('PDF gerado', 'Não foi possível abrir o menu de salvar neste dispositivo.');
      }
    } catch (error) {
      Alert.alert('Falha ao gerar PDF', (error as Error)?.message || 'Não foi possível gerar o PDF da venda.');
    }
  }

  async function handleSalvarEEnviarWhatsApp() {
    if (!client) {
      Alert.alert('Cliente não encontrado', 'Não foi possível compartilhar sem a barbearia definida.');
      return;
    }

    try {
      const uri = pdfUri || (await generateSalePDF({
        clientName: client.nome,
        dateTime: formatDateTime(new Date()),
        items,
        subtotal: total,
        total: totalWithPix,
        paymentMethod,
      }));
      setPdfUri(uri);
      await sharePdf(uri);
    } catch (error) {
      Alert.alert('Falha ao enviar no WhatsApp', (error as Error)?.message || 'Não foi possível compartilhar o PDF.');
    }
  }

  async function handleConfirmarVenda() {
    if (!client) {
      Alert.alert('Cliente não encontrado', 'Não foi possível identificar a barbearia desta venda.');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Sem itens', 'Nenhum item informado para finalizar a venda.');
      return;
    }

    setIsSaving(true);
    try {
      for (const item of items) {
        const ok = await removeProductStock(item.id, item.quantidade);
        if (!ok) {
          throw new Error(`Estoque insuficiente para ${item.nome}.`);
        }
      }

      await saveSale({
        id: `sale-${Date.now()}`,
        clientId: client.id,
        clientName: client.nome,
        dateTime: formatDateTime(new Date()),
        items,
        total: totalWithPix,
        paymentMethod,
        createdAt: new Date().toISOString(),
      });

      Alert.alert('Venda registrada', 'Venda finalizada e estoque da Bymen atualizado com sucesso.', [
        {
          text: 'OK',
          onPress: () => navigation.replace('Dashboard'),
        },
      ]);
    } catch (error) {
      Alert.alert('Falha ao finalizar venda', (error as Error)?.message || 'Não foi possível concluir a venda.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Resumo da Venda</Text>
        <Text style={{ color: '#6B7280', marginBottom: 16 }}>Barbearia: {client?.nome || 'Carregando...'}</Text>

        <Card>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 }}>Itens</Text>
          {items.map((item) => (
            <View key={item.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
              <Text style={{ color: '#111827', fontWeight: '600' }}>
                {item.nome} • {item.linha} • {item.cap}ml
              </Text>
              <Text style={{ color: '#6B7280' }}>
                {item.quantidade} x {formatCurrency(item.preco)}
              </Text>
              <Text style={{ color: '#111827', fontWeight: '700' }}>{formatCurrency(item.valorTotal)}</Text>
            </View>
          ))}
        </Card>

        <Card>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 }}>Forma de pagamento</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PAYMENT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                onPress={() => setPaymentMethod(option.id)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: paymentMethod === option.id ? '#111827' : '#D1D5DB',
                  backgroundColor: paymentMethod === option.id ? '#111827' : '#FFFFFF',
                }}
              >
                <Text style={{ color: paymentMethod === option.id ? '#FFFFFF' : '#374151', fontWeight: '700' }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={{ color: '#6B7280', marginBottom: 4 }}>Subtotal: {formatCurrency(total)}</Text>
          {paymentMethod === 'PIX' && (
            <Text style={{ color: '#059669', marginBottom: 4 }}>Desconto PIX (5%): -{formatCurrency(total - totalWithPix)}</Text>
          )}
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>Total: {formatCurrency(totalWithPix)}</Text>
        </Card>

        <Button
          title={isSaving ? 'Finalizando...' : 'Confirmar venda'}
          onPress={handleConfirmarVenda}
          disabled={isSaving}
        />
        <View style={{ height: 12 }} />
        <Button title="Salvar PDF" onPress={handleSalvarPdf} variant="secondary" />
        <View style={{ height: 12 }} />
        <Button title="Salvar e enviar via WhatsApp" onPress={handleSalvarEEnviarWhatsApp} variant="secondary" />
      </ScrollView>
    </View>
  );
}
