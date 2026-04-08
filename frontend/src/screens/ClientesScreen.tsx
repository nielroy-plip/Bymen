import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { listClients } from '../services/api';
import { Client } from '../data/clients';

type Props = NativeStackScreenProps<RootStackParamList, 'Clientes'>;

export default function ClientesScreen({ navigation, route }: Props) {
  const mode = route.params?.mode || 'manage';
  const isConsignadoMode = mode === 'consignado';
  const isVendasMode = mode === 'vendas';
  const [clients, setClients] = useState<Client[]>([]);
  const [searchText, setSearchText] = useState('');
  const [visualFilter, setVisualFilter] = useState<'ALL' | 'VENDA' | 'CONSIGNADO'>('ALL');

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    const data = await listClients();
    setClients(data);
  }

  // Filtrar clientes com base no texto de busca
  const filteredClients = useMemo(() => {
    const modeFiltered = clients.filter((client) => {
      if (isVendasMode) return client.operationMode === 'VENDA';
      if (isConsignadoMode) return client.operationMode !== 'VENDA';
      return true;
    });

    const visualFiltered = modeFiltered.filter((client) => {
      if (isVendasMode || isConsignadoMode) return true;
      if (visualFilter === 'VENDA') return client.operationMode === 'VENDA';
      if (visualFilter === 'CONSIGNADO') return client.operationMode !== 'VENDA';
      return true;
    });

    if (!searchText.trim()) {
      return visualFiltered;
    }

    const search = searchText.toLowerCase().trim();
    return visualFiltered.filter((client) => {
      return (
        client.nome.toLowerCase().includes(search) ||
        client.responsavel?.toLowerCase().includes(search) ||
        client.cnpjCpf?.toLowerCase().includes(search) ||
        client.telefone?.toLowerCase().includes(search)
      );
    });
  }, [clients, isConsignadoMode, isVendasMode, searchText, visualFilter]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
      >
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
          {isVendasMode ? 'Vendas' : isConsignadoMode ? 'Consignado' : 'Barbearias'}
        </Text>
        <Text style={{ color: '#6B7280', marginBottom: 12 }}>
          {isVendasMode
            ? 'Selecione uma barbearia para registrar a venda.'
            : isConsignadoMode
            ? 'Selecione uma barbearia para iniciar a medição.'
            : 'Gerencie as barbearias cadastradas.'}
        </Text>
        
        {/* Campo de busca */}
        <Input
          label="🔍 Buscar"
          placeholder="Nome, responsável, CNPJ ou telefone..."
          value={searchText}
          onChangeText={setSearchText}
        />

        {!isConsignadoMode && !isVendasMode && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Pressable
              onPress={() => setVisualFilter('ALL')}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: visualFilter === 'ALL' ? '#111827' : '#F3F4F6',
              }}
            >
              <Text style={{ color: visualFilter === 'ALL' ? '#FFFFFF' : '#374151', fontWeight: '700' }}>Todos</Text>
            </Pressable>
            <Pressable
              onPress={() => setVisualFilter('VENDA')}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: visualFilter === 'VENDA' ? '#1D4ED8' : '#EFF6FF',
              }}
            >
              <Text style={{ color: visualFilter === 'VENDA' ? '#FFFFFF' : '#1D4ED8', fontWeight: '700' }}>Vendas</Text>
            </Pressable>
            <Pressable
              onPress={() => setVisualFilter('CONSIGNADO')}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: visualFilter === 'CONSIGNADO' ? '#0F766E' : '#ECFEFF',
              }}
            >
              <Text style={{ color: visualFilter === 'CONSIGNADO' ? '#FFFFFF' : '#0F766E', fontWeight: '700' }}>
                Consignado
              </Text>
            </Pressable>
          </View>
        )}
        
        <View style={{ height: 16 }} />
        {!isConsignadoMode && !isVendasMode && (
          <Button title="Nova Barbearia" onPress={() => navigation.navigate('CadastrarCliente')} variant="secondary" />
        )}
        
        <View style={{ height: 16 }} />
        
        {/* Contador de resultados */}
        {searchText.trim() !== '' && (
          <Text style={{ color: '#6B7280', marginBottom: 12, fontSize: 14 }}>
            {filteredClients.length} {filteredClients.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
          </Text>
        )}
        
        {/* Lista de clientes filtrados */}
        {filteredClients.length === 0 ? (
          <Card>
            <Text style={{ color: '#9CA3AF', textAlign: 'center', fontStyle: 'italic' }}>
              {searchText.trim() ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </Text>
          </Card>
        ) : (
          filteredClients.map((c) => (
            <Pressable
              key={c.id}
              onPress={() =>
                isConsignadoMode
                  ? navigation.navigate('CriarMedicao', { clientId: c.id })
                  : isVendasMode
                    ? navigation.navigate('Vendas', { clientId: c.id })
                    : navigation.navigate('ClienteDetalhes', { clientId: c.id })
              }
            >
              <Card>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{c.nome}</Text>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: 8,
                    backgroundColor: c.operationMode === 'VENDA' ? '#DBEAFE' : '#CCFBF1',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ color: c.operationMode === 'VENDA' ? '#1D4ED8' : '#0F766E', fontSize: 12, fontWeight: '700' }}>
                    {c.operationMode === 'VENDA' ? 'Vendas' : 'Consignado'}
                  </Text>
                </View>
                {isConsignadoMode && (
                  <Text style={{ color: '#3B82F6', marginTop: 6, fontWeight: '600' }}>
                    Iniciar medição
                  </Text>
                )}
                {isVendasMode && (
                  <Text style={{ color: '#2563EB', marginTop: 6, fontWeight: '600' }}>
                    Registrar venda
                  </Text>
                )}
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
