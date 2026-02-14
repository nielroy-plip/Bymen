import React, { useState } from 'react';
import * as Sharing from 'expo-sharing';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import { PRODUCTS, PRODUTOS_BANCADA } from '../data/products';
import * as Print from 'expo-print';
import { generateEstoquePDF } from '../services/pdf';
import SignaturePad from '../components/SignaturePad';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

  const NovoEstoqueScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'produtos' | 'bancada'>('produtos');
    // Estado para produtos normais (estoque inicial, não cobrados)
    const [estoque, setEstoque] = useState<Record<string, string>>({});
    // Estado para produtos de bancada (estoque inicial, cobrados)
    const [bancada, setBancada] = useState<Record<string, string>>({});
    // Estado para PDF gerado
    const [pdfUri, setPdfUri] = useState<string | null>(null);
    // Estado para assinatura
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | undefined>(undefined);
  
    function handleChangeEstoque(id: string, value: string) {
      setEstoque(prev => ({ ...prev, [id]: value }));
    }
    function handleChangeBancada(id: string, value: string) {
      setBancada(prev => ({ ...prev, [id]: value }));
    }
  
    async function handleGerarPDF() {
      try {
        // Gera o PDF usando utilitário igual FinalizarMedicaoScreen
        const uri = await generateEstoquePDF({ estoque, bancada, signatureDataUrl });
        setPdfUri(uri);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert('PDF gerado!', 'O PDF foi gerado, mas o compartilhamento não está disponível neste dispositivo.');
        }
      } catch (error) {
        Alert.alert('Erro ao gerar PDF', 'Ocorreu um erro ao gerar o PDF.');
      }
    }
  
    // Resumo
    const totalProdutos = Object.values(estoque).reduce((acc, v) => acc + (parseInt(v) || 0), 0);
    const totalBancadaQtd = Object.values(bancada).reduce((acc, v) => acc + (parseInt(v) || 0), 0);
    const totalBancadaValor = PRODUTOS_BANCADA.reduce((acc, p) => acc + ((parseInt(bancada[p.id]) || 0) * p.preco), 0);

    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
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
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <Text style={{ fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Novo Estoque Inicial</Text>
          {activeTab === 'produtos' && (
            <>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#3B82F6', marginBottom: 8 }}>Produtos (não cobrados)</Text>
              {PRODUCTS.map(p => (
                <View style={{ marginBottom: 12 }} key={p.id}>
                  <Card>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{p.nome}</Text>
                    <Text style={{ color: '#6B7280' }}>Linha: {p.linha}</Text>
                    <Text style={{ color: '#6B7280' }}>Capacidade: {p.cap}{p.nome.includes('Pomada')||p.nome.includes('Pó')?'g':'ml'}</Text>
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
                    <Text style={{ color: '#6B7280' }}>Capacidade: {p.cap}{p.nome.includes('Pomada')||p.nome.includes('Pó')?'g':'ml'}</Text>
                    <Text style={{ color: '#991B1B', fontWeight: '600' }}>Valor unitário: R$ {p.preco.toFixed(2).replace('.',',')}</Text>
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
              <Text style={{ color: '#991B1B', fontSize: 16, fontWeight: '700' }}>Valor total dos produtos de bancada: R$ {totalBancadaValor.toFixed(2).replace('.', ',')}</Text>
            )}
          </View>
          <SignaturePad label="Assinatura do responsável" onChange={setSignatureDataUrl} />
          <Button title="Gerar PDF do Estoque" onPress={handleGerarPDF} style={{ marginTop: 8 }} />
        </ScrollView>
      </View>
    );
  };
  
  export default NovoEstoqueScreen;
