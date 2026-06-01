import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TouchableWithoutFeedback, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import { Client } from '../data/clients';
import {
  getCurrentUser,
  listClients,
  listProducts,
  listProductsForStreetUser,
  listProductVisibilityRules,
  ProductVisibilityMap,
  SaleItem,
} from '../services/api';
import { formatCurrency } from '../utils/format';
import { sortByCatalogOrder } from '../utils/productOrder';
import { getUserAppRole } from '../services/access';

type Props = NativeStackScreenProps<RootStackParamList, 'Vendas'>;

type StockProduct = {
  id: string;
  nome: string;
  linha: string;
  cap: number;
  preco: number;
  preco5?: number;
  preco10?: number;
  precoSugestao?: number;
  estoque: number;
};

type PromoTier = 'BASE' | 'QTD_5' | 'QTD_10';

const SALE_PRICE_OVERRIDES: Record<string, { preco: number; preco5?: number; preco10?: number }> = {
  // Linha venda
  p1: { preco: 39.9, preco5: 37.8, preco10: 35.7 },
  p2: { preco: 39.9, preco5: 37.8, preco10: 35.7 },
  p3: { preco: 32.3, preco5: 30.6, preco10: 28.9 },
  p4: { preco: 32.3, preco5: 30.6, preco10: 28.9 },
  p5: { preco: 36.1, preco5: 34.2, preco10: 32.3 },
  p6: { preco: 36.1, preco5: 34.2, preco10: 32.3 },
  p7: { preco: 42.75, preco5: 40.5, preco10: 38.25 },
  p8: { preco: 42.75, preco5: 40.5, preco10: 38.25 },
  p9: { preco: 55.1, preco5: 52.2, preco10: 49.3 },
  p10: { preco: 55.1, preco5: 52.2, preco10: 49.3 },
  p11: { preco: 55.1, preco5: 52.2, preco10: 49.3 },
  p12: { preco: 55.1, preco5: 52.2, preco10: 49.3 },
  p13: { preco: 33.25, preco5: 31.5, preco10: 29.75 },
  p14: { preco: 48.0, preco5: 45.6, preco10: 43.2 },
  p15: { preco: 45.0, preco5: 42.75, preco10: 40.5 },
  p16: { preco: 45.0, preco5: 42.75, preco10: 40.5 },
  // Linha bancada
  b1: { preco: 52.0 },
  b2: { preco: 58.0 },
  b3: { preco: 42.0 },
  b4: { preco: 46.0 },
  b12: { preco: 46.0 },
};

export default function VendasScreen({ navigation, route }: Props) {
  const clientId = route.params.clientId;
  const [client, setClient] = useState<Client | undefined>();
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [activeTab, setActiveTab] = useState<'produtos' | 'bancada'>('produtos');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [stockScopeLabel, setStockScopeLabel] = useState('Geral da empresa');
  const [visibilityRules, setVisibilityRules] = useState<ProductVisibilityMap>({});

  useEffect(() => {
    async function loadData() {
      const [clients, currentUser, visibility] = await Promise.all([
        listClients(),
        getCurrentUser(),
        listProductVisibilityRules(),
      ]);
      setClient(clients.find((c) => c.id === clientId));
      setVisibilityRules(visibility);

      const role = getUserAppRole(currentUser);
      const userEmail = String(currentUser?.email || '').trim().toLowerCase();
      const shouldUseStreetStock = (role === 'VENDEDOR' || role === 'SUPERVISOR') && userEmail.length > 0;

      const allProducts = shouldUseStreetStock
        ? await listProductsForStreetUser(userEmail)
        : await listProducts();

      setStockScopeLabel(shouldUseStreetStock ? 'Estoque na rua (seu usuário)' : 'Geral da empresa');

        const saleProducts = sortByCatalogOrder(
          allProducts.map((p: any) => {
            const override = SALE_PRICE_OVERRIDES[String(p.id || '')];
            return {
              id: p.id,
              nome: p.nome,
              linha: p.linha,
              cap: p.cap,
              preco: typeof override?.preco === 'number' ? override.preco : p.preco,
              preco5: typeof override?.preco5 === 'number' ? override.preco5 : p.preco5,
              preco10: typeof override?.preco10 === 'number' ? override.preco10 : p.preco10,
              precoSugestao: p.precoSugestao,
              estoque: p.estoque ?? 0,
            };
          }),
        );

      setProducts(saleProducts);
    }

    loadData();
  }, [clientId]);

  function getPricingForQuantity(product: StockProduct, quantity: number): {
    unitPrice: number;
    tier: PromoTier;
  } {
    if (quantity >= 10 && typeof product.preco10 === 'number') {
      return { unitPrice: product.preco10, tier: 'QTD_10' };
    }

    if (quantity >= 5 && typeof product.preco5 === 'number') {
      return { unitPrice: product.preco5, tier: 'QTD_5' };
    }

    return { unitPrice: product.preco, tier: 'BASE' };
  }

  const items = useMemo<SaleItem[]>(() => {
    return products
      .filter((p) => {
        const hidden = visibilityRules[p.id]?.hiddenIn || [];
        if (p.id.startsWith('b')) {
          return !hidden.includes('VENDAS_BANCADA');
        }
        return !hidden.includes('VENDAS_PRODUTOS');
      })
      .map((p) => {
        const quantidade = Number(quantities[p.id] || 0);
        const { unitPrice: precoAplicado, tier } = getPricingForQuantity(p, quantidade);
        return {
          id: p.id,
          nome: p.nome,
          linha: p.linha,
          cap: p.cap,
          preco: precoAplicado,
          precoBase: p.preco,
          preco5: p.preco5,
          preco10: p.preco10,
          faixaPrecoAplicada: tier,
          quantidade,
          valorTotal: quantidade * precoAplicado,
        };
      })
      .filter((item) => item.quantidade > 0);
  }, [products, quantities, visibilityRules]);

  const displayedProducts = useMemo(
    () =>
      products.filter((p) => {
        const isBancada = p.id.startsWith('b');
        const matchesTab = activeTab === 'bancada' ? isBancada : !isBancada;
        if (!matchesTab) return false;

        const hidden = visibilityRules[p.id]?.hiddenIn || [];
        if (isBancada) return !hidden.includes('VENDAS_BANCADA');
        return !hidden.includes('VENDAS_PRODUTOS');
      }),
    [activeTab, products, visibilityRules],
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
          <Text style={{ color: '#1D4ED8', marginBottom: 12, fontWeight: '700' }}>
            Estoque considerado: {stockScopeLabel}
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
              {(() => {
                const quantidadeAtual = Number(quantities[product.id] || 0);
                const { unitPrice: precoAtual } = getPricingForQuantity(product, quantidadeAtual);
                return (
                  <>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{product.nome}</Text>
              <Text style={{ color: '#6B7280', marginTop: 4 }}>
                {product.linha} • {product.cap}ml • Disponível: {product.estoque}
              </Text>
              <Text style={{ color: '#1F2937', marginTop: 4, fontWeight: '600' }}>
                Preço base: {formatCurrency(product.preco)}
              </Text>
              {(typeof product.preco5 === 'number' || typeof product.preco10 === 'number') && (
                <Text style={{ color: '#2563EB', marginTop: 2, fontSize: 12 }}>
                  Promo: 5 un = {formatCurrency(product.preco5 ?? product.preco)} • 10 un = {formatCurrency(product.preco10 ?? product.preco5 ?? product.preco)}
                </Text>
              )}
              {typeof product.precoSugestao === 'number' && (
                <Text style={{ color: '#6B7280', marginTop: 2, fontSize: 12 }}>
                  Sugestão revenda: {formatCurrency(product.precoSugestao)}
                </Text>
              )}
              {quantidadeAtual > 0 && (
                <Text style={{ color: '#059669', marginTop: 2, fontSize: 12, fontWeight: '700' }}>
                  Preço aplicado: {formatCurrency(precoAtual)}
                </Text>
              )}
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
                  </>
                );
              })()}
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
