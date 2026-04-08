import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TouchableWithoutFeedback, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import { Client } from '../data/clients';
import { listClients, listProducts, SaleItem } from '../services/api';
import { formatCurrency } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Vendas'>;

type StockProduct = {
  id: string;
  nome: string;
  linha: string;
  cap: number;
  preco: number;
  estoque: number;
};

export default function VendasScreen({ navigation, route }: Props) {
  const clientId = route.params.clientId;
  const [client, setClient] = useState<Client | undefined>();
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [activeTab, setActiveTab] = useState<'produtos' | 'bancada'>('produtos');
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadData() {
      const [clients, allProducts] = await Promise.all([listClients(), listProducts()]);
      setClient(clients.find((c) => c.id === clientId));

      const saleProducts = allProducts.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          linha: p.linha,
          cap: p.cap,
          preco: p.preco,
          estoque: p.estoque ?? 0,
        }));

      setProducts(saleProducts);
    }

    loadData();
  }, [clientId]);

  const items = useMemo<SaleItem[]>(() => {
    return products
      .map((p) => {
        const quantidade = Number(quantities[p.id] || 0);
        return {
          id: p.id,
          nome: p.nome,
          linha: p.linha,
          cap: p.cap,
          preco: p.preco,
          quantidade,
          valorTotal: quantidade * p.preco,
        };
      })
      .filter((item) => item.quantidade > 0);
  }, [products, quantities]);

  const displayedProducts = useMemo(
    () => products.filter((p) => (activeTab === 'bancada' ? p.id.startsWith('b') : !p.id.startsWith('b'))),
    [activeTab, products],
  );

  const total = useMemo(() => items.reduce((acc, item) => acc + item.valorTotal, 0), [items]);

  async function handleFinalizarVenda() {
    if (!client) {
      Alert.alert('Cliente não encontrado', 'Selecione uma barbearia válida para continuar.');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Sem itens', 'Informe pelo menos um item para finalizar a venda.');
      return;
    }

    const withoutStock = items
      .map((item) => {
        const product = products.find((p) => p.id === item.id);
        return {
          ...item,
          estoqueDisponivel: product?.estoque ?? 0,
        };
      })
      .filter((item) => item.quantidade > item.estoqueDisponivel);

    if (withoutStock.length > 0) {
      const message = withoutStock
        .slice(0, 4)
        .map((item) => `${item.nome}: solicitado ${item.quantidade}, disponível ${item.estoqueDisponivel}`)
        .join('\n');

      Alert.alert('Estoque insuficiente', message);
      return;
    }

    navigation.navigate('FinalizarVenda', {
      clientId: client.id,
      items,
      total,
    });
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
      >
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Venda</Text>
          <Text style={{ color: '#6B7280', marginBottom: 16 }}>
            Barbearia: {client?.nome || 'Carregando...'}
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <Pressable
              onPress={() => setActiveTab('produtos')}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: activeTab === 'produtos' ? '#1D4ED8' : '#EFF6FF',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: activeTab === 'produtos' ? '#FFFFFF' : '#1D4ED8', fontWeight: '700' }}>Produtos</Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('bancada')}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: activeTab === 'bancada' ? '#991B1B' : '#FEE2E2',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: activeTab === 'bancada' ? '#FFFFFF' : '#991B1B', fontWeight: '700' }}>Bancada</Text>
            </Pressable>
          </View>

          {displayedProducts.map((product) => (
            <Card key={product.id}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{product.nome}</Text>
              <Text style={{ color: '#6B7280', marginTop: 4 }}>
                {product.linha} • {product.cap}ml • Disponível: {product.estoque}
              </Text>
              <Text style={{ color: '#1F2937', marginTop: 4, fontWeight: '600' }}>
                {formatCurrency(product.preco)}
              </Text>
              <View style={{ marginTop: 12 }}>
                <Input
                  label="Quantidade"
                  value={quantities[product.id] || ''}
                  onChangeText={(text) =>
                    setQuantities((prev) => ({
                      ...prev,
                      [product.id]: text.replace(/\D/g, ''),
                    }))
                  }
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </Card>
          ))}

          <Card>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Resumo</Text>
            <Text style={{ color: '#6B7280', marginTop: 6 }}>
              Itens: {items.reduce((acc, item) => acc + item.quantidade, 0)}
            </Text>
            <Text style={{ color: '#111827', marginTop: 6, fontSize: 18, fontWeight: '700' }}>
              Total: {formatCurrency(total)}
            </Text>
          </Card>

          <Button
            title="Finalizar venda"
            onPress={handleFinalizarVenda}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
