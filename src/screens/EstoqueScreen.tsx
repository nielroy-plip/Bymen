import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { listProducts, addProductStock, removeProductStock } from '../services/api';
import { Product } from '../components/ProductRow';
import { PRODUTOS_BANCADA } from '../data/products';
import BancadaRowComponent from '../components/BancadaRow';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Estoque'>;

export default function EstoqueScreen({ navigation }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'produtos' | 'bancada'>('produtos');
  const [bancadaQuantities, setBancadaQuantities] = useState<Record<string, string>>({});

  // Funções para movimentação de estoque de bancada
  async function handleBancadaEntry(productId: string) {
    const qty = parseInt(bancadaQuantities[productId] || '0');
    if (qty <= 0) {
      Alert.alert('Erro', 'Quantidade deve ser maior que 0');
      return;
    }
    await addProductStock(productId, qty);
    setBancadaQuantities(prev => ({ ...prev, [productId]: '' }));
    await loadProducts();
    Alert.alert('Sucesso', 'Entrada registrada');
  }

  async function handleBancadaExit(productId: string) {
    const qty = parseInt(bancadaQuantities[productId] || '0');
    if (qty <= 0) {
      Alert.alert('Erro', 'Quantidade deve ser maior que 0');
      return;
    }
    const success = await removeProductStock(productId, qty);
    if (!success) {
      Alert.alert('Erro', 'Estoque insuficiente');
      return;
    }
    setBancadaQuantities(prev => ({ ...prev, [productId]: '' }));
    await loadProducts();
    Alert.alert('Sucesso', 'Saída registrada');
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const prods = await listProducts();
    setProducts(prods);
  }

  async function handleEntry(productId: string) {
    const qty = parseInt(quantities[productId] || '0');
    if (qty <= 0) {
      Alert.alert('Erro', 'Quantidade deve ser maior que 0');
      return;
    }
    await addProductStock(productId, qty);
    setQuantities(prev => ({ ...prev, [productId]: '' }));
    loadProducts();
    Alert.alert('Sucesso', 'Entrada registrada');
  }

  async function handleExit(productId: string) {
    const qty = parseInt(quantities[productId] || '0');
    if (qty <= 0) {
      Alert.alert('Erro', 'Quantidade deve ser maior que 0');
      return;
    }
    const success = await removeProductStock(productId, qty);
    if (!success) {
      Alert.alert('Erro', 'Estoque insuficiente');
      return;
    }
    setQuantities(prev => ({ ...prev, [productId]: '' }));
    loadProducts();
    Alert.alert('Sucesso', 'Saída registrada');
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
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
          <Ionicons name="construct-outline" size={18} color={activeTab === 'bancada' ? '#fff' : '#DC2626'} style={{ marginRight: 4 }} />
          <Text style={{ fontWeight: '700', color: activeTab === 'bancada' ? '#FFFFFF' : '#6B7280' }}>Bancada</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Estoque</Text>
        {activeTab === 'produtos' && (
          products.map((p) => (
            <View key={p.id} style={{ marginBottom: 16 }}>
              <Card>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>{p.nome}</Text>
                <Text style={{ color: '#6B7280' }}>Linha: {p.linha}</Text>
                <Text style={{ color: '#6B7280' }}>Estoque Atual: {p.estoque}</Text>
                <View style={{ marginTop: 12 }}>
                  <Input
                    label="Quantidade"
                    value={quantities[p.id] || ''}
                    onChangeText={(text) => setQuantities(prev => ({ ...prev, [p.id]: text }))}
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
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>{p.nome}</Text>
                <Text style={{ color: '#6B7280' }}>Linha: {p.linha}</Text>
                <Text style={{ color: '#6B7280' }}>Capacidade: {p.cap}{p.nome.includes('Pomada') || p.nome.includes('Pó') ? 'g' : 'ml'}</Text>
                <Text style={{ color: '#6B7280' }}>Estoque Atual: {p.estoque}</Text>
                <View style={{ marginTop: 12 }}>
                  <Input
                    label="Quantidade"
                    value={bancadaQuantities[p.id] || ''}
                    onChangeText={(text) => setBancadaQuantities(prev => ({ ...prev, [p.id]: text }))}
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
    </View>
  );
}