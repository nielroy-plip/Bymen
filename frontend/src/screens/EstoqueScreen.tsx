import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Alert, Pressable, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Dimensions, UIManager } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../routes';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import {
  listProducts,
  addProductStock,
  removeProductStock,
  createProduct,
  deleteProduct,
  getCurrentUser,
  listUsersForManagement,
  transferDistributorStockToUser,
  ManagedUser,
  ProductVisibilityMap,
  ProductVisibilityTarget,
  listProductVisibilityRules,
  restoreProductVisibility,
  setProductVisibilityForFlow,
} from '../services/api';
import { Product } from '../components/ProductRow';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getProductUnit } from '../utils/product';
import { sortByCatalogOrder } from '../utils/productOrder';
import { canManageUsers, getUserAppRole } from '../services/access';
import {
  getDefaultStockCriticalThreshold,
  getProductCriticalThreshold,
  getStockCriticalThresholds,
  saveProductCriticalThreshold,
  StockCriticalThresholds,
} from '../services/stockCritical';

type Props = NativeStackScreenProps<RootStackParamList, 'Estoque'>;

export default function EstoqueScreen({ navigation }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const keyboardHeightRef = useRef(0);
  const scrollOffsetYRef = useRef(0);
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
  const [isGestor, setIsGestor] = useState(false);
  const [streetUsers, setStreetUsers] = useState<ManagedUser[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [visibilityRules, setVisibilityRules] = useState<ProductVisibilityMap>({});
  const [criticalThresholds, setCriticalThresholds] = useState<StockCriticalThresholds>({});
  const [criticalInputs, setCriticalInputs] = useState<Record<string, string>>({});
  const [savingCriticalByProduct, setSavingCriticalByProduct] = useState<Record<string, boolean>>({});
  const criticalItems = useMemo(
    () =>
      products
        .map((item) => {
          const limite = getProductCriticalThreshold(item.id, criticalThresholds);
          return {
            id: item.id,
            nome: item.nome,
            linha: item.linha,
            estoque: item.estoque ?? 0,
            limite,
          };
        })
        .filter((item) => item.estoque <= item.limite),
    [products, criticalThresholds],
  );
  const criticalProdutos = useMemo(
    () => criticalItems.filter((item) => !item.id.startsWith('b')),
    [criticalItems]
  );
  const criticalBancada = useMemo(
    () => criticalItems.filter((item) => item.id.startsWith('b')),
    [criticalItems]
  );
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

  function handleFieldFocus(event: any) {
    const target = Number(event?.nativeEvent?.target || 0);
    if (!target) return;

    setTimeout(() => {
      UIManager.measureInWindow(target, (_x, y, _width, height) => {
        const windowHeight = Dimensions.get('window').height;
        const keyboardHeight = keyboardHeightRef.current;
        const keyboardTop = keyboardHeight > 0 ? windowHeight - keyboardHeight : windowHeight * 0.58;
        const visibleBottom = keyboardTop - 20;
        const fieldBottom = y + height;

        if (fieldBottom <= visibleBottom) return;

        const neededDelta = fieldBottom - visibleBottom + 16;
        const targetOffset = Math.max(0, scrollOffsetYRef.current + neededDelta);
        scrollRef.current?.scrollTo({ y: targetOffset, animated: true });
      });
    }, 90);
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

  async function loadProducts() {
    const [thresholds, user, visibility] = await Promise.all([
      getStockCriticalThresholds(),
      getCurrentUser(),
      listProductVisibilityRules(),
    ]);

    const userEmail = String(user?.email || '').trim().toLowerCase();
    const appRole = getUserAppRole(user);
    const gestor = canManageUsers(appRole);
    const prods = await listProducts();

    setProducts(sortByCatalogOrder(prods));
    setCriticalThresholds(thresholds);
    setIsGestor(gestor);
    setCurrentUserEmail(userEmail);
    setVisibilityRules(visibility);

    if (gestor && userEmail) {
      try {
        const users = await listUsersForManagement(userEmail);
        const eligibleUsers = users.filter((item) => {
          const role = String(item.role || '').trim().toUpperCase();
          return role === 'VENDEDOR' || role === 'SUPERVISOR';
        });
        setStreetUsers(eligibleUsers);
      } catch {
        setStreetUsers([]);
      }
    } else {
      setStreetUsers([]);
    }

    setCriticalInputs((prev) => {
      const next = { ...prev };
      prods.forEach((product) => {
        if (typeof next[product.id] !== 'string' || next[product.id].trim().length === 0) {
          next[product.id] = String(getProductCriticalThreshold(product.id, thresholds));
        }
      });
      return next;
    });
  }

  function getStreetUserLabel(email: string) {
    const normalized = String(email || '').trim().toLowerCase();
    const user = streetUsers.find((item) => String(item.email || '').trim().toLowerCase() === normalized);
    return user?.username || user?.email || normalized;
  }

  function selectTransferTargetEmail(): Promise<string | null> {
    if (!isGestor) {
      return Promise.resolve(currentUserEmail || null);
    }

    if (streetUsers.length === 0) {
      return Promise.resolve(null);
    }

    if (streetUsers.length === 1) {
      return Promise.resolve(String(streetUsers[0].email || '').trim().toLowerCase());
    }

    return new Promise((resolve) => {
      Alert.alert(
        'Transferir para quem?',
        'Selecione o vendedor/supervisor de destino.',
        [
          ...streetUsers.slice(0, 8).map((user) => ({
            text: String(user.username || user.email),
            onPress: () => resolve(String(user.email || '').trim().toLowerCase()),
          })),
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
        ],
      );
    });
  }

  async function handleTransferToStreet(productId: string, tab: 'produtos' | 'bancada') {
    const quantityMap = tab === 'bancada' ? bancadaQuantities : quantities;
    const qty = parseInt(quantityMap[productId] || '0');

    if (qty <= 0) {
      Alert.alert('Erro', 'Quantidade deve ser maior que 0');
      return;
    }

    const targetEmail = (await selectTransferTargetEmail())?.trim().toLowerCase() || '';

    if (!targetEmail) {
      Alert.alert('Validação', 'Selecione um vendedor/supervisor para transferir o estoque.');
      return;
    }

    try {
      const success = await transferDistributorStockToUser(targetEmail, productId, qty);
      if (!success) {
        Alert.alert('Erro', 'Estoque geral insuficiente para esta retirada.');
        return;
      }

      if (tab === 'bancada') {
        setBancadaQuantities((prev) => ({ ...prev, [productId]: '' }));
      } else {
        setQuantities((prev) => ({ ...prev, [productId]: '' }));
      }

      await loadProducts();
      Alert.alert('Sucesso', `Estoque transferido para ${getStreetUserLabel(targetEmail)}.`);
    } catch {
      Alert.alert('Erro', 'Não foi possível transferir o estoque para rua.');
    }
  }

  async function handleSaveCriticalThreshold(productId: string) {
    const raw = String(criticalInputs[productId] || '').trim();
    const value = Number(raw);

    if (!Number.isFinite(value) || value < 0) {
      Alert.alert('Validação', 'Informe um limite crítico válido (0 ou maior).');
      return;
    }

    setSavingCriticalByProduct((prev) => ({ ...prev, [productId]: true }));
    try {
      const next = await saveProductCriticalThreshold(productId, value);
      setCriticalThresholds(next);
      setCriticalInputs((prev) => ({ ...prev, [productId]: String(Math.floor(value)) }));
      Alert.alert('Sucesso', 'Limite crítico atualizado para este produto.');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o limite crítico.');
    } finally {
      setSavingCriticalByProduct((prev) => ({ ...prev, [productId]: false }));
    }
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

  function getProductTargetByTab(productId: string, flow: 'VENDAS' | 'CONSIGNADO'): ProductVisibilityTarget {
    const isBancada = String(productId || '').startsWith('b');
    if (flow === 'VENDAS') {
      return isBancada ? 'VENDAS_BANCADA' : 'VENDAS_PRODUTOS';
    }
    return isBancada ? 'CONSIGNADO_BANCADA' : 'CONSIGNADO_PRODUTOS';
  }

  function isHiddenInTarget(productId: string, target: ProductVisibilityTarget): boolean {
    const hiddenIn = visibilityRules[productId]?.hiddenIn || [];
    return hiddenIn.includes(target);
  }

  function getProductVisibilityNote(productId: string) {
    const hiddenIn = visibilityRules[productId]?.hiddenIn || [];
    if (hiddenIn.length === 0) return null;

    const labels: Record<ProductVisibilityTarget, string> = {
      VENDAS_PRODUTOS: 'Vendas/Produtos',
      VENDAS_BANCADA: 'Vendas/Bancada',
      CONSIGNADO_PRODUTOS: 'Consignado/Produtos',
      CONSIGNADO_BANCADA: 'Consignado/Bancada',
    };

    return hiddenIn.map((item) => labels[item]).join(' • ');
  }

  async function toggleHideProductInFlow(productId: string, flow: 'VENDAS' | 'CONSIGNADO') {
    const target = getProductTargetByTab(productId, flow);
    const hidden = isHiddenInTarget(productId, target);
    await setProductVisibilityForFlow(productId, target, !hidden);
    await loadProducts();

    Alert.alert(
      'Sucesso',
      hidden
        ? `Produto restaurado na aba ${flow === 'VENDAS' ? 'Vendas' : 'Consignado'}.`
        : `Produto removido da aba ${flow === 'VENDAS' ? 'Vendas' : 'Consignado'}.`,
    );
  }

  function handleProductRemoveActions(product: Product) {
    Alert.alert(
      'Remover produto',
      'Escolha como deseja remover este item.',
      [
        {
          text: isHiddenInTarget(product.id, getProductTargetByTab(product.id, 'VENDAS'))
            ? 'Restaurar em Vendas'
            : 'Remover da aba Vendas',
          onPress: () => {
            void toggleHideProductInFlow(product.id, 'VENDAS');
          },
        },
        {
          text: isHiddenInTarget(product.id, getProductTargetByTab(product.id, 'CONSIGNADO'))
            ? 'Restaurar em Consignado'
            : 'Remover da aba Consignado',
          onPress: () => {
            void toggleHideProductInFlow(product.id, 'CONSIGNADO');
          },
        },
        {
          text: 'Restaurar todas as visibilidades',
          onPress: () => {
            void (async () => {
              await restoreProductVisibility(product.id);
              await loadProducts();
              Alert.alert('Sucesso', 'Visibilidade restaurada para todas as abas.');
            })();
          },
        },
        {
          text: 'Excluir do app',
          style: 'destructive',
          onPress: () => {
            void handleDeleteProduct(product);
          },
        },
        { text: 'Cancelar', style: 'cancel' },
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
        onScroll={(event) => {
          scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
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
                onFocus={handleFieldFocus}
                placeholder="Ex.: Shampoo"
              />

              <Input
                label="Linha"
                value={newProductLine}
                onChangeText={setNewProductLine}
                onFocus={handleFieldFocus}
                placeholder="Ex.: Wood, Ocean"
              />

              <Input
                label="Capacidade (ml ou g)"
                value={newProductCap}
                onChangeText={(text) => setNewProductCap(text.replace(/\D/g, ''))}
                onFocus={handleFieldFocus}
                keyboardType="numeric"
                placeholder="Ex.: 240"
              />

              <Input
                label="Valor de venda"
                value={newProductSalePrice}
                onChangeText={(text) => setNewProductSalePrice(formatCurrencyInput(text))}
                onFocus={handleFieldFocus}
                keyboardType="decimal-pad"
                placeholder="Ex.: 65,00"
              />

              <Input
                label="Valor no consignado"
                value={newProductConsignedPrice}
                onChangeText={(text) => setNewProductConsignedPrice(formatCurrencyInput(text))}
                onFocus={handleFieldFocus}
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
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F766E', marginBottom: 8 }}>
            Estoque na rua
          </Text>
          <Text style={{ color: '#6B7280', marginBottom: 10 }}>
            Para manter esta tela mais limpa, o detalhamento completo foi movido para uma página dedicada.
          </Text>
          <Button
            title="Abrir tela de estoque na rua"
            icon="trail-sign-outline"
            onPress={() => navigation.navigate('RelatorioEstoqueRua')}
            variant="secondary"
          />
        </Card>

        <Card>
          <Pressable
            onPress={() => setShowCriticalDetails((prev) => !prev)}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#92400E' }}>
              Estoque crítico por produto
            </Text>
            <Text style={{ color: '#92400E', fontWeight: '700' }}>
              {showCriticalDetails ? 'Ocultar lista' : 'Mostrar lista'}
            </Text>
          </Pressable>

          <Text style={{ color: '#6B7280', marginBottom: showCriticalDetails ? 10 : 0 }}>
            Total: {criticalItems.length} • Produtos: {criticalProdutos.length} • Bancada: {criticalBancada.length}
          </Text>

          {!isGestor && (
            <Text style={{ color: '#92400E', marginBottom: showCriticalDetails ? 10 : 0 }}>
              Apenas Gestor pode alterar o limite crítico por item.
            </Text>
          )}

          {showCriticalDetails && (
            <>
              <Text style={{ color: '#1E40AF', fontWeight: '700', marginBottom: 6 }}>Produtos</Text>
              {criticalProdutos.length > 0 ? (
                criticalProdutos.map((item) => (
                  <Text key={item.id} style={{ color: '#1E40AF', marginBottom: 4 }}>
                    • {item.nome} - {item.linha} ({item.estoque}/{item.limite})
                  </Text>
                ))
              ) : (
                <Text style={{ color: '#6B7280', marginBottom: 8 }}>Nenhum produto crítico.</Text>
              )}

              <Text style={{ color: '#991B1B', fontWeight: '700', marginTop: 8, marginBottom: 6 }}>Bancada</Text>
              {criticalBancada.length > 0 ? (
                criticalBancada.map((item) => (
                  <Text key={item.id} style={{ color: '#991B1B', marginBottom: 4 }}>
                    • {item.nome} - {item.linha} ({item.estoque}/{item.limite})
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
                  <Pressable onPress={() => handleProductRemoveActions(p)}>
                    <Text style={{ color: '#DC2626', fontWeight: '700' }}>Remover</Text>
                  </Pressable>
                </View>
                <Text style={{ color: '#6B7280' }}>Linha: {p.linha}</Text>
                <Text style={{ color: '#6B7280' }}>Estoque Atual: {p.estoque}</Text>
                {getProductVisibilityNote(p.id) && (
                  <Text style={{ color: '#0F766E', marginTop: 2 }}>
                    Oculto em: {getProductVisibilityNote(p.id)}
                  </Text>
                )}
                <Text style={{ color: '#92400E', fontWeight: '600' }}>
                  Limite crítico: {getProductCriticalThreshold(p.id, criticalThresholds)}
                </Text>
                {isGestor && (
                  <View style={{ marginTop: 10 }}>
                    <Input
                      label="Configurar limite crítico"
                      value={criticalInputs[p.id] || String(getProductCriticalThreshold(p.id, criticalThresholds))}
                      onChangeText={(text) => setCriticalInputs((prev) => ({ ...prev, [p.id]: text.replace(/\D/g, '') }))}
                      onFocus={handleFieldFocus}
                      placeholder={String(getDefaultStockCriticalThreshold())}
                      keyboardType="numeric"
                    />
                    <Button
                      title={savingCriticalByProduct[p.id] ? 'Salvando...' : 'Salvar limite crítico'}
                      onPress={() => handleSaveCriticalThreshold(p.id)}
                      disabled={Boolean(savingCriticalByProduct[p.id])}
                      variant="secondary"
                    />
                  </View>
                )}
                <View style={{ marginTop: 12 }}>
                  <Input
                    label="Quantidade"
                    value={quantities[p.id] || ''}
                    onChangeText={(text) => setQuantities(prev => ({ ...prev, [p.id]: text }))}
                    onFocus={handleFieldFocus}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                  {isGestor ? (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <Button title="Entrada" onPress={() => handleEntry(p.id)} variant="secondary" style={{ flex: 1 }} />
                      <Button title="Saída" onPress={() => handleExit(p.id)} style={{ flex: 1 }} />
                      <Button
                        title="Rua"
                        onPress={() => handleTransferToStreet(p.id, 'produtos')}
                        variant="secondary"
                        style={{ flex: 1 }}
                        disabled={streetUsers.length === 0}
                      />
                    </View>
                  ) : (
                    <Button title="Retirar do geral" onPress={() => handleTransferToStreet(p.id, 'produtos')} />
                  )}
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
                  <Pressable onPress={() => handleProductRemoveActions(p)}>
                    <Text style={{ color: '#DC2626', fontWeight: '700' }}>Remover</Text>
                  </Pressable>
                </View>
                <Text style={{ color: '#6B7280' }}>Linha: {p.linha}</Text>
                <Text style={{ color: '#6B7280' }}>Capacidade: {p.cap}{getProductUnit(p.nome)}</Text>
                <Text style={{ color: '#6B7280' }}>Estoque Atual: {p.estoque}</Text>
                {getProductVisibilityNote(p.id) && (
                  <Text style={{ color: '#0F766E', marginTop: 2 }}>
                    Oculto em: {getProductVisibilityNote(p.id)}
                  </Text>
                )}
                <Text style={{ color: '#92400E', fontWeight: '600' }}>
                  Limite crítico: {getProductCriticalThreshold(p.id, criticalThresholds)}
                </Text>
                {isGestor && (
                  <View style={{ marginTop: 10 }}>
                    <Input
                      label="Configurar limite crítico"
                      value={criticalInputs[p.id] || String(getProductCriticalThreshold(p.id, criticalThresholds))}
                      onChangeText={(text) => setCriticalInputs((prev) => ({ ...prev, [p.id]: text.replace(/\D/g, '') }))}
                      onFocus={handleFieldFocus}
                      placeholder={String(getDefaultStockCriticalThreshold())}
                      keyboardType="numeric"
                    />
                    <Button
                      title={savingCriticalByProduct[p.id] ? 'Salvando...' : 'Salvar limite crítico'}
                      onPress={() => handleSaveCriticalThreshold(p.id)}
                      disabled={Boolean(savingCriticalByProduct[p.id])}
                      variant="secondary"
                    />
                  </View>
                )}
                <View style={{ marginTop: 12 }}>
                  <Input
                    label="Quantidade"
                    value={bancadaQuantities[p.id] || ''}
                    onChangeText={(text) => setBancadaQuantities(prev => ({ ...prev, [p.id]: text }))}
                    onFocus={handleFieldFocus}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                  {isGestor ? (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <Button title="Entrada" onPress={() => handleBancadaEntry(p.id)} variant="secondary" style={{ flex: 1 }} />
                      <Button title="Saída" onPress={() => handleBancadaExit(p.id)} style={{ flex: 1 }} />
                      <Button
                        title="Rua"
                        onPress={() => handleTransferToStreet(p.id, 'bancada')}
                        variant="secondary"
                        style={{ flex: 1 }}
                        disabled={streetUsers.length === 0}
                      />
                    </View>
                  ) : (
                    <Button title="Retirar do geral" onPress={() => handleTransferToStreet(p.id, 'bancada')} />
                  )}
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