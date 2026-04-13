import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Alert, Pressable, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../routes';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { listProducts, addProductStock, removeProductStock, createProduct, deleteProduct } from '../services/api';
import { Product } from '../components/ProductRow';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getProductUnit } from '../utils/product';

type Props = NativeStackScreenProps<RootStackParamList, 'Estoque'>;

export default function EstoqueScreen({}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'produtos' | 'bancada'>('produtos');
  const [bancadaQuantities, setBancadaQuantities] = useState<Record<string, string>>({});
  const [showCriticalDetails, setShowCriticalDetails] = useState(false);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductLine, setNewProductLine] = useState('');
  const [newProductCap, setNewProductCap] = useState('');
  const [newProductSalePrice, setNewProductSalePrice] = useState('');
  const [newProductConsignedPrice, setNewProductConsignedPrice] = useState('');
  const [newProductAsProduto, setNewProductAsProduto] = useState(true);
  const [newProductAsBancada, setNewProductAsBancada] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const criticalItems = useMemo(
    () => products.filter((item) => (item.estoque ?? 0) <= 10).map((item) => ({
      id: item.id,
      nome: item.nome,
      linha: item.linha,
      estoque: item.estoque ?? 0,
    })),
    [products]
  );
  const criticalProdutos = useMemo(
    () => criticalItems.filter((item) => !item.id.startsWith('b')),
    [criticalItems]
  );
  const criticalBancada = useMemo(
    () => criticalItems.filter((item) => item.id.startsWith('b')),
    [criticalItems]
  );

  function handleFieldFocus(event: any) {
    const target = event.nativeEvent.target;
    setTimeout(() => {
      (scrollRef.current as any)?.scrollResponderScrollNativeHandleToKeyboard(target, 120, true);
    }, 40);
  }

  // Funções para movimentação de estoque de bancada
  async function handleBancadaEntry(productId: string) {
    const qty = parseInt(bancadaQuantities[productId] || '0');
    if (qty <= 0) {
      Alert.alert('Erro', 'Quantidade deve ser maior que 0');
      return;
    }
    try {
      await addProductStock(productId, qty);
      setBancadaQuantities(prev => ({ ...prev, [productId]: '' }));
      await loadProducts();
      Alert.alert('Sucesso', 'Entrada registrada');
    } catch {
      Alert.alert('Erro', 'Falha ao registrar entrada no Supabase (homologação).');
    }
  }

  async function handleBancadaExit(productId: string) {
    const qty = parseInt(bancadaQuantities[productId] || '0');
    if (qty <= 0) {
      Alert.alert('Erro', 'Quantidade deve ser maior que 0');
      return;
    }
    try {
      const success = await removeProductStock(productId, qty);
      if (!success) {
        Alert.alert('Erro', 'Estoque insuficiente');
        return;
      }
      setBancadaQuantities(prev => ({ ...prev, [productId]: '' }));
      await loadProducts();
      Alert.alert('Sucesso', 'Saída registrada');
    } catch {
      Alert.alert('Erro', 'Falha ao registrar saída no Supabase (homologação).');
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadProducts();
      return undefined;
    }, [])
  );

  function sortProductsByDisplayOrder(list: Product[]) {
    return [...list].sort((a, b) => {
      const lineComparison = String(a.linha || '').localeCompare(String(b.linha || ''), 'pt-BR', {
        sensitivity: 'base',
      });
      if (lineComparison !== 0) return lineComparison;

      const nameComparison = String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', {
        sensitivity: 'base',
      });
      if (nameComparison !== 0) return nameComparison;

      return Number(a.cap || 0) - Number(b.cap || 0);
    });
  }

  async function loadProducts() {
    const prods = await listProducts();
    setProducts(sortProductsByDisplayOrder(prods));
  }

  async function handleEntry(productId: string) {
    const qty = parseInt(quantities[productId] || '0');
    if (qty <= 0) {
      Alert.alert('Erro', 'Quantidade deve ser maior que 0');
      return;
    }
    try {
      await addProductStock(productId, qty);
      setQuantities(prev => ({ ...prev, [productId]: '' }));
      await loadProducts();
      Alert.alert('Sucesso', 'Entrada registrada');
    } catch {
      Alert.alert('Erro', 'Falha ao registrar entrada no Supabase (homologação).');
    }
  }

  async function handleExit(productId: string) {
    const qty = parseInt(quantities[productId] || '0');
    if (qty <= 0) {
      Alert.alert('Erro', 'Quantidade deve ser maior que 0');
      return;
    }
    try {
      const success = await removeProductStock(productId, qty);
      if (!success) {
        Alert.alert('Erro', 'Estoque insuficiente');
        return;
      }
      setQuantities(prev => ({ ...prev, [productId]: '' }));
      await loadProducts();
      Alert.alert('Sucesso', 'Saída registrada');
    } catch {
      Alert.alert('Erro', 'Falha ao registrar saída no Supabase (homologação).');
    }
  }

  function parseCurrencyInput(value: string) {
    const normalized = String(value || '').replace(',', '.').replace(/[^\d.]/g, '');
    return Number(normalized || 0);
  }

  function formatCurrencyInput(value: string) {
    return value.replace(/[^\d,.]/g, '');
  }

  function clearNewProductForm() {
    setNewProductName('');
    setNewProductLine('');
    setNewProductCap('');
    setNewProductSalePrice('');
    setNewProductConsignedPrice('');
    setNewProductAsProduto(true);
    setNewProductAsBancada(false);
  }

  function toggleNewProductTarget(target: 'PRODUTO' | 'BANCADA') {
    if (target === 'PRODUTO') {
      const next = !newProductAsProduto;
      if (!next && !newProductAsBancada) {
        return;
      }
      setNewProductAsProduto(next);
      return;
    }

    const next = !newProductAsBancada;
    if (!next && !newProductAsProduto) {
      return;
    }
    setNewProductAsBancada(next);
  }

  async function handleCreateProduct() {
    const cap = Number(newProductCap.replace(/\D/g, ''));
    const precoVenda = parseCurrencyInput(newProductSalePrice);
    const precoConsignado = parseCurrencyInput(newProductConsignedPrice);
    const selectedTypes: Array<'PRODUTO' | 'BANCADA'> = [];

    if (newProductAsProduto) selectedTypes.push('PRODUTO');
    if (newProductAsBancada) selectedTypes.push('BANCADA');

    if (!newProductName.trim() || !newProductLine.trim() || cap <= 0 || precoVenda <= 0 || precoConsignado <= 0) {
      Alert.alert(
        'Campos obrigatórios',
        'Preencha nome, linha, capacidade e valores maiores que zero para cadastrar o produto.',
      );
      return;
    }

    if (selectedTypes.length === 0) {
      Alert.alert('Campos obrigatórios', 'Selecione ao menos um tipo: Produto, Bancada ou ambos.');
      return;
    }

    setIsCreatingProduct(true);
    try {
      for (const tipo of selectedTypes) {
        await createProduct({
          nome: newProductName,
          linha: newProductLine,
          cap,
          precoVenda,
          precoConsignado,
          tipo,
        });
      }

      await loadProducts();
      setActiveTab(selectedTypes.includes('PRODUTO') ? 'produtos' : 'bancada');
      clearNewProductForm();
      setShowNewProductForm(false);
      Alert.alert(
        'Sucesso',
        selectedTypes.length === 2
          ? 'Produto cadastrado em Produto e Bancada com a mesma linha/modelo.'
          : 'Produto cadastrado com sucesso.',
      );
    } catch (error) {
      Alert.alert('Erro', (error as Error)?.message || 'Falha ao cadastrar produto.');
    } finally {
      setIsCreatingProduct(false);
    }
  }

  async function handleDeleteProduct(product: Product) {
    Alert.alert(
      'Excluir produto',
      `Deseja excluir "${product.nome}" da linha ${product.linha}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(product.id);
              setQuantities((prev) => {
                const next = { ...prev };
                delete next[product.id];
                return next;
              });
              setBancadaQuantities((prev) => {
                const next = { ...prev };
                delete next[product.id];
                return next;
              });
              await loadProducts();
              Alert.alert('Sucesso', 'Produto excluído com sucesso.');
            } catch (error) {
              Alert.alert('Não foi possível excluir', (error as Error)?.message || 'Falha ao excluir produto.');
            }
          },
        },
      ],
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
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
            marginBottom: 8,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6
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
          <MaterialCommunityIcons name="table-furniture" size={18} color={activeTab === 'bancada' ? '#fff' : '#3B82F6'} style={{ marginRight: 4 }} />
          <Text style={{ fontWeight: '700', color: activeTab === 'bancada' ? '#FFFFFF' : '#6B7280' }}>Bancada</Text>
        </Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 24, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Estoque</Text>

        <Card>
          <Pressable
            onPress={() => setShowNewProductForm((prev) => !prev)}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: showNewProductForm ? 12 : 0 }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
              Cadastrar novo produto
            </Text>
            <Text style={{ color: '#1D4ED8', fontWeight: '700' }}>
              {showNewProductForm ? 'Fechar' : 'Abrir'}
            </Text>
          </Pressable>

          {showNewProductForm && (
            <>
              <Input
                label="Nome do produto"
                value={newProductName}
                onChangeText={setNewProductName}
                placeholder="Ex.: Shampoo"
              />

              <Input
                label="Linha"
                value={newProductLine}
                onChangeText={setNewProductLine}
                placeholder="Ex.: Wood, Ocean"
              />

              <Input
                label="Capacidade (ml ou g)"
                value={newProductCap}
                onChangeText={(text) => setNewProductCap(text.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholder="Ex.: 240"
              />

              <Input
                label="Valor de venda"
                value={newProductSalePrice}
                onChangeText={(text) => setNewProductSalePrice(formatCurrencyInput(text))}
                keyboardType="decimal-pad"
                placeholder="Ex.: 65,00"
              />

              <Input
                label="Valor no consignado"
                value={newProductConsignedPrice}
                onChangeText={(text) => setNewProductConsignedPrice(formatCurrencyInput(text))}
                keyboardType="decimal-pad"
                placeholder="Ex.: 42,00"
              />

              <Text style={{ color: '#374151', fontWeight: '600', marginBottom: 8 }}>Tipo</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <Pressable
                  onPress={() => toggleNewProductTarget('PRODUTO')}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: newProductAsProduto ? '#2563EB' : '#D1D5DB',
                    backgroundColor: newProductAsProduto ? '#EFF6FF' : '#FFFFFF',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#1D4ED8', fontWeight: '700' }}>Produto</Text>
                </Pressable>

                <Pressable
                  onPress={() => toggleNewProductTarget('BANCADA')}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: newProductAsBancada ? '#B91C1C' : '#D1D5DB',
                    backgroundColor: newProductAsBancada ? '#FEF2F2' : '#FFFFFF',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#991B1B', fontWeight: '700' }}>Bancada</Text>
                </Pressable>
              </View>

              <Text style={{ color: '#6B7280', marginBottom: 10 }}>
                Dica: selecione os dois para cadastrar o mesmo produto em Produto e Bancada.
              </Text>

              <Button
                title={isCreatingProduct ? 'Cadastrando...' : 'Salvar novo produto'}
                onPress={handleCreateProduct}
                disabled={isCreatingProduct}
              />
            </>
          )}
        </Card>

        <Card>
          <Pressable
            onPress={() => setShowCriticalDetails((prev) => !prev)}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#92400E' }}>
              Estoque crítico (≤ 10)
            </Text>
            <Text style={{ color: '#92400E', fontWeight: '700' }}>
              {showCriticalDetails ? 'Ocultar lista' : 'Mostrar lista'}
            </Text>
          </Pressable>

          <Text style={{ color: '#6B7280', marginBottom: showCriticalDetails ? 10 : 0 }}>
            Total: {criticalItems.length} • Produtos: {criticalProdutos.length} • Bancada: {criticalBancada.length}
          </Text>

          {showCriticalDetails && (
            <>
              <Text style={{ color: '#1E40AF', fontWeight: '700', marginBottom: 6 }}>Produtos</Text>
              {criticalProdutos.length > 0 ? (
                criticalProdutos.map((item) => (
                  <Text key={item.id} style={{ color: '#1E40AF', marginBottom: 4 }}>
                    • {item.nome} - {item.linha} ({item.estoque})
                  </Text>
                ))
              ) : (
                <Text style={{ color: '#6B7280', marginBottom: 8 }}>Nenhum produto crítico.</Text>
              )}

              <Text style={{ color: '#991B1B', fontWeight: '700', marginTop: 8, marginBottom: 6 }}>Bancada</Text>
              {criticalBancada.length > 0 ? (
                criticalBancada.map((item) => (
                  <Text key={item.id} style={{ color: '#991B1B', marginBottom: 4 }}>
                    • {item.nome} - {item.linha} ({item.estoque})
                  </Text>
                ))
              ) : (
                <Text style={{ color: '#6B7280' }}>Nenhum item de bancada crítico.</Text>
              )}
            </>
          )}
        </Card>

        {activeTab === 'produtos' && (
          products.filter(p => !p.id.startsWith('b')).map((p) => (
            <View key={p.id} style={{ marginBottom: 16 }}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', flex: 1, marginRight: 12 }}>{p.nome}</Text>
                  <Pressable onPress={() => handleDeleteProduct(p)}>
                    <Text style={{ color: '#DC2626', fontWeight: '700' }}>Excluir</Text>
                  </Pressable>
                </View>
                <Text style={{ color: '#6B7280' }}>Linha: {p.linha}</Text>
                <Text style={{ color: '#6B7280' }}>Estoque Atual: {p.estoque}</Text>
                <View style={{ marginTop: 12 }}>
                  <Input
                    label="Quantidade"
                    value={quantities[p.id] || ''}
                    onChangeText={(text) => setQuantities(prev => ({ ...prev, [p.id]: text }))}
                    onFocus={handleFieldFocus}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <Button title="Entrada" onPress={() => handleEntry(p.id)} variant="secondary" style={{ flex: 1 }} />
                    <Button title="Saída" onPress={() => handleExit(p.id)} style={{ flex: 1 }} />
                  </View>
                </View>
              </Card>
            </View>
          ))
        )}
        {activeTab === 'bancada' && (
          products.filter(p => p.id.startsWith('b')).map((p) => (
            <View key={p.id} style={{ marginBottom: 16 }}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', flex: 1, marginRight: 12 }}>{p.nome}</Text>
                  <Pressable onPress={() => handleDeleteProduct(p)}>
                    <Text style={{ color: '#DC2626', fontWeight: '700' }}>Excluir</Text>
                  </Pressable>
                </View>
                <Text style={{ color: '#6B7280' }}>Linha: {p.linha}</Text>
                <Text style={{ color: '#6B7280' }}>Capacidade: {p.cap}{getProductUnit(p.nome)}</Text>
                <Text style={{ color: '#6B7280' }}>Estoque Atual: {p.estoque}</Text>
                <View style={{ marginTop: 12 }}>
                  <Input
                    label="Quantidade"
                    value={bancadaQuantities[p.id] || ''}
                    onChangeText={(text) => setBancadaQuantities(prev => ({ ...prev, [p.id]: text }))}
                    onFocus={handleFieldFocus}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <Button title="Entrada" onPress={() => handleBancadaEntry(p.id)} variant="secondary" style={{ flex: 1 }} />
                    <Button title="Saída" onPress={() => handleBancadaExit(p.id)} style={{ flex: 1 }} />
                  </View>
                </View>
              </Card>
            </View>
          ))
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}