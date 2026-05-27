import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Input from '../components/Input';
import Button from '../components/Button';
import BymenLoader from '../components/BymenLoader';
import BymenLoadingOverlay from '../components/BymenLoadingOverlay';
import { getCurrentUser, listUsersForManagement, ManagedUser, setCurrentUser, updateManagedUserRole } from '../services/api';
import { AppRole, canManageUsers, getUserAppRole } from '../services/access';

type Props = NativeStackScreenProps<RootStackParamList, 'GerenciarUsuarios'>;

const ROLE_OPTIONS: Array<{ value: AppRole; label: string; color: string }> = [
  { value: 'GESTOR', label: 'Gestor', color: '#1D4ED8' },
  { value: 'SUPERVISOR', label: 'Supervisor', color: '#B45309' },
  { value: 'VENDEDOR', label: 'Vendedor', color: '#065F46' },
];

function normalizeEmail(value: string) {
  return String(value || '').trim().toLowerCase();
}

export default function GerenciarUsuariosScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<AppRole>('VENDEDOR');
  const [search, setSearch] = useState('');

  async function loadUsers() {
    setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      const role = getUserAppRole(currentUser);

      if (!canManageUsers(role)) {
        Alert.alert('Acesso negado', 'Apenas o perfil Gestor pode gerenciar usuários.', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
        return;
      }

      const normalizedCurrentEmail = normalizeEmail(currentUser?.email || '');
      const remoteUsers = await listUsersForManagement(normalizedCurrentEmail);

      setUsers(remoteUsers);
      setCurrentUserEmail(normalizedCurrentEmail);
      setCurrentUserRole(role);
    } catch (error) {
      Alert.alert('Erro', (error as Error)?.message || 'Não foi possível carregar os usuários do sistema.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = normalizeEmail(search);
    if (!query) return users;

    return users.filter((user) => {
      return (
        user.email.includes(query) ||
        String(user.username || '').toLowerCase().includes(query) ||
        String(user.phone || '').toLowerCase().includes(query) ||
        String(user.role || '').toLowerCase().includes(query)
      );
    });
  }, [search, users]);

  async function handleChangeRole(email: string, role: AppRole) {
    const normalizedEmail = normalizeEmail(email);

    setSaving(true);
    try {
      await updateManagedUserRole({
        actorEmail: currentUserEmail,
        targetEmail: normalizedEmail,
        role,
      });

      if (normalizedEmail === currentUserEmail) {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          await setCurrentUser({
            ...currentUser,
            role,
          });
        }
        setCurrentUserRole(role);
      }

      await loadUsers();
      Alert.alert('Perfil atualizado', `O usuário ${normalizedEmail} agora está como ${role}.`);
    } catch {
      Alert.alert('Erro', 'Não foi possível alterar o perfil do usuário.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 6 }}>Gerenciar Usuários</Text>
        <Text style={{ color: '#6B7280', marginBottom: 14 }}>
          Controle de perfis para Gestor usando dados reais do backend. Altere Vendedor, Supervisor ou Gestor.
        </Text>

        <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <Text style={{ color: '#1D4ED8', fontWeight: '700', marginBottom: 4 }}>Seu acesso atual</Text>
          <Text style={{ color: '#1E3A8A' }}>{currentUserEmail || 'Sem usuário logado'}</Text>
          <Text style={{ color: '#1E3A8A' }}>Perfil: {currentUserRole}</Text>
        </View>

        <Input
          label="Buscar usuário"
          value={search}
          onChangeText={setSearch}
          placeholder="Nome, e-mail, telefone ou perfil"
        />

        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 10 }}>
          Usuários cadastrados ({filteredUsers.length})
        </Text>

        <Button title={loading ? 'Atualizando...' : 'Atualizar lista'} onPress={loadUsers} disabled={loading || saving} variant="secondary" />
        <View style={{ height: 12 }} />

        {loading ? (
          <BymenLoader compact label="Carregando usuários..." />
        ) : filteredUsers.length === 0 ? (
          <Text style={{ color: '#6B7280' }}>Nenhum usuário encontrado.</Text>
        ) : (
          filteredUsers.map((user) => {
            const isCurrentUser = user.email === currentUserEmail;

            return (
              <View
                key={user.email}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: isCurrentUser ? '#93C5FD' : '#E5E7EB',
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 12,
                  shadowColor: '#000',
                  shadowOpacity: 0.04,
                  shadowRadius: 10,
                  elevation: 1,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{user.username || 'Sem nome'}</Text>
                <Text style={{ color: '#6B7280', marginTop: 2 }}>{user.email}</Text>
                {!!user.phone && <Text style={{ color: '#6B7280', marginTop: 2 }}>{user.phone}</Text>}
                {!!user.createdAt && <Text style={{ color: '#374151', marginTop: 6 }}>Criado em: {new Date(user.createdAt).toLocaleString('pt-BR')}</Text>}

                <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {ROLE_OPTIONS.map((option) => (
                    <Button
                      key={`${user.email}-${option.value}`}
                      title={option.label}
                      variant={user.role === option.value ? 'primary' : 'secondary'}
                      onPress={() => handleChangeRole(user.email, option.value)}
                      disabled={saving}
                      style={{ minWidth: 96, borderColor: option.color }}
                    />
                  ))}
                </View>

                {isCurrentUser && (
                  <Text style={{ color: '#1D4ED8', marginTop: 10, fontWeight: '700' }}>
                    Este é o usuário logado agora.
                  </Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
      <BymenLoadingOverlay visible={saving} label="Atualizando perfil do usuário..." />
    </View>
  );
}