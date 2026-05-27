import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getCurrentUser,
  listProducts,
  listStreetStockByUser,
  listStreetStockMovements,
  listUsersForManagement,
  ManagedUser,
  StreetStockMovement,
} from '../services/api';
import { canManageUsers, getUserAppRole } from '../services/access';
import BymenLoader from '../components/BymenLoader';

function getMovementLabel(type: StreetStockMovement['type']) {
  if (type === 'TRANSFER_DISTRIBUTOR_TO_USER') return 'Retirada do estoque geral';
  if (type === 'CONSUMPTION') return 'Baixa por venda/consignado';
  return 'Retorno para estoque na rua';
}

function formatDateTime(dateIso: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

type PeriodFilter = '7d' | '30d' | '90d' | 'all';

const PERIOD_OPTIONS: Array<{ value: PeriodFilter; label: string }> = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'all', label: 'Tudo' },
];

function isMovementInsidePeriod(dateIso: string, period: PeriodFilter): boolean {
  if (period === 'all') return true;

  const createdAt = new Date(dateIso).getTime();
  if (!Number.isFinite(createdAt)) return false;

  const now = Date.now();
  const windowMs = period === '7d' ? 7 * 24 * 60 * 60 * 1000 : period === '30d' ? 30 * 24 * 60 * 60 * 1000 : 90 * 24 * 60 * 60 * 1000;
  return createdAt >= now - windowMs;
}

export default function RelatorioEstoqueRuaScreen() {
  const [loading, setLoading] = useState(true);
  const [isGestor, setIsGestor] = useState(false);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [stockByUser, setStockByUser] = useState<Record<string, Record<string, number>>>({});
  const [movements, setMovements] = useState<StreetStockMovement[]>([]);
  const [productNameById, setProductNameById] = useState<Record<string, string>>({});
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30d');
  const [selectedUserFilter, setSelectedUserFilter] = useState('__ALL__');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      const appRole = getUserAppRole(currentUser);
      const gestor = canManageUsers(appRole);
      const userEmail = String(currentUser?.email || '').trim().toLowerCase();

      const [allProducts, allStreetStock, allMovements] = await Promise.all([
        listProducts(),
        listStreetStockByUser(),
        listStreetStockMovements(),
      ]);

      const productLookup: Record<string, string> = {};
      allProducts.forEach((product: any) => {
        productLookup[product.id] = `${product.nome} (${product.linha || 'Bymen'})`;
      });
      setProductNameById(productLookup);

      if (gestor && userEmail) {
        const managedUsers = await listUsersForManagement(userEmail);
        const eligibleUsers = managedUsers.filter((item) => {
          const role = String(item.role || '').trim().toUpperCase();
          return role === 'VENDEDOR' || role === 'SUPERVISOR';
        });

        setUsers(eligibleUsers);
        setStockByUser(allStreetStock);
        setMovements(allMovements.slice(0, 200));
        setIsGestor(true);

        setSelectedUserFilter((prev) => {
          if (prev === '__ALL__') return prev;
          if (eligibleUsers.some((item) => String(item.email || '').trim().toLowerCase() === prev)) {
            return prev;
          }
          return '__ALL__';
        });
      } else {
        setUsers([
          {
            email: userEmail,
            role: appRole,
            username: currentUser?.username || currentUser?.email,
          },
        ]);

        setStockByUser({
          [userEmail]: allStreetStock[userEmail] || {},
        });

        setMovements(
          allMovements
            .filter((item) => String(item.userEmail || '').trim().toLowerCase() === userEmail)
            .slice(0, 100),
        );
        setIsGestor(false);
        setSelectedUserFilter(userEmail);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return undefined;
    }, [loadData]),
  );

  const summaries = useMemo(() => {
    const normalizedSelectedUser = String(selectedUserFilter || '__ALL__').trim().toLowerCase();
    const filteredUsers = users.filter((user) => {
      if (normalizedSelectedUser === '__ALL__') return true;
      return String(user.email || '').trim().toLowerCase() === normalizedSelectedUser;
    });

    return filteredUsers
      .map((user) => {
        const email = String(user.email || '').trim().toLowerCase();
        const stock = stockByUser[email] || {};
        const movimentosUsuario = movements.filter(
          (item) =>
            String(item.userEmail || '').trim().toLowerCase() === email &&
            isMovementInsidePeriod(item.createdAt, periodFilter),
        );
        const entradas = movimentosUsuario
          .filter((item) => item.type === 'TRANSFER_DISTRIBUTOR_TO_USER' || item.type === 'RETURN_TO_USER')
          .reduce((acc, item) => acc + Number(item.quantity || 0), 0);
        const saidas = movimentosUsuario
          .filter((item) => item.type === 'CONSUMPTION')
          .reduce((acc, item) => acc + Number(item.quantity || 0), 0);
        const totalItens = Object.values(stock).reduce((acc, qty) => acc + Number(qty || 0), 0);

        return {
          email,
          nome: user.username || user.email,
          role: user.role,
          totalItens,
          entradasPeriodo: entradas,
          saidasPeriodo: saidas,
          produtos: Object.entries(stock)
            .map(([productId, qty]) => ({
              productId,
              quantity: Number(qty || 0),
              productName: productNameById[productId] || productId,
            }))
            .filter((item) => item.quantity > 0)
            .sort((a, b) => b.quantity - a.quantity),
          movimentos: movimentosUsuario,
        };
      })
      .sort((a, b) => b.totalItens - a.totalItens);
  }, [users, stockByUser, movements, productNameById, periodFilter, selectedUserFilter]);

  if (loading) {
    return <BymenLoader fullScreen label="Carregando relatório de estoque na rua..." />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 }}>
          Relatório de Estoque na Rua
        </Text>
        <Text style={{ color: '#6B7280', marginBottom: 14 }}>
          {isGestor
            ? 'Visão consolidada por vendedor/supervisor com saldo atual e histórico de movimentações.'
            : 'Seu saldo atual no estoque na rua e histórico das suas movimentações.'}
        </Text>

        <View style={{ marginBottom: 10 }}>
          <Text style={{ color: '#111827', fontWeight: '700', marginBottom: 8 }}>Período do histórico</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PERIOD_OPTIONS.map((option) => {
              const selected = option.value === periodFilter;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setPeriodFilter(option.value)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: selected ? '#0F766E' : '#D1D5DB',
                    backgroundColor: selected ? '#CCFBF1' : '#FFFFFF',
                  }}
                >
                  <Text style={{ color: selected ? '#0F766E' : '#374151', fontWeight: '700' }}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {isGestor && users.length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <Text style={{ color: '#111827', fontWeight: '700', marginBottom: 8 }}>Usuário</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pressable
                onPress={() => setSelectedUserFilter('__ALL__')}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: selectedUserFilter === '__ALL__' ? '#1D4ED8' : '#D1D5DB',
                  backgroundColor: selectedUserFilter === '__ALL__' ? '#DBEAFE' : '#FFFFFF',
                }}
              >
                <Text style={{ color: selectedUserFilter === '__ALL__' ? '#1D4ED8' : '#374151', fontWeight: '700' }}>Todos</Text>
              </Pressable>
              {users.map((user) => {
                const email = String(user.email || '').trim().toLowerCase();
                const selected = selectedUserFilter === email;
                return (
                  <Pressable
                    key={email}
                    onPress={() => setSelectedUserFilter(email)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: selected ? '#1D4ED8' : '#D1D5DB',
                      backgroundColor: selected ? '#DBEAFE' : '#FFFFFF',
                    }}
                  >
                    <Text style={{ color: selected ? '#1D4ED8' : '#374151', fontWeight: '700' }}>
                      {user.username || user.email}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {summaries.length === 0 ? (
          <View
            style={{
              backgroundColor: '#F9FAFB',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 12,
              padding: 14,
            }}
          >
            <Text style={{ color: '#6B7280' }}>Nenhum dado de estoque na rua encontrado.</Text>
          </View>
        ) : (
          summaries.map((summary) => (
            <View
              key={summary.email || summary.nome}
              style={{
                backgroundColor: '#F9FAFB',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 12,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{summary.nome}</Text>
              <Text style={{ color: '#6B7280', marginBottom: 4 }}>{summary.email}</Text>
              <Text style={{ color: '#0F766E', fontWeight: '700', marginBottom: 10 }}>
                Saldo total na rua: {summary.totalItens} itens
              </Text>
              <Text style={{ color: '#111827', marginBottom: 3 }}>
                Entradas no período: {summary.entradasPeriodo}
              </Text>
              <Text style={{ color: '#111827', marginBottom: 10 }}>
                Saídas no período: {summary.saidasPeriodo}
              </Text>

              <Text style={{ color: '#111827', fontWeight: '700', marginBottom: 6 }}>Produtos em posse</Text>
              {summary.produtos.length === 0 ? (
                <Text style={{ color: '#6B7280', marginBottom: 10 }}>Sem produtos em posse.</Text>
              ) : (
                summary.produtos.slice(0, 12).map((item) => (
                  <Text key={`${summary.email}-${item.productId}`} style={{ color: '#111827', marginBottom: 4 }}>
                    • {item.productName}: {item.quantity}
                  </Text>
                ))
              )}

              <Text style={{ color: '#111827', fontWeight: '700', marginTop: 6, marginBottom: 6 }}>
                Últimas movimentações
              </Text>
              {summary.movimentos.length === 0 ? (
                <Text style={{ color: '#6B7280' }}>Sem movimentações registradas.</Text>
              ) : (
                summary.movimentos.slice(0, 8).map((movement) => (
                  <View key={movement.id} style={{ marginBottom: 6 }}>
                    <Text style={{ color: '#111827' }}>
                      • {getMovementLabel(movement.type)} - {productNameById[movement.productId] || movement.productId} ({movement.quantity})
                    </Text>
                    <Text style={{ color: '#6B7280', fontSize: 12 }}>{formatDateTime(movement.createdAt)}</Text>
                  </View>
                ))
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
