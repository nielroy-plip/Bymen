import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import SignaturePad from '../components/SignaturePad';
import BymenLoadingOverlay from '../components/BymenLoadingOverlay';
import { Client } from '../data/clients';
import { getCurrentUser, listClients, removeProductStock, removeStreetStockFromUser, saveSale } from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/format';
import { generateSalePDF } from '../services/pdf';
import { sharePdf } from '../services/whatsapp';
import * as Sharing from 'expo-sharing';
import { getGeneralSettings } from '../services/settings';
import { createKeyboardFocusHandler } from '../utils/keyboardFocus';
import { getUserAppRole } from '../services/access';

type Props = NativeStackScreenProps<RootStackParamList, 'FinalizarVenda'>;

type PaymentMethod = 'PIX' | 'DINHEIRO' | 'CARTAO' | 'BOLETO';

const PAYMENT_OPTIONS: Array<{ id: PaymentMethod; label: string }> = [
  { id: 'PIX', label: 'PIX' },
  { id: 'DINHEIRO', label: 'Dinheiro' },
  { id: 'CARTAO', label: 'Cartao' },
  { id: 'BOLETO', label: 'Boleto' },
];

function getSaleItemTierLabel(item: { faixaPrecoAplicada?: 'BASE' | 'QTD_5' | 'QTD_10' }) {
  if (item.faixaPrecoAplicada === 'QTD_10') return 'Faixa aplicada: 10+ unidades';
  if (item.faixaPrecoAplicada === 'QTD_5') return 'Faixa aplicada: 5-9 unidades';
  return 'Faixa aplicada: preço base';
}

export default function FinalizarVendaScreen({ navigation, route }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const handleFieldFocus = createKeyboardFocusHandler(scrollRef, 24);
  const { clientId, items } = route.params;
  const [client, setClient] = useState<Client | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [responsavelVenda, setResponsavelVenda] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isCardInstallment, setIsCardInstallment] = useState(false);
  const [installments, setInstallments] = useState(2);
  const [creditMonthlyInterestPercent, setCreditMonthlyInterestPercent] = useState(2.49);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | undefined>(undefined);
  const [pdfUri, setPdfUri] = useState<string | undefined>();
  const hasSignature = Boolean(signatureDataUrl && signatureDataUrl.trim().length > 0);

  const PAYMENT_DISCOUNT_PERCENT = 5;

  useEffect(() => {
    listClients().then((clients) => setClient(clients.find((c) => c.id === clientId)));
  }, [clientId]);

  useEffect(() => {
    getGeneralSettings().then((settings) => {
      setCreditMonthlyInterestPercent(Number(settings.creditInstallmentMonthlyInterestPercent || 2.49));
    });
  }, []);

  const produtosItems = useMemo(() => items.filter((item) => !item.id.startsWith('b')), [items]);
  const bancadaItems = useMemo(() => items.filter((item) => item.id.startsWith('b')), [items]);

  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0),
    [items],
  );

  const subtotalProdutos = useMemo(
    () => produtosItems.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0),
    [produtosItems],
  );

  const subtotalBancada = useMemo(
    () => bancadaItems.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0),
    [bancadaItems],
  );

  const subtotalElegivelDiscount = useMemo(() => subtotalProdutos, [subtotalProdutos]);

  const hasFivePercentDiscount = paymentMethod === 'PIX' || paymentMethod === 'DINHEIRO';

  const tierSummary = useMemo(() => {
    const summary = {
      base: 0,
      qtd5: 0,
      qtd10: 0,
    };

    items.forEach((item) => {
      if (item.faixaPrecoAplicada === 'QTD_10') {
        summary.qtd10 += Number(item.quantidade || 0);
        return;
      }

      if (item.faixaPrecoAplicada === 'QTD_5') {
        summary.qtd5 += Number(item.quantidade || 0);
        return;
      }

      summary.base += Number(item.quantidade || 0);
    });

    return summary;
  }, [items]);

  const paymentDiscountValue = useMemo(() => {
    if (!hasFivePercentDiscount) return 0;
    return subtotalElegivelDiscount * (PAYMENT_DISCOUNT_PERCENT / 100);
  }, [hasFivePercentDiscount, subtotalElegivelDiscount]);

  const totalWithDiscount = useMemo(() => {
    if (!hasFivePercentDiscount) return subtotal;
    return subtotalProdutos - paymentDiscountValue + subtotalBancada;
  }, [hasFivePercentDiscount, subtotal, subtotalProdutos, subtotalBancada, paymentDiscountValue]);

  const creditInterestValue = useMemo(() => {
    if (paymentMethod !== 'CARTAO' || !isCardInstallment) return 0;
    const monthlyRate = creditMonthlyInterestPercent / 100;
    const factor = Math.pow(1 + monthlyRate, installments);
    return totalWithDiscount * (factor - 1);
  }, [paymentMethod, isCardInstallment, installments, totalWithDiscount, creditMonthlyInterestPercent]);

  const totalFinal = useMemo(() => {
    if (paymentMethod !== 'CARTAO' || !isCardInstallment) return totalWithDiscount;
    return totalWithDiscount + creditInterestValue;
  }, [paymentMethod, isCardInstallment, totalWithDiscount, creditInterestValue]);

  const installmentValue = useMemo(() => {
    if (paymentMethod !== 'CARTAO' || !isCardInstallment) return 0;
    return totalFinal / installments;
  }, [paymentMethod, isCardInstallment, totalFinal, installments]);

  function handleChangePaymentMethod(method: PaymentMethod) {
    setPaymentMethod(method);
    if (method !== 'CARTAO') {
      setIsCardInstallment(false);
      setInstallments(2);
    }
  }

  async function handleSalvarPdf() {
    if (!client) {
      Alert.alert('Cliente não encontrado', 'Não foi possível gerar o PDF sem a barbearia definida.');
      return;
    }

    if (!hasSignature) {
      Alert.alert('Assinatura obrigatória', 'Coleta a assinatura do responsável antes de gerar o PDF.');
      return;
    }

    try {
      const uri = await generateSalePDF({
        clientName: client.nome,
        dateTime: formatDateTime(new Date()),
        items,
        subtotal,
        total: totalFinal,
        paymentMethod,
        responsavelVenda,
        observacoes,
        pixDiscountPercent: hasFivePercentDiscount ? PAYMENT_DISCOUNT_PERCENT : 0,
        pixDiscountValue: hasFivePercentDiscount ? paymentDiscountValue : 0,
        isCreditInstallment: paymentMethod === 'CARTAO' ? isCardInstallment : false,
        installmentCount: paymentMethod === 'CARTAO' && isCardInstallment ? installments : 1,
        creditMonthlyInterestPercent: paymentMethod === 'CARTAO' && isCardInstallment ? creditMonthlyInterestPercent : 0,
        creditInterestValue: paymentMethod === 'CARTAO' && isCardInstallment ? creditInterestValue : 0,
        signatureDataUrl,
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

    if (!hasSignature) {
      Alert.alert('Assinatura obrigatória', 'Coleta a assinatura do responsável antes de enviar via WhatsApp.');
      return;
    }

    try {
      const uri = pdfUri || (await generateSalePDF({
        clientName: client.nome,
        dateTime: formatDateTime(new Date()),
        items,
        subtotal,
        total: totalFinal,
        paymentMethod,
        responsavelVenda,
        observacoes,
        pixDiscountPercent: hasFivePercentDiscount ? PAYMENT_DISCOUNT_PERCENT : 0,
        pixDiscountValue: hasFivePercentDiscount ? paymentDiscountValue : 0,
        isCreditInstallment: paymentMethod === 'CARTAO' ? isCardInstallment : false,
        installmentCount: paymentMethod === 'CARTAO' && isCardInstallment ? installments : 1,
        creditMonthlyInterestPercent: paymentMethod === 'CARTAO' && isCardInstallment ? creditMonthlyInterestPercent : 0,
        creditInterestValue: paymentMethod === 'CARTAO' && isCardInstallment ? creditInterestValue : 0,
        signatureDataUrl,
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

    if (!hasSignature) {
      Alert.alert('Assinatura obrigatória', 'Coleta a assinatura do responsável antes de finalizar a venda.');
      return;
    }

    setIsSaving(true);
    try {
      const currentUser = await getCurrentUser();
      const appRole = getUserAppRole(currentUser);
      const usesStreetStock = appRole === 'VENDEDOR' || appRole === 'SUPERVISOR';
      const streetStockEmail = String(currentUser?.email || '').trim().toLowerCase();

      if (usesStreetStock && !streetStockEmail) {
        throw new Error('Não foi possível identificar o usuário logado para baixar o estoque na rua.');
      }

      for (const item of items) {
        const ok = usesStreetStock
          ? await removeStreetStockFromUser(streetStockEmail, item.id, item.quantidade)
          : await removeProductStock(item.id, item.quantidade);

        if (!ok) {
          throw new Error(
            usesStreetStock
              ? `Estoque na rua insuficiente para ${item.nome}.`
              : `Estoque insuficiente para ${item.nome}.`,
          );
        }
      }

      await saveSale({
        id: `sale-${Date.now()}`,
        clientId: client.id,
        clientName: client.nome,
        dateTime: formatDateTime(new Date()),
        items,
        subtotal,
        pixDiscountPercent: hasFivePercentDiscount ? PAYMENT_DISCOUNT_PERCENT : 0,
        pixDiscountValue: hasFivePercentDiscount ? paymentDiscountValue : 0,
        total: totalFinal,
        paymentMethod,
        isCreditInstallment: paymentMethod === 'CARTAO' ? isCardInstallment : false,
        installmentCount: paymentMethod === 'CARTAO' && isCardInstallment ? installments : 1,
        creditMonthlyInterestPercent: paymentMethod === 'CARTAO' && isCardInstallment ? creditMonthlyInterestPercent : 0,
        creditInterestValue: paymentMethod === 'CARTAO' && isCardInstallment ? creditInterestValue : 0,
        responsavel: responsavelVenda,
        sellerEmail: currentUser?.email,
        sellerName: currentUser?.name,
        sellerRole: currentUser?.role,
        observacoes,
        signatureDataUrl,
        createdAt: new Date().toISOString(),
      });

      Alert.alert('Venda registrada', 'Venda finalizada e estoque atualizado com sucesso.', [
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
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 24, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Resumo da Venda</Text>
        <Text style={{ color: '#6B7280', marginBottom: 16 }}>Barbearia: {client?.nome || 'Carregando...'}</Text>

        <Card>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E40AF', marginBottom: 10 }}>Produtos</Text>
          {produtosItems.length === 0 ? (
            <Text style={{ color: '#6B7280', marginBottom: 8 }}>Nenhum produto nesta venda.</Text>
          ) : (
            produtosItems.map((item) => (
              <View key={item.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                <Text style={{ color: '#111827', fontWeight: '600' }}>
                  {item.nome} • {item.linha} • {item.cap}ml
                </Text>
                <Text style={{ color: '#2563EB', fontSize: 12, marginTop: 2 }}>{getSaleItemTierLabel(item)}</Text>
                <Text style={{ color: '#6B7280' }}>
                  {item.quantidade} x {formatCurrency(item.preco)}
                </Text>
                <Text style={{ color: '#111827', fontWeight: '700' }}>{formatCurrency(item.valorTotal)}</Text>
              </View>
            ))
          )}

          <Text style={{ color: '#1E40AF', fontWeight: '700', marginTop: 10 }}>
            Subtotal Produtos: {formatCurrency(subtotalProdutos)}
          </Text>
        </Card>

        <Card>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#991B1B', marginBottom: 10 }}>Bancada</Text>
          {bancadaItems.length === 0 ? (
            <Text style={{ color: '#6B7280', marginBottom: 8 }}>Nenhum item de bancada nesta venda.</Text>
          ) : (
            bancadaItems.map((item) => (
              <View key={item.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                <Text style={{ color: '#111827', fontWeight: '600' }}>
                  {item.nome} • {item.linha} • {item.cap}ml
                </Text>
                <Text style={{ color: '#B45309', fontSize: 12, marginTop: 2 }}>{getSaleItemTierLabel(item)}</Text>
                <Text style={{ color: '#6B7280' }}>
                  {item.quantidade} x {formatCurrency(item.preco)}
                </Text>
                <Text style={{ color: '#111827', fontWeight: '700' }}>{formatCurrency(item.valorTotal)}</Text>
              </View>
            ))
          )}

          <Text style={{ color: '#991B1B', fontWeight: '700', marginTop: 10 }}>
            Subtotal Bancada: {formatCurrency(subtotalBancada)}
          </Text>
        </Card>

        <Card>
          <Input
            label="Responsável pela venda"
            value={responsavelVenda}
            onChangeText={setResponsavelVenda}
            onFocus={handleFieldFocus}
            placeholder="Nome do responsável"
          />
          <Input
            label="Observações"
            value={observacoes}
            onChangeText={setObservacoes}
            onFocus={handleFieldFocus}
            placeholder="Opcional"
            multiline
            numberOfLines={3}
          />
        </Card>

        <Card>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 }}>Forma de pagamento</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PAYMENT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                onPress={() => handleChangePaymentMethod(option.id)}
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
          {hasFivePercentDiscount && (
            <Text style={{ color: '#059669', marginTop: 10 }}>
              Desconto {paymentMethod === 'PIX' ? 'PIX' : 'Dinheiro'}: 5%
            </Text>
          )}

          {paymentMethod === 'CARTAO' && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ color: '#111827', fontWeight: '700', marginBottom: 8 }}>Modalidade do cartão</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setIsCardInstallment(false)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: !isCardInstallment ? '#111827' : '#D1D5DB',
                    backgroundColor: !isCardInstallment ? '#111827' : '#FFFFFF',
                  }}
                >
                  <Text style={{ color: !isCardInstallment ? '#FFFFFF' : '#374151', fontWeight: '700' }}>Crédito à vista</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsCardInstallment(true)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: isCardInstallment ? '#111827' : '#D1D5DB',
                    backgroundColor: isCardInstallment ? '#111827' : '#FFFFFF',
                  }}
                >
                  <Text style={{ color: isCardInstallment ? '#FFFFFF' : '#374151', fontWeight: '700' }}>Crédito parcelado</Text>
                </TouchableOpacity>
              </View>

              {isCardInstallment && (
                <>
                  <Text style={{ color: '#111827', fontWeight: '700', marginTop: 12, marginBottom: 8 }}>Quantidade de parcelas</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                      <TouchableOpacity
                        key={n}
                        onPress={() => setInstallments(n)}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 10,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: installments === n ? '#1D4ED8' : '#D1D5DB',
                          backgroundColor: installments === n ? '#DBEAFE' : '#FFFFFF',
                        }}
                      >
                        <Text style={{ color: installments === n ? '#1D4ED8' : '#374151', fontWeight: '700' }}>{n}x</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{ marginTop: 10, backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BFDBFE' }}>
                    <Text style={{ color: '#1D4ED8', fontWeight: '700', marginBottom: 4 }}>Simulação de parcelamento</Text>
                    <Text style={{ color: '#1F2937' }}>Juros mensal: {creditMonthlyInterestPercent.toFixed(2).replace('.', ',')}%</Text>
                    <Text style={{ color: '#1F2937' }}>Parcela: {installments}x de {formatCurrency(installmentValue)}</Text>
                    <Text style={{ color: '#1F2937' }}>Acréscimo total: {formatCurrency(creditInterestValue)}</Text>
                    <Text style={{ color: '#1D4ED8', fontWeight: '700' }}>Total com juros: {formatCurrency(totalFinal)}</Text>
                  </View>
                </>
              )}
            </View>
          )}
        </Card>

        <Card>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 }}>Assinatura</Text>
          <View
            style={{
              alignSelf: 'flex-start',
              marginBottom: 10,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: hasSignature ? '#DCFCE7' : '#FEE2E2',
            }}
          >
            <Text style={{ color: hasSignature ? '#166534' : '#991B1B', fontSize: 12, fontWeight: '700' }}>
              {hasSignature ? '✓ Assinatura coletada' : '⚠ Assinatura pendente'}
            </Text>
          </View>
          <SignaturePad label="Assinatura do responsável" onChange={setSignatureDataUrl} />
          {!hasSignature && (
            <Text style={{ color: '#B91C1C', marginTop: 8, fontSize: 12 }}>
              A assinatura é obrigatória para finalizar a venda.
            </Text>
          )}
        </Card>

        <Card>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Resumo</Text>
          <Text style={{ color: '#6B7280', marginBottom: 4 }}>Subtotal Produtos: {formatCurrency(subtotalProdutos)}</Text>
          <Text style={{ color: '#6B7280', marginBottom: 4 }}>Subtotal Bancada: {formatCurrency(subtotalBancada)}</Text>
          <Text style={{ color: '#6B7280', marginBottom: 4 }}>Subtotal geral: {formatCurrency(subtotal)}</Text>
          <Text style={{ color: '#6B7280', marginBottom: 4 }}>
            Faixas: Base {tierSummary.base} un • 5-9 un {tierSummary.qtd5} un • 10+ un {tierSummary.qtd10} un
          </Text>
          {hasFivePercentDiscount && (
            <Text style={{ color: '#059669', marginBottom: 4 }}>
              Desconto {paymentMethod === 'PIX' ? 'PIX' : 'Dinheiro'} (5%): -{formatCurrency(paymentDiscountValue)}
            </Text>
          )}
          {paymentMethod === 'CARTAO' && isCardInstallment && (
            <>
              <Text style={{ color: '#1D4ED8', marginBottom: 4 }}>
                Juros do parcelamento ({installments}x): +{formatCurrency(creditInterestValue)}
              </Text>
              <Text style={{ color: '#1D4ED8', marginBottom: 4 }}>
                Simulação: {installments}x de {formatCurrency(installmentValue)}
              </Text>
            </>
          )}
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>Total: {formatCurrency(totalFinal)}</Text>
        </Card>

        <Button
          title={isSaving ? 'Finalizando...' : 'Confirmar venda'}
          onPress={handleConfirmarVenda}
          disabled={isSaving || !hasSignature}
        />
        <View style={{ height: 12 }} />
        <Button title="Salvar PDF" onPress={handleSalvarPdf} variant="secondary" disabled={!hasSignature} />
        <View style={{ height: 12 }} />
        <Button
          title="Salvar e enviar via WhatsApp"
          onPress={handleSalvarEEnviarWhatsApp}
          variant="secondary"
          disabled={!hasSignature}
        />
      </ScrollView>
      <BymenLoadingOverlay visible={isSaving} label="Finalizando venda..." />
    </View>
  );
}
