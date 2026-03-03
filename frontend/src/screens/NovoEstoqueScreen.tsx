import React, { useState } from 'react';
import * as Sharing from 'expo-sharing';
import { View, Text, ScrollView, Alert, Pressable, Platform, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import { PRODUCTS, PRODUTOS_BANCADA } from '../data/products';
import { generateEstoquePDF } from '../services/pdf';
import SignaturePad from '../components/SignaturePad';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { addClientInitialStock, removeProductStock, saveClient } from '../services/api';
import { getProductUnit } from '../utils/product';

type Props = NativeStackScreenProps<RootStackParamList, 'NovoEstoque'>;

  const NovoEstoqueScreen: React.FC<Props> = ({ navigation, route }) => {
    const [activeTab, setActiveTab] = useState<'produtos' | 'bancada'>('produtos');
    // Estado para produtos normais (estoque inicial, não cobrados)
    const [estoque, setEstoque] = useState<Record<string, string>>({});
    // Estado para produtos de bancada (estoque inicial, cobrados)
    const [bancada, setBancada] = useState<Record<string, string>>({});
    // Estado para PDF gerado
    const [pdfUri, setPdfUri] = useState<string | null>(null);
    // Estado para assinatura
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | undefined>(undefined);
    const [stockSent, setStockSent] = useState(false);
    const [isSendingStock, setIsSendingStock] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [clientSaved, setClientSaved] = useState(false);
    const requiresSignature = Platform.OS !== 'web';
  
    function handleChangeEstoque(id: string, value: string) {
      setEstoque(prev => ({ ...prev, [id]: value }));
    }
    function handleChangeBancada(id: string, value: string) {
      setBancada(prev => ({ ...prev, [id]: value }));
    }
  
    function getSelectedItems() {
      const selectedProdutos = Object.entries(estoque).filter(([_, v]) => Number(v || 0) > 0);
      const selectedBancada = Object.entries(bancada).filter(([_, v]) => Number(v || 0) > 0);
      return { selectedProdutos, selectedBancada };
    }

    function isFormReady() {
      const { selectedProdutos, selectedBancada } = getSelectedItems();
      return selectedProdutos.length > 0 || selectedBancada.length > 0;
    }

    function validateRequiredFields() {
      if (!isFormReady()) {
        Alert.alert(
          'Campos obrigatórios',
          'Motivo: nenhum item de estoque foi informado.\n\nComo ajustar: preencha ao menos uma quantidade maior que zero em Produtos ou Bancada.',
        );
        return false;
      }

      if (requiresSignature && !signatureDataUrl) {
        Alert.alert(
          'Campos obrigatórios',
          'Motivo: assinatura do responsável não foi informada.\n\nComo ajustar: assine no campo "Assinatura do responsável" antes de enviar.',
        );
        return false;
      }

      return true;
    }

    async function ensureDraftClientSaved() {
      if (clientSaved) {
        return;
      }

      const draftClient = route.params?.draftClient;
      if (!draftClient) {
        return;
      }

      await saveClient(draftClient);
      setClientSaved(true);
    }

    async function applyInitialStockIfNeeded() {
      if (stockSent) {
        return true;
      }

      const { selectedProdutos, selectedBancada } = getSelectedItems();
      const targetClientId = route.params?.draftClient?.id;

      for (const [productId, value] of selectedProdutos) {
        const qty = Number(value || 0);
        const ok = await removeProductStock(productId, qty);
        if (!ok) {
          Alert.alert(
            'Falha ao enviar estoque',
            `Motivo: estoque insuficiente para o produto ${productId}.\n\nComo ajustar: reduza a quantidade informada ou reabasteça o estoque principal antes de reenviar.`,
          );
          return false;
        }
      }

      for (const [productId, value] of selectedBancada) {
        const qty = Number(value || 0);
        const ok = await removeProductStock(productId, qty);
        if (!ok) {
          Alert.alert(
            'Falha ao enviar estoque',
            `Motivo: estoque insuficiente para o item de bancada ${productId}.\n\nComo ajustar: revise a quantidade de bancada ou ajuste o estoque principal.`,
          );
          return false;
        }
      }

      if (targetClientId) {
        await addClientInitialStock(targetClientId, { estoque, bancada });
      }

      setStockSent(true);
      return true;
    }

    async function handleEnviarNovoEstoque() {
      if (stockSent) {
        Alert.alert('Estoque já enviado', 'O estoque inicial deste cliente já foi enviado nesta operação.');
        return;
      }

      if (!validateRequiredFields()) {
        return;
      }

      setIsSendingStock(true);
      try {
        await ensureDraftClientSaved();
        const sent = await applyInitialStockIfNeeded();
        if (!sent) {
          return;
        }
        Alert.alert('Sucesso', 'Novo estoque do cliente enviado com sucesso.');
      } catch (error) {
        Alert.alert(
          'Falha ao enviar estoque',
          `Motivo: ${(error as Error)?.message || 'erro inesperado no envio.'}\n\nComo ajustar: verifique a conexão e tente novamente em alguns segundos.`,
        );
      } finally {
        setIsSendingStock(false);
      }
    }

    async function handleGerarPDF() {
      if (!validateRequiredFields()) {
        return;
      }

      setIsGeneratingPdf(true);
      try {
        await ensureDraftClientSaved();

        const sent = await applyInitialStockIfNeeded();
        if (!sent) {
          return;
        }

        const draftClientName = route.params?.draftClient?.nome || 'Barbearia';
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const dateOnly = `${day}/${month}/${year}`;
        const uri = await generateEstoquePDF({
          estoque,
          bancada,
          signatureDataUrl,
          clientName: draftClientName,
          dateTime: dateOnly,
        });
        setPdfUri(uri);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert(
            'PDF gerado',
            'Motivo: o compartilhamento não está disponível neste dispositivo.\n\nComo ajustar: abra o PDF por um gerenciador de arquivos para enviar manualmente.',
          );
        }

        Alert.alert('Sucesso', 'PDF gerado e estoque inicial cadastrado com sucesso.', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Clientes'),
          },
        ]);
      } catch (error) {
        Alert.alert(
          'Erro ao gerar PDF',
          `Motivo: ${(error as Error)?.message || 'falha na geração do arquivo.'}\n\nComo ajustar: confirme conexão estável e tente novamente. Se persistir, feche e abra o app.`,
        );
      } finally {
        setIsGeneratingPdf(false);
      }
    }
  
    // Resumo
    const totalProdutos = Object.values(estoque).reduce((acc, v) => acc + (parseInt(v) || 0), 0);
    const totalBancadaQtd = Object.values(bancada).reduce((acc, v) => acc + (parseInt(v) || 0), 0);
    const totalBancadaValor = PRODUTOS_BANCADA.reduce((acc, p) => acc + ((parseInt(bancada[p.id]) || 0) * p.preco), 0);
    const missingRequirements: string[] = [];

    if (!isFormReady()) {
      missingRequirements.push('informar ao menos 1 item de estoque');
    }

    if (requiresSignature && !signatureDataUrl) {
      missingRequirements.push('coletar assinatura do responsável');
    }

    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#fff' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
        >
        <View style={{ flexDirection: 'row', marginTop: 16, marginHorizontal: 24, marginBottom: 0, gap: 8 }}>
          <Pressable
            onPress={() => setActiveTab('produtos')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 8,
              backgroundColor: activeTab === 'produtos' ? '#3B82F6' : '#F3F4F6',
              alignItems: 'center',
              marginBottom: 8
            }}
          >
            <Ionicons name="cube-outline" size={18} color={activeTab === 'produtos' ? '#fff' : '#3B82F6'} style={{ marginRight: 4 }} />
            <Text style={{ fontWeight: '700', color: activeTab === 'produtos' ? '#FFFFFF' : '#6B7280' }}>Produtos</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('bancada')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 8,
              backgroundColor: activeTab === 'bancada' ? '#DC2626' : '#F3F4F6',
              alignItems: 'center',
              marginBottom: 8,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <MaterialCommunityIcons name="table-furniture" size={18} color={activeTab === 'bancada' ? '#fff' : '#DC2626'} style={{ marginRight: 4 }} />
            <Text style={{ fontWeight: '700', color: activeTab === 'bancada' ? '#FFFFFF' : '#6B7280' }}>Bancada</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Text style={{ fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Novo Estoque Inicial</Text>
          {activeTab === 'produtos' && (
            <>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#3B82F6', marginBottom: 8 }}>Produtos (não cobrados)</Text>
              {PRODUCTS.map(p => (
                <View style={{ marginBottom: 12 }} key={p.id}>
                  <Card>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{p.nome}</Text>
                    <Text style={{ color: '#6B7280' }}>Linha: {p.linha}</Text>
                    <Text style={{ color: '#6B7280' }}>Capacidade: {p.cap}{getProductUnit(p.nome)}</Text>
                    <Input
                      label="Quantidade Inicial"
                      value={estoque[p.id] || ''}
                      onChangeText={v => handleChangeEstoque(p.id, v)}
                      placeholder="0"
                      keyboardType="numeric"
                    />
                  </Card>
                </View>
              ))}
            </>
          )}
          {activeTab === 'bancada' && (
            <>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#DC2626', marginBottom: 8 }}>Produtos de Bancada (cobrados)</Text>
              {PRODUTOS_BANCADA.map(p => (
                <View style={{ marginBottom: 12 }} key={p.id}>
                  <Card>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{p.nome}</Text>
                    <Text style={{ color: '#6B7280' }}>Linha: {p.linha}</Text>
                    <Text style={{ color: '#6B7280' }}>Capacidade: {p.cap}{getProductUnit(p.nome)}</Text>
                    <Text style={{ color: '#991B1B', fontWeight: '600' }}>Valor unitário: R${p.preco.toFixed(2).replace('.',',')}</Text>
                    <Input
                      label="Quantidade Inicial"
                      value={bancada[p.id] || ''}
                      onChangeText={v => handleChangeBancada(p.id, v)}
                      placeholder="0"
                      keyboardType="numeric"
                    />
                  </Card>
                </View>
              ))}
            </>
          )}
          {/* Card resumo */}
          <View style={{ marginTop: 24, marginBottom: 24, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
            <Text style={{ fontWeight: '700', fontSize: 18, marginBottom: 8, color: '#111827' }}>Resumo do Estoque</Text>
            <Text style={{ color: '#3B82F6', fontSize: 16, marginBottom: 4 }}>Total de produtos: {totalProdutos}</Text>
            <Text style={{ color: '#DC2626', fontSize: 16, marginBottom: 4 }}>Total de produtos de bancada: {totalBancadaQtd}</Text>
            {totalBancadaQtd > 0 && (
              <Text style={{ color: '#991B1B', fontSize: 16, fontWeight: '700' }}>Valor total dos produtos de bancada: R${totalBancadaValor.toFixed(2).replace('.', ',')}</Text>
            )}
            <Text style={{ color: stockSent ? '#16A34A' : '#B45309', fontSize: 14, marginTop: 8 }}>
              {stockSent ? 'Status: estoque inicial enviado.' : 'Status: estoque inicial pendente de envio.'}
            </Text>
          </View>
          <SignaturePad label="Assinatura do responsável" onChange={setSignatureDataUrl} />
          <Button
            title={isSendingStock ? 'Enviando...' : stockSent ? 'Estoque Enviado' : 'Enviar Novo Estoque do Cliente'}
            onPress={handleEnviarNovoEstoque}
            disabled={isSendingStock || stockSent || isGeneratingPdf}
            style={{ marginTop: 8 }}
          />
          <Button
            title={isGeneratingPdf ? 'Gerando PDF...' : 'Gerar PDF do Estoque'}
            onPress={handleGerarPDF}
            disabled={isGeneratingPdf || isSendingStock}
            style={{ marginTop: 8 }}
          />
          {missingRequirements.length > 0 && (
            <Text style={{ color: '#B45309', fontSize: 13, marginTop: 8 }}>
              Pendente para concluir: {missingRequirements.join(' • ')}.
            </Text>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    );
  };
  
  export default NovoEstoqueScreen;
