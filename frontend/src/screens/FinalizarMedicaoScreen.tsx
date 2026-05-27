import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, InteractionManager, Dimensions, UIManager } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Button from '../components/Button';
import { Client } from '../data/clients';
import { formatCurrency } from '../utils/format';
import {
  saveMeasurement,
  updateMeasurementPdf,
  listClients,
  listProducts,
  Measurement,
  enqueueSyncPending,
  updateMeasurementSyncStatus,
  API_BASE_URL,
  addProductStock,
  removeProductStock,
  getCurrentUser,
  removeStreetStockFromUser,
  addStreetStockToUser,
} from '../services/api';
import { generateMeasurementPDF } from '../services/pdf';
import { sharePdf } from '../services/whatsapp';
import SignaturePad from '../components/SignaturePad';
import { useResponsive } from '../hooks/useResponsive';
import * as Sharing from 'expo-sharing';
import OperationContextHeader from '../components/OperationContextHeader';
import BymenLoader from '../components/BymenLoader';
import BymenLoadingOverlay from '../components/BymenLoadingOverlay';
import { getProductUnit } from '../utils/product';
import { getGeneralSettings } from '../services/settings';
import { getUserAppRole } from '../services/access';

const BACKEND_URL = API_BASE_URL;
const ENABLE_BLING_SYNC = String(process.env.EXPO_PUBLIC_ENABLE_BLING || '').toLowerCase() === 'true';

type Props = NativeStackScreenProps<RootStackParamList, 'FinalizarMedicao'>;
type PaymentMethod = 'PIX' | 'DINHEIRO' | 'CARTAO' | 'BOLETO';

const PAYMENT_OPTIONS: Array<{ id: PaymentMethod; label: string }> = [
  { id: 'PIX', label: 'PIX' },
  { id: 'DINHEIRO', label: 'Dinheiro' },
  { id: 'CARTAO', label: 'Cartao' },
  { id: 'BOLETO', label: 'Boleto' },
];

const PAYMENT_DISCOUNT_PERCENT = 5;

export default function FinalizarMedicaoScreen({ navigation, route }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const keyboardHeightRef = useRef(0);
  const scrollOffsetYRef = useRef(0);
  const params = route.params as any;
  const {
    clientId,
    medicaoRows,
    bancadaRows,
    valorMedicao,
    valorBancada,
    totalGeral,
    dateTime,
    responsavel: responsavelParam,
    observacoes: observacoesParam,
    pagamentoPix: pagamentoPixParam,
    paymentMethod: paymentMethodParam,
    signatureDataUrl: signatureParam,
    bonusRows: bonusRowsParam = []
  } = params;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    paymentMethodParam || (pagamentoPixParam ? 'PIX' : 'DINHEIRO')
  );
  const [isCardInstallment, setIsCardInstallment] = useState(Boolean(params?.isCreditInstallment));
  const [installments, setInstallments] = useState(Number(params?.installmentCount || 2));
  const [creditMonthlyInterestPercent, setCreditMonthlyInterestPercent] = useState(
    Number(params?.creditMonthlyInterestPercent || 2.49),
  );
  const [observacoes, setObservacoes] = useState(observacoesParam || '');

  // Estado local para produtos bonificados
  const [bonusRows, setBonusRows] = useState(Array.isArray(bonusRowsParam) ? bonusRowsParam : []);
  const [selectedBonusProductId, setSelectedBonusProductId] = useState<string>('');
  const [bonusQuantity, setBonusQuantity] = useState<string>('1');
  const valorBonus = bonusRows.reduce((acc: any, r: { quantidadeComprada: any; }) => acc + (r.quantidadeComprada || 0), 0);

  const [client, setClient] = useState<Client | undefined>(undefined);
  const [pdfUri, setPdfUri] = useState<string | undefined>(undefined);
  const [responsavel, setResponsavel] = useState(responsavelParam || '');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | undefined>(signatureParam);
  const hasSignature = Boolean(signatureDataUrl && signatureDataUrl.trim().length > 0);
  const [isFinalizando, setIsFinalizando] = useState(false);
  const [finalizedMeasurementId, setFinalizedMeasurementId] = useState<string | undefined>(undefined);
  const [distributorStockByProductId, setDistributorStockByProductId] = useState<Record<string, number>>({});
  const [renderDetailedRows, setRenderDetailedRows] = useState(false);
  const { isTablet, padding, fontSize } = useResponsive();

  useEffect(() => {
    Promise.all([listClients(), listProducts()]).then(([clients, products]) => {
      const c = clients.find((x) => x.id === clientId);
      setClient(c);

      const stockMap: Record<string, number> = {};
      products.forEach((p: any) => {
        stockMap[p.id] = Number(p.estoque ?? 0);
      });
      setDistributorStockByProductId(stockMap);
    });
  }, [clientId]);

  useEffect(() => {
    getGeneralSettings().then((settings) => {
      setCreditMonthlyInterestPercent(Number(settings.creditInstallmentMonthlyInterestPercent || 2.49));
    });
  }, []);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardHeightRef.current = event.endCoordinates?.height || 0;
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      keyboardHeightRef.current = 0;
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    setRenderDetailedRows(false);
    const task = InteractionManager.runAfterInteractions(() => {
      setRenderDetailedRows(true);
    });

    return () => {
      task.cancel();
    };
  }, [clientId, dateTime]);

  const bancadaRowsWithQuantity = useMemo(
    () => (bancadaRows as any[]).filter((r: any) => Number(r.quantidadeComprada ?? 0) > 0),
    [bancadaRows],
  );

  const bonusRowsWithQuantity = useMemo(
    () => (bonusRows as any[]).filter((r: any) => Number(r.quantidadeComprada ?? 0) > 0),
    [bonusRows],
  );

  const totalBonusItems = useMemo(
    () => bonusRowsWithQuantity.reduce((acc: number, r: any) => acc + Number(r.quantidadeComprada || 0), 0),
    [bonusRowsWithQuantity],
  );

  const medicaoRowsSummary = useMemo(() => {
    if (!renderDetailedRows) {
      return (
        <Text style={{ color: '#6B7280', fontSize: fontSize.small, fontStyle: 'italic' }}>
          Carregando detalhes da medição...
        </Text>
      );
    }

    if ((medicaoRows as any[]).length === 0) {
      return (
        <Text style={{ color: '#9CA3AF', fontSize: fontSize.small, fontStyle: 'italic' }}>
          Nenhum produto vendido
        </Text>
      );
    }

    return (medicaoRows as any[]).map((r: any) => (
      <View key={r.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#DBEAFE' }}>
        <Text style={{ color: '#111827', fontWeight: '600', fontSize: fontSize.small }}>
          {r.nome} • {r.linha} • {r.cap}{getProductUnit(String(r.nome || ''))}
        </Text>
        <Text style={{ color: '#6B7280', fontSize: fontSize.small }}>
          PE: {r.estoqueAtual} | PV: {r.vendidos} | PR: {r.repostos} | PN: {r.diferenca} | PRD: {r.produtosRetirados ?? 0} | NE: {r.novoEstoque}
        </Text>
        <Text style={{ color: '#059669', fontWeight: '600', fontSize: fontSize.small }}>
          {formatCurrency(r.valorMedicao)}
        </Text>
      </View>
    ));
  }, [renderDetailedRows, medicaoRows, fontSize.small]);

  const bancadaRowsSummary = useMemo(() => {
    if (!renderDetailedRows) {
      return (
        <Text style={{ color: '#6B7280', fontSize: fontSize.small, fontStyle: 'italic' }}>
          Carregando detalhes da bancada...
        </Text>
      );
    }

    if (bancadaRowsWithQuantity.length === 0) {
      return (
        <Text style={{ color: '#9CA3AF', fontSize: fontSize.small, fontStyle: 'italic' }}>
          Nenhum produto de uso interno
        </Text>
      );
    }

    return bancadaRowsWithQuantity.map((r: any) => (
      <View key={r.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#FEE2E2' }}>
        <Text style={{ color: '#111827', fontWeight: '600', fontSize: fontSize.small }}>
          {r.nome} • {r.linha} • {r.cap}{getProductUnit(String(r.nome || ''))}
        </Text>
        <Text style={{ color: '#6B7280', fontSize: fontSize.small }}>
          Quantidade: {r.quantidadeComprada} × {formatCurrency(r.preco)}
        </Text>
        <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: fontSize.small }}>
          {formatCurrency(r.valorTotal)}
        </Text>
      </View>
    ));
  }, [renderDetailedRows, bancadaRowsWithQuantity, fontSize.small]);

  const bonusRowsSummary = useMemo(() => {
    if (!renderDetailedRows) {
      return (
        <Text style={{ color: '#6B7280', fontSize: fontSize.small, fontStyle: 'italic' }}>
          Carregando detalhes da bonificação...
        </Text>
      );
    }

    if (bonusRowsWithQuantity.length === 0) {
      return (
        <Text style={{ color: '#9CA3AF', fontSize: fontSize.small, fontStyle: 'italic' }}>
          Nenhum produto recebido como bonificação
        </Text>
      );
    }

    return bonusRowsWithQuantity.map((r: any) => (
      <View key={r.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#A7F3D0' }}>
        <Text style={{ color: '#111827', fontWeight: '600', fontSize: fontSize.small }}>
          {r.nome} • {r.linha} • {r.cap}{getProductUnit(String(r.nome || ''))}
        </Text>
        <Text style={{ color: '#6B7280', fontSize: fontSize.small }}>
          Quantidade: {r.quantidadeComprada}
        </Text>
        <Text
          style={{
            color:
              Number(r.quantidadeComprada ?? 0) > Number(distributorStockByProductId[r.id] ?? 0)
                ? '#DC2626'
                : '#059669',
            fontSize: fontSize.small,
            fontWeight: '600',
          }}
        >
          Saldo distribuidor: {Number(distributorStockByProductId[r.id] ?? 0)}
        </Text>
      </View>
    ));
  }, [renderDetailedRows, bonusRowsWithQuantity, distributorStockByProductId, fontSize.small]);

  const bonusStockIssues = useMemo(() => {
    return (bonusRows as any[])
      .filter((row) => Number(row.quantidadeComprada ?? 0) > 0)
      .map((row) => {
        const required = Number(row.quantidadeComprada ?? 0);
        const available = Number(distributorStockByProductId[row.id] ?? 0);
        return {
          id: row.id,
          nome: row.nome,
          required,
          available,
          isInsufficient: required > available,
        };
      })
      .filter((item) => item.isInsufficient);
  }, [bonusRows, distributorStockByProductId]);

  const hasFivePercentDiscount = paymentMethod === 'PIX' || paymentMethod === 'DINHEIRO';

  const valorMedicaoComDesconto = useMemo(
    () => (hasFivePercentDiscount ? valorMedicao * ((100 - PAYMENT_DISCOUNT_PERCENT) / 100) : valorMedicao),
    [hasFivePercentDiscount, valorMedicao],
  );

  const valorDescontoAplicado = useMemo(
    () => (hasFivePercentDiscount ? valorMedicao - valorMedicaoComDesconto : 0),
    [hasFivePercentDiscount, valorMedicao, valorMedicaoComDesconto],
  );

  const totalGeralComDesconto = useMemo(
    () => (hasFivePercentDiscount ? valorMedicaoComDesconto + valorBancada : totalGeral),
    [hasFivePercentDiscount, valorMedicaoComDesconto, valorBancada, totalGeral],
  );

  const creditInterestValue = useMemo(() => {
    if (paymentMethod !== 'CARTAO' || !isCardInstallment) return 0;
    const monthlyRate = creditMonthlyInterestPercent / 100;
    const factor = Math.pow(1 + monthlyRate, installments);
    return totalGeralComDesconto * (factor - 1);
  }, [paymentMethod, isCardInstallment, installments, totalGeralComDesconto, creditMonthlyInterestPercent]);

  const totalFinal = useMemo(() => {
    if (paymentMethod !== 'CARTAO' || !isCardInstallment) return totalGeralComDesconto;
    return totalGeralComDesconto + creditInterestValue;
  }, [paymentMethod, isCardInstallment, totalGeralComDesconto, creditInterestValue]);

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

  // ========================================
  // GERAR PDF CONSOLIDADO
  // ========================================
  async function handleGerarPDF(): Promise<string | undefined> {
    try {
      if (!client) {
        Alert.alert('Erro', 'Cliente não encontrado');
        return undefined;
      }

      if (!hasSignature) {
        Alert.alert('Assinatura obrigatória', 'Coleta a assinatura do responsável antes de gerar o PDF.');
        return undefined;
      }

      // Mapeia corretamente os campos para o PDF
      const mappedMedicaoRows = medicaoRows.map((r: any) => ({
        nome: r.nome,
        linha: r.linha,
        cap: r.cap,
        preco: r.preco,
        precoSugestao: r.precoSugestao,
        quantidadeComprada: r.quantidadeComprada ?? r.comprados ?? r.vendidos ?? 0,
        quantidadeVendida: r.quantidadeVendida ?? r.vendidos ?? 0,
        quantidadeReposta: r.quantidadeReposta ?? r.repostos ?? 0,
        quantidadeNaoVendida: r.quantidadeNaoVendida ?? r.diferenca ?? 0,
        novoEstoque: r.novoEstoque,
        valorTotal: r.valorTotal ?? r.valorMedicao ?? 0
      }));
      const mappedBancadaRows = bancadaRows.map((r: any) => ({
        nome: r.nome,
        linha: r.linha,
        cap: r.cap,
        preco: r.preco,
        quantidadeComprada: r.quantidadeComprada ?? r.comprados ?? r.vendidos ?? 0,
        valorTotal: r.valorTotal ?? (r.quantidadeComprada ?? 0) * (r.preco ?? 0)
      }));
      const mappedBonusRows = bonusRows.map((r: any) => ({
        nome: r.nome,
        linha: r.linha,
        cap: r.cap,
        quantidadeComprada: r.quantidadeComprada ?? r.comprados ?? r.vendidos ?? 0
      }));

      const id = finalizedMeasurementId || `${clientId}-${Date.now()}`;
      const uri = await (generateMeasurementPDF as any)({
        client,
        medicaoRows: mappedMedicaoRows,
        bancadaRows: mappedBancadaRows,
        bonusRows: mappedBonusRows as any,
        valorMedicao,
        valorBancada,
        totalGeral: totalFinal,
        dateTime,
        signatureDataUrl,
        responsavelMedicao: responsavel || client.responsavel,
        observacoes,
        pagamentoPix,
        paymentMethod,
        isCreditInstallment: paymentMethod === 'CARTAO' ? isCardInstallment : false,
        installmentCount: paymentMethod === 'CARTAO' && isCardInstallment ? installments : 1,
        creditMonthlyInterestPercent: paymentMethod === 'CARTAO' && isCardInstallment ? creditMonthlyInterestPercent : 0,
        creditInterestValue: paymentMethod === 'CARTAO' && isCardInstallment ? creditInterestValue : 0,
      });

      if (finalizedMeasurementId) {
        await updateMeasurementPdf(id, uri);
      }
      setPdfUri(uri);
      Alert.alert('Sucesso', 'PDF gerado com sucesso!');

      // Abrir o PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert(
          'PDF gerado',
          'Motivo: compartilhamento indisponível neste dispositivo.\n\nComo ajustar: abra o arquivo PDF manualmente no gerenciador de arquivos.',
        );
      }
      return uri;
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      Alert.alert(
        'Erro ao gerar PDF',
        `Motivo: ${(error as Error).message || 'falha durante a geração do documento.'}\n\nComo ajustar: verifique conexão/armazenamento e tente novamente.`,
      );
      return undefined;
    }
  }

  async function handleEnviarWhatsApp() {
    try {
      if (!hasSignature) {
        Alert.alert('Assinatura obrigatória', 'Coleta a assinatura do responsável antes de enviar via WhatsApp.');
        return;
      }

      const currentUri = pdfUri || (await handleGerarPDF());
      if (currentUri) {
        await sharePdf(currentUri);
      }
    } catch (error) {
      Alert.alert(
        'Falha ao enviar no WhatsApp',
        `Motivo: ${(error as Error)?.message || 'não foi possível compartilhar o arquivo.'}\n\nComo ajustar: confirme o WhatsApp instalado e tente novamente.`,
      );
    }
  }

  async function handleFinalizarMedicao() {
    if (!client) {
      Alert.alert('Erro', 'Cliente não encontrado');
      return;
    }

    if (isFinalizando) {
      return;
    }

    if (bonusStockIssues.length > 0) {
      Alert.alert(
        'Bonificação com saldo insuficiente',
        `Motivo: há produtos bonificados acima do estoque disponível do distribuidor.\n\nComo ajustar: revise as quantidades em bonificação e tente novamente.`,
      );
      return;
    }

    if (!hasSignature) {
      Alert.alert(
        'Assinatura obrigatória',
        'Coleta a assinatura do responsável da barbearia antes de finalizar a medição.',
      );
      return;
    }

    setIsFinalizando(true);

    try {
      const currentUser = await getCurrentUser();
      const medicaoId = finalizedMeasurementId || `${clientId}-${Date.now()}`;
      const appRole = getUserAppRole(currentUser);
      const usesStreetStock = appRole === 'VENDEDOR' || appRole === 'SUPERVISOR';
      const streetStockEmail = String(currentUser?.email || '').trim().toLowerCase();

      if (usesStreetStock && !streetStockEmail) {
        Alert.alert('Erro', 'Não foi possível identificar o usuário logado para atualizar o estoque na rua.');
        setIsFinalizando(false);
        return;
      }

      for (const row of medicaoRows as any[]) {
        const repostos = Number(row.repostos ?? 0);
        const retirados = Number(row.produtosRetirados ?? 0);

        if (repostos > 0) {
          const ok = usesStreetStock
            ? await removeStreetStockFromUser(streetStockEmail, row.id, repostos)
            : await removeProductStock(row.id, repostos);

          if (!ok) {
            Alert.alert(
              'Erro',
              usesStreetStock
                ? `Estoque na rua insuficiente para repor ${row.nome}.`
                : `Estoque insuficiente para repor ${row.nome}.`,
            );
            setIsFinalizando(false);
            return;
          }
        }

        if (retirados > 0) {
          if (usesStreetStock) {
            await addStreetStockToUser(streetStockEmail, row.id, retirados);
          } else {
            await addProductStock(row.id, retirados);
          }
        }
      }

      for (const row of bancadaRows as any[]) {
        const qtd = Number(row.quantidadeComprada ?? 0);
        if (qtd > 0) {
          const ok = usesStreetStock
            ? await removeStreetStockFromUser(streetStockEmail, row.id, qtd)
            : await removeProductStock(row.id, qtd);

          if (!ok) {
            Alert.alert(
              'Erro',
              usesStreetStock
                ? `Estoque na rua insuficiente para item de bancada ${row.nome}.`
                : `Estoque insuficiente para item de bancada ${row.nome}.`,
            );
            setIsFinalizando(false);
            return;
          }
        }
      }

      for (const row of bonusRows as any[]) {
        const qtd = Number(row.quantidadeComprada ?? 0);
        if (qtd > 0) {
          const ok = usesStreetStock
            ? await removeStreetStockFromUser(streetStockEmail, row.id, qtd)
            : await removeProductStock(row.id, qtd);

          if (!ok) {
            Alert.alert(
              'Erro',
              usesStreetStock
                ? `Estoque na rua insuficiente para bonificação ${row.nome}.`
                : `Estoque insuficiente para bonificação ${row.nome}.`,
            );
            setIsFinalizando(false);
            return;
          }
        }
      }

      const measurement: Measurement = {
        id: medicaoId,
        clientId,
        clientName: client.nome,
        dateTime,
        sellerEmail: currentUser?.email,
        sellerName: currentUser?.username || currentUser?.email,
        sellerRole: currentUser?.role,
        medicaoRows,
        valorMedicao,
        bancadaRows,
        bonusRows,
        valorBancada,
        totalGeral: totalFinal,
        responsavel: responsavel || client.responsavel,
        observacoes,
        pagamentoPix,
        paymentMethod,
        isCreditInstallment: paymentMethod === 'CARTAO' ? isCardInstallment : false,
        installmentCount: paymentMethod === 'CARTAO' && isCardInstallment ? installments : 1,
        creditMonthlyInterestPercent: paymentMethod === 'CARTAO' && isCardInstallment ? creditMonthlyInterestPercent : 0,
        creditInterestValue: paymentMethod === 'CARTAO' && isCardInstallment ? creditInterestValue : 0,
        pdfUri: pdfUri || undefined,
        signatureDataUrl,
        status: 'FINALIZED',
        syncStatus: 'PENDING',
      };

      await saveMeasurement(measurement);
      setFinalizedMeasurementId(medicaoId);

      if (!ENABLE_BLING_SYNC) {
        Alert.alert(
          'Sucesso',
          'Medição finalizada e estoque atualizado com sucesso.',
          [
            {
              text: 'OK',
              onPress: () => navigation.replace('ClienteDetalhes', { clientId }),
            },
          ]
        );
        return;
      }

      const itemsForBling = medicaoRows
        .filter((item: any) => (item.vendidos ?? 0) > 0)
        .map((item: any) => ({
          productId: item.id,
          quantity: Number(item.vendidos ?? 0),
          unitPrice: Number(item.preco ?? 0),
        }));

      try {
        const response = await fetch(`${BACKEND_URL}/integrations/bling/medicoes/${medicaoId}/finalize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            localClientId: clientId,
            items: itemsForBling,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `HTTP ${response.status}`);
        }

        await updateMeasurementSyncStatus(
          medicaoId,
          'SYNCED',
          'Medição sincronizada com Bling com sucesso.',
          'SIGNED'
        );

        Alert.alert(
          'Sucesso',
          'Medição finalizada, estoque atualizado e sincronização com Bling realizada.',
          [
            {
              text: 'OK',
              onPress: () => navigation.replace('ClienteDetalhes', { clientId }),
            },
          ]
        );
      } catch (blingError) {
        console.error('Erro ao sincronizar com Bling:', blingError);
        await enqueueSyncPending({
          entityType: 'MEDICAO',
          entityId: medicaoId,
          endpoint: `${BACKEND_URL}/integrations/bling/medicoes/${medicaoId}/finalize`,
          method: 'POST',
          payload: {
            localClientId: clientId,
            items: itemsForBling,
          },
          reason: 'Falha ao sincronizar medição com Bling na finalização',
        });

        await updateMeasurementSyncStatus(
          medicaoId,
          'FAILED',
          'Falha na sincronização com Bling. Adicionado à fila de pendências.',
          'FINALIZED'
        );

        Alert.alert(
          'Finalizada com pendência',
          'Medição salva e estoque atualizado. Não foi possível sincronizar com o Bling agora.',
          [
            {
              text: 'Ver pendências',
              onPress: () => navigation.navigate('PendenciasSync'),
            },
            {
              text: 'OK',
              onPress: () => navigation.replace('ClienteDetalhes', { clientId }),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Erro ao finalizar medição:', error);
      Alert.alert(
        'Falha ao finalizar medição',
        `Motivo: ${(error as Error)?.message || 'erro inesperado durante a finalização.'}\n\nComo ajustar: revise os campos obrigatórios e tente novamente.`,
      );
    } finally {
      setIsFinalizando(false);
    }
  }

  if (!client) {
    return <BymenLoader fullScreen label="Carregando medição..." />;
  }

  const pagamentoPix = paymentMethod === 'PIX';
  const discountLabel = paymentMethod === 'PIX' ? 'PIX' : 'Dinheiro';
  // Calcula desconto de 5% apenas sobre a medição; bancada fica fora

  function handleFieldFocus(event: any) {
    const target = Number(event?.nativeEvent?.target || 0);
    if (!target) return;

    // Etapa 1: ajuste inicial imediato para antecipar a subida do campo.
    setTimeout(() => {
      (scrollRef.current as any)?.scrollResponderScrollNativeHandleToKeyboard(target, 120, true);
    }, 40);

    // Etapa 2: ajuste fino após a animação do teclado para garantir visibilidade.
    setTimeout(() => {
      UIManager.measureInWindow(target, (_x, y, _width, height) => {
        const windowHeight = Dimensions.get('window').height;
        const keyboardHeight = keyboardHeightRef.current;
        const keyboardTop = keyboardHeight > 0 ? windowHeight - keyboardHeight : windowHeight * 0.58;
        const extraBottomPadding = Platform.OS === 'android' ? 40 : 24;
        const visibleBottom = keyboardTop - extraBottomPadding;
        const fieldBottom = y + height;

        if (fieldBottom <= visibleBottom) return;

        const neededDelta = fieldBottom - visibleBottom + 16;
        const targetOffset = Math.max(0, scrollOffsetYRef.current + neededDelta);
        scrollRef.current?.scrollTo({ y: targetOffset, animated: true });
      });
    }, 240);
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
      >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={(event) => {
          scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <OperationContextHeader
          title="Resumo da Medição"
          subtitle={`${client.nome} • ${dateTime}`}
          statusLabel={isFinalizando ? 'Processando' : 'Em revisão'}
        />

        {/* ================================================ */}
        {/* RESUMO: MEDIÇÃO (Produtos Vendidos)             */}
        {/* ================================================ */}
        <View
          style={{
            backgroundColor: '#F0F9FF',
            borderRadius: isTablet ? 12 : 8,
            padding: isTablet ? 16 : 12,
            marginBottom: isTablet ? 12 : 8,
            borderWidth: 1,
            borderColor: '#3B82F6'
          }}
        >
          <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#1E40AF', marginBottom: 8 }}>
            📊 Medição (Produtos Vendidos)
          </Text>
          {medicaoRowsSummary}
          <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
            <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#1E40AF' }}>
              Valor Medição: {formatCurrency(valorMedicao)}
            </Text>
            {hasFivePercentDiscount && (
              <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#059669', marginTop: 4 }}>
                Valor com {discountLabel}: {formatCurrency(valorMedicaoComDesconto)}
              </Text>
            )}
          </View>
        {/* Legenda */}
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: '#6B7280', fontSize: fontSize.small }}>
            Legenda: PE = Produtos em Estoque | PV = Produtos Vendidos | PR = Produtos Repostos | PN = Produtos Não Vendidos | PRD = Produtos Retirados | NE = Novo Estoque
          </Text>
        </View>
      </View>

        {/* ================================================ */}
        {/* RESUMO: BANCADA (Uso Interno)                   */}
        {/* ================================================ */}
        <View
          style={{
            backgroundColor: '#FEF2F2',
            borderRadius: isTablet ? 12 : 8,
            padding: isTablet ? 16 : 12,
            marginBottom: isTablet ? 12 : 8,
            borderWidth: 1,
            borderColor: '#DC2626'
          }}
        >
          <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#991B1B', marginBottom: 8 }}>
            🏪 Bancada (Uso Interno)
          </Text>
          {bancadaRowsSummary}
          <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
            <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#991B1B' }}>
              Valor Bancada: {formatCurrency(valorBancada)}
            </Text>
          </View>
        </View>

        {/* ================================================ */}
        {/* RESUMO: BONIFICAÇÃO (Produtos Bônus)           */}
        {/* ================================================ */}
        <View
          style={{
            backgroundColor: '#D1FAE5',
            borderRadius: isTablet ? 12 : 8,
            padding: isTablet ? 16 : 12,
            marginBottom: isTablet ? 12 : 8,
            borderWidth: 1,
            borderColor: '#059669'
          }}
        >
          <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#059669', marginBottom: 8 }}>
            Bonificação
          </Text>
          {bonusRowsSummary}
          {bonusStockIssues.length > 0 && (
            <View style={{ marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' }}>
              <Text style={{ color: '#B91C1C', fontWeight: '700', marginBottom: 4 }}>
                Pendências de bonificação antes de finalizar
              </Text>
              {bonusStockIssues.map((issue) => (
                <Text key={issue.id} style={{ color: '#B91C1C', fontSize: fontSize.small }}>
                  {issue.nome}: solicitado {issue.required} • disponível {issue.available}
                </Text>
              ))}
            </View>
          )}
          <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
            <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#059669' }}>
              Total de produtos bonificados: {totalBonusItems}
            </Text>
          </View>
        </View>

        {/* ================================================ */}
        {/* RESPONSÁVEL PELA MEDIÇÃO                        */}
        {/* ================================================ */}
        <View style={{ marginTop: isTablet ? 16 : 12 }}>
          <Text style={{ fontSize: fontSize.base, color: '#111827', fontWeight: '600', marginBottom: isTablet ? 8 : 6 }}>
            Responsável pela medição
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: isTablet ? 12 : 8,
              padding: isTablet ? 16 : 12,
              fontSize: fontSize.base
            }}
            placeholder="Nome do responsável"
            value={responsavel}
            onChangeText={setResponsavel}
            onFocus={handleFieldFocus}
          />
            <Text style={{ fontSize: fontSize.base, color: '#111827', fontWeight: '600', marginTop: isTablet ? 12 : 8, marginBottom: isTablet ? 8 : 6 }}>
              Observações
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: isTablet ? 12 : 8,
                padding: isTablet ? 16 : 12,
                fontSize: fontSize.base,
                minHeight: 60,
                textAlignVertical: 'top'
              }}
              placeholder="Digite observações gerais da medição (opcional)"
              multiline
              value={observacoes}
              onChangeText={setObservacoes}
              onFocus={handleFieldFocus}
            />
        </View>

          <View style={{ marginTop: isTablet ? 12 : 10 }}>
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
                Desconto {discountLabel}: {PAYMENT_DISCOUNT_PERCENT}%
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
          </View>

        {/* Assinatura */}
        <View
          style={{
            alignSelf: 'flex-start',
            marginTop: isTablet ? 12 : 10,
            marginBottom: 10,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: hasSignature ? '#DCFCE7' : '#FEE2E2',
          }}
        >
          <Text style={{ color: hasSignature ? '#166534' : '#991B1B', fontSize: fontSize.small, fontWeight: '700' }}>
            {hasSignature ? '✓ Assinatura coletada' : '⚠ Assinatura pendente'}
          </Text>
        </View>
        <SignaturePad label="Assinatura do responsável da barbearia" onChange={setSignatureDataUrl} />
        {!hasSignature && (
          <Text style={{ color: '#B91C1C', marginTop: 8, fontSize: fontSize.small }}>
            A assinatura é obrigatória para finalizar a medição.
          </Text>
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
            marginTop: isTablet ? 16 : 12
          }}
        >
          <Text style={{ fontSize: fontSize.base, color: '#6B7280', marginBottom: 4 }}>
            Medição: {formatCurrency(valorMedicao)}
          </Text>
          {hasFivePercentDiscount && (
            <Text style={{ fontSize: fontSize.base, color: '#059669', marginBottom: 4 }}>
              Desconto {discountLabel} aplicado: -{PAYMENT_DISCOUNT_PERCENT}% ({formatCurrency(valorDescontoAplicado)})
            </Text>
          )}
          <Text style={{ fontSize: fontSize.base, color: '#6B7280', marginBottom: 4 }}>
            Bancada: {formatCurrency(valorBancada)}
          </Text>
          <Text style={{ fontSize: fontSize.base, color: '#6B7280', marginBottom: 8 }}>
            Bonificação: {totalBonusItems} produtos
          </Text>
          {paymentMethod === 'CARTAO' && isCardInstallment && (
            <>
              <Text style={{ fontSize: fontSize.base, color: '#1D4ED8', marginBottom: 4 }}>
                Juros do parcelamento ({installments}x): +{formatCurrency(creditInterestValue)}
              </Text>
              <Text style={{ fontSize: fontSize.base, color: '#1D4ED8', marginBottom: 4 }}>
                Simulação: {installments}x de {formatCurrency(installmentValue)}
              </Text>
            </>
          )}
          <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8 }}>
            <Text style={{ fontSize: fontSize.large, fontWeight: '600', color: '#111827' }}>Total Geral</Text>
            <Text style={{ fontSize: fontSize.xlarge, fontWeight: '700', color: '#111827', marginTop: 4 }}>
              {formatCurrency(totalFinal)}
            </Text>
          </View>
        </View>

        <View style={{ height: 12 }} />
        <Button
          title={isFinalizando ? 'Finalizando medição...' : 'Finalizar medição'}
          icon="checkmark-circle-outline"
          onPress={handleFinalizarMedicao}
          disabled={isFinalizando || bonusStockIssues.length > 0 || !hasSignature}
        />
        <View style={{ height: 12 }} />
        <Button title="Gerar PDF" icon="document-outline" onPress={handleGerarPDF} disabled={!hasSignature} />
        <View style={{ height: 12 }} />
        <Button
          title="Enviar via WhatsApp"
          icon="logo-whatsapp"
          onPress={handleEnviarWhatsApp}
          variant="secondary"
          disabled={!hasSignature}
        />
      </ScrollView>
      <BymenLoadingOverlay visible={isFinalizando} label="Finalizando medição..." />
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
