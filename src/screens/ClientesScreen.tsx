import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { listClients } from '../services/api';
import { Client } from '../data/clients';

type Props = NativeStackScreenProps<RootStackParamList, 'Clientes'>;

export default function ClientesScreen({ navigation }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    const data = await listClients();
    setClients(data);
  }

  // Filtrar clientes com base no texto de busca
  const filteredClients = useMemo(() => {
    if (!searchText.trim()) {
      return clients;
    }

    const search = searchText.toLowerCase().trim();
    return clients.filter((client) => {
      return (
        client.nome.toLowerCase().includes(search) ||
        client.responsavel?.toLowerCase().includes(search) ||
        client.cnpjCpf?.toLowerCase().includes(search) ||
        client.telefone?.toLowerCase().includes(search)
      );
    });
  }, [clients, searchText]);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 16 }}>Clientes</Text>
        
        {/* Campo de busca */}
        <Input
          label="🔍 Buscar"
          placeholder="Nome, responsável, CNPJ ou telefone..."
          value={searchText}
          onChangeText={setSearchText}
        />
        
        <View style={{ height: 16 }} />
        <Button title="+ Nova Barbearia" onPress={() => navigation.navigate('CadastrarCliente')} variant="secondary" />
        
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
            <Pressable key={c.id} onPress={() => navigation.navigate('ClienteDetalhes', { clientId: c.id })}>
              <Card>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{c.nome}</Text>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
