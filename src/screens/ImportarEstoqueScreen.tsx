import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Button from '../components/Button';
import Card from '../components/Card';
import { PRODUCTS } from '../data/products';
import { saveMeasurement } from '../services/api';
import { formatDateTime } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'ImportarEstoque'>;

export default function ImportarEstoqueScreen({ navigation }: Props) {
  const [csvText, setCsvText] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  function parseCSV(csv: string) {
    const lines = csv.trim().split('\n');
    const rows = lines.map(line => line.split(','));
    return rows;
  }

  async function handleImport() {
    if (!clientName.trim() || !csvText.trim()) {
      Alert.alert('Erro', 'Preencha nome do cliente e dados da planilha');
      return;
    }

    try {
      const data = parseCSV(csvText);
      const medicaoRows = data.map(([nome, estoqueStr]) => {
        const product = PRODUCTS.find(p => p.nome === nome.trim());
        if (!product) throw new Error(`Produto não encontrado: ${nome}`);
        const estoqueAtual = parseInt(estoqueStr.trim()) || 0;
        return {
          id: product.id,
          nome: product.nome,
          linha: product.linha,
          cap: product.cap,
          preco: product.preco,
          precoSugestao: product.precoSugestao,
          estoqueAtual,
          vendidos: 0,
          repostos: 0,
          diferenca: 0,
          novoEstoque: estoqueAtual,
          valorMedicao: 0
        };
      });

      const dateTime = formatDateTime(new Date());

      const clientId = clientName.trim().toLowerCase().replace(/[^a-z0-9]/gi, '-') || 'imported';
      const client = { id: clientId, nome: clientName, telefone: clientPhone };
      await saveMeasurement({
        id: Date.now().toString(),
        clientId: client.id,
        medicaoRows: medicaoRows,
        bancadaRows: [],
        valorMedicao: 0,
        valorBancada: 0,
        totalGeral: 0,
        dateTime,
        total: undefined,
        rows: undefined
      });

      Alert.alert('Sucesso', 'Estoque importado como medição');
      navigation.goBack();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      Alert.alert('Erro', errorMessage);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Importar Estoque Cliente</Text>
        <Card>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>Dados do Cliente</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 8,
              padding: 12,
              marginBottom: 12
            }}
            placeholder="Nome do Cliente"
            value={clientName}
            onChangeText={setClientName}
          />
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 8,
              padding: 12,
              marginBottom: 12
            }}
            placeholder="Telefone (opcional)"
            value={clientPhone}
            onChangeText={setClientPhone}
            keyboardType="phone-pad"
          />
        </Card>
        <Card>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>Dados da Planilha (CSV)</Text>
          <Text style={{ color: '#6B7280', marginBottom: 8 }}>Formato: Produto,Estoque</Text>
          <Text style={{ color: '#6B7280', marginBottom: 12 }}>Exemplo:</Text>
          <Text style={{ color: '#6B7280', fontFamily: 'monospace', marginBottom: 12 }}>
            Shampoo Fortificante,50{'\n'}Balm Pós-Barba,30
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 8,
              padding: 12,
              height: 120,
              textAlignVertical: 'top'
            }}
            placeholder="Cole o conteúdo da planilha aqui..."
            value={csvText}
            onChangeText={setCsvText}
            multiline
          />
        </Card>
        <Button title="Importar" onPress={handleImport} />
      </ScrollView>
    </View>
  );
}