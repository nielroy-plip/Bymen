import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Alert, Linking } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Button from '../components/Button';
import { Client } from '../data/clients';
import { formatCurrency } from '../utils/format';
import { saveMeasurement, updateMeasurementPdf, listClients } from '../services/api';
import { generateMeasurementPDF } from '../services/pdf';
import { sharePdf } from '../services/whatsapp';
import SignaturePad from '../components/SignaturePad';
import { useResponsive } from '../hooks/useResponsive';
import * as Sharing from 'expo-sharing';
import { PRODUCTS } from '../data/products';

type Props = NativeStackScreenProps<RootStackParamList, 'FinalizarMedicao'>;

export default function FinalizarMedicaoScreen({ navigation, route }: Props) {
  const [pagamentoPix, setPagamentoPix] = useState(false);
    const [observacoes, setObservacoes] = useState('');
  const {
    clientId,
    medicaoRows,
    bancadaRows,
    valorMedicao,
    valorBancada,
    totalGeral,
    dateTime,
    responsavel: responsavelParam,
    signatureDataUrl: signatureParam,
    bonusRows: bonusRowsParam = []
  } = route.params;

  // Estado local para produtos bonificados
  const [bonusRows, setBonusRows] = useState(Array.isArray(bonusRowsParam) ? bonusRowsParam : []);
  const [selectedBonusProductId, setSelectedBonusProductId] = useState<string>('');
  const [bonusQuantity, setBonusQuantity] = useState<string>('1');
  const valorBonus = bonusRows.reduce((acc: any, r: { quantidadeComprada: any; }) => acc + (r.quantidadeComprada || 0), 0);

  const [client, setClient] = useState<Client | undefined>(undefined);
  const [pdfUri, setPdfUri] = useState<string | undefined>(undefined);
  const [responsavel, setResponsavel] = useState(responsavelParam || '');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | undefined>(signatureParam);

  useEffect(() => {
    listClients().then((clients) => {
      const c = clients.find((x) => x.id === clientId);
      setClient(c);
    });
  }, [clientId]);

  // ========================================
  // GERAR PDF CONSOLIDADO
  // ========================================
  async function handleGerarPDF() {
    try {
      if (!client) {
        Alert.alert('Erro', 'Cliente não encontrado');
        return;
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

      const id = `${clientId}-${Date.now()}`;
      const uri = await generateMeasurementPDF({
        client,
        medicaoRows: mappedMedicaoRows,
        bancadaRows: mappedBancadaRows,
        bonusRows: mappedBonusRows,
        valorMedicao,
        valorBancada,
        valorBonus,
        totalGeral,
        dateTime,
        signatureDataUrl,
        responsavelMedicao: responsavel || client.responsavel,
        observacoes,
        pagamentoPix
      });

      await updateMeasurementPdf(id, uri);
      Alert.alert('Sucesso', 'PDF gerado com sucesso!');

      // Abrir o PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        await Linking.openURL(uri);
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o PDF: ' + (error as Error).message);
    }
  }

  async function handleEnviarWhatsApp() {
    if (!pdfUri) {
      await handleGerarPDF();
    }
    if (pdfUri) {
      await sharePdf(pdfUri);
    }
  }

  const { isTablet, padding, fontSize } = useResponsive();

  if (!client) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: fontSize.base, color: '#6B7280' }}>Carregando...</Text>
      </View>
    );
  }

  // Calcula desconto PIX (5%)
  const valorMedicaoPix = pagamentoPix ? valorMedicao * 0.95 : valorMedicao;
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ padding }}>
        <Text style={{ fontSize: fontSize.large, fontWeight: '700', color: '#111827', marginBottom: isTablet ? 12 : 8 }}>
          Resumo da Medição
        </Text>
        <Text style={{ fontSize: fontSize.base, color: '#6B7280', marginBottom: isTablet ? 16 : 12 }}>
          {client.nome} • {dateTime}
        </Text>

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
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TouchableOpacity
              onPress={() => setPagamentoPix(!pagamentoPix)}
              style={{
                width: 24,
                height: 24,
                borderWidth: 2,
                borderColor: pagamentoPix ? '#059669' : '#D1D5DB',
                borderRadius: 6,
                backgroundColor: pagamentoPix ? '#059669' : '#FFF',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {pagamentoPix && (
                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>✓</Text>
              )}
            </TouchableOpacity>
            <Text style={{ marginLeft: 8 }}>Pagamento em PIX (5% de desconto)</Text>
          </View>
          <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#1E40AF', marginBottom: 8 }}>
            📊 Medição (Produtos Vendidos)
          </Text>
          {medicaoRows.length === 0 ? (
            <Text style={{ color: '#9CA3AF', fontSize: fontSize.small, fontStyle: 'italic' }}>
              Nenhum produto vendido
            </Text>
          ) : (
            medicaoRows.map((r) => (
              <View key={r.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#DBEAFE' }}>
                <Text style={{ color: '#111827', fontWeight: '600', fontSize: fontSize.small }}>
                  {r.nome} • {r.linha} • {r.cap}{(String(r.nome) || '').includes('Pomada') || (String(r.nome) || '').includes('Pó') ? 'g' : 'ml'}
                </Text>
                <Text style={{ color: '#6B7280', fontSize: fontSize.small }}>
                  PE: {r.estoqueAtual} | PV: {r.vendidos} | PR: {r.repostos} | PN: {r.diferenca} | PRD: {r.produtosRetirados ?? 0} | NE: {r.novoEstoque}
                </Text>
                <Text style={{ color: '#059669', fontWeight: '600', fontSize: fontSize.small }}>
                  {formatCurrency(r.valorMedicao)}
                </Text>
              </View>
            ))
          )}
          <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
            <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#1E40AF' }}>
              Valor Medição: {formatCurrency(valorMedicao)}
            </Text>
            {pagamentoPix && (
              <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#059669', marginTop: 4 }}>
                Valor com PIX: {formatCurrency(valorMedicaoPix)}
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
          {bancadaRows.filter(r => r.quantidadeComprada > 0).length === 0 ? (
            <Text style={{ color: '#9CA3AF', fontSize: fontSize.small, fontStyle: 'italic' }}>
              Nenhum produto de uso interno
            </Text>
          ) : (
            bancadaRows.filter(r => r.quantidadeComprada > 0).map((r) => (
              <View key={r.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#FEE2E2' }}>
                <Text style={{ color: '#111827', fontWeight: '600', fontSize: fontSize.small }}>
                  {r.nome} • {r.linha} • {r.cap}{String(r.nome || '').includes('Pomada') || String(r.nome || '').includes('Pó') ? 'g' : 'ml'}
                </Text>
                <Text style={{ color: '#6B7280', fontSize: fontSize.small }}>
                  Quantidade: {r.quantidadeComprada} × {formatCurrency(r.preco)}
                </Text>
                <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: fontSize.small }}>
                  {formatCurrency(r.valorTotal)}
                </Text>
              </View>
            ))
          )}
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
          {bonusRows.filter((r: { quantidadeComprada: number; }) => r.quantidadeComprada > 0).length === 0 ? (
            <Text style={{ color: '#9CA3AF', fontSize: fontSize.small, fontStyle: 'italic' }}>
              Nenhum produto recebido como bonificação
            </Text>
          ) : (
            bonusRows.filter((r: { quantidadeComprada: number; }) => r.quantidadeComprada > 0).map((r: any) => (
              <View key={r.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#A7F3D0' }}>
                <Text style={{ color: '#111827', fontWeight: '600', fontSize: fontSize.small }}>
                  {r.nome} • {r.linha} • {r.cap}{String(r.nome || '').includes('Pomada') || String(r.nome || '').includes('Pó') ? 'g' : 'ml'}
                </Text>
                <Text style={{ color: '#6B7280', fontSize: fontSize.small }}>
                  Quantidade: {r.quantidadeComprada}
                </Text>
              </View>
            ))
          )}
          <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
            <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#059669' }}>
              Total de produtos bonificados: {valorBonus}
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
            />
        </View>

        {/* Assinatura */}
        <SignaturePad label="Assinatura do responsável da barbearia" onChange={setSignatureDataUrl} />

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
          {pagamentoPix && (
            <Text style={{ fontSize: fontSize.base, color: '#059669', marginBottom: 4 }}>
              Desconto PIX aplicado: -5% ({formatCurrency(valorMedicao - valorMedicaoPix)})
            </Text>
          )}
          <Text style={{ fontSize: fontSize.base, color: '#6B7280', marginBottom: 4 }}>
            Bancada: {formatCurrency(valorBancada)}
          </Text>
          <Text style={{ fontSize: fontSize.base, color: '#6B7280', marginBottom: 8 }}>
            Bonificação: {bonusRows.reduce((acc: any, r: { quantidadeComprada: any; }) => acc + (r.quantidadeComprada || 0), 0)} produtos
          </Text>
          <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8 }}>
            <Text style={{ fontSize: fontSize.large, fontWeight: '600', color: '#111827' }}>Total Geral</Text>
            <Text style={{ fontSize: fontSize.xlarge, fontWeight: '700', color: '#111827', marginTop: 4 }}>
              {formatCurrency(pagamentoPix ? (totalGeral - (valorMedicao - valorMedicaoPix)) : totalGeral)}
            </Text>
          </View>
        </View>

        <View style={{ height: 12 }} />
        <Button title="Gerar PDF" icon="document-outline" onPress={handleGerarPDF} />
        <View style={{ height: 12 }} />
        <Button title="Enviar via WhatsApp" icon="logo-whatsapp" onPress={handleEnviarWhatsApp} variant="secondary" />
      </ScrollView>
    </View>
  );
}
