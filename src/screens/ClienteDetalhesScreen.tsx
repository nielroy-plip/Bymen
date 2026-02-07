import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Button from '../components/Button';
import Card from '../components/Card';
import { Client } from '../data/clients';
import { listMeasurements, listClients } from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/format';
import { sum } from '../utils/calculate';

type Props = NativeStackScreenProps<RootStackParamList, 'ClienteDetalhes'>;

export default function ClienteDetalhesScreen({ navigation, route }: Props) {
  const clientId = route.params?.clientId;
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [medicoes, setMedicoes] = useState<
    Array<{ id: string; total: number; dateTime: string; rowsCount: number }>
  >([]);

  useEffect(() => {
    let isMounted = true;
    listClients().then((clients) => {
      if (isMounted) {
        const c = clients.find((x) => x.id === clientId);
        setClient(c);
      }
    });
    return () => { isMounted = false; };
  }, [clientId]);

  useEffect(() => {
    let isMounted = true;
    listMeasurements().then((items) => {
      if (isMounted) {
        const m = items.filter((it) => it.clientId === clientId);
        const mapped = m.map((it) => ({
          id: it.id,
          total: it.total,
          dateTime: it.dateTime,
          rowsCount: it.rows.length
        }));
        setMedicoes(mapped);
      }
    });
    return () => { isMounted = false; };
  }, [clientId]);

  if (!client) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 24 }}>
        <Text style={{ color: '#111827' }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 16 }}>{client.nome}</Text>
        <Card>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>Dados</Text>
          <Text style={{ color: '#6B7280', marginTop: 4 }}>CNPJ/CPF: {client.cnpjCpf}</Text>
          <Text style={{ color: '#6B7280' }}>Endereço: {client.endereco}</Text>
          <Text style={{ color: '#6B7280' }}>Responsável: {client.responsavel}</Text>
          <Text style={{ color: '#6B7280' }}>Telefone: {client.telefone.replace(/^\+\d{2}\s?/, '')}</Text>
        </Card>
        <Card>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>Últimas medições</Text>
          {medicoes.length === 0 && [1,2,3].map((i) => (
            <View
              key={i}
              style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', opacity: 0.8 }}
            >
              <Text style={{ color: '#111827' }}>{formatDateTime(new Date(Date.now() - i * 86400000))}</Text>
              <Text style={{ color: '#6B7280' }}>R$ 150,00 • 5 itens</Text>
              <Text
                style={{ color: '#3B82F6', marginTop: 2, fontSize: 13 }}
                onPress={() => navigation.navigate('FinalizarMedicao', {
                  clientId: client.id,
                  medicaoRows: [
                    { id: '1', nome: 'Shampoo', linha: 'Wood', cap: 240, preco: 42, estoqueAtual: 10, vendidos: 2, repostos: 1, diferenca: 8, novoEstoque: 9, valorMedicao: 84 },
                    { id: '2', nome: 'Pomada', linha: 'Classic', cap: 90, preco: 65, estoqueAtual: 5, vendidos: 1, repostos: 0, diferenca: 4, novoEstoque: 4, valorMedicao: 65 },
                  ],
                  bancadaRows: [
                    { id: 'b1', nome: 'Pó Modelador', linha: 'Wood', cap: 20, preco: 30, quantidadeComprada: 1, valorTotal: 30 }
                  ],
                  valorMedicao: 149,
                  valorBancada: 30,
                  totalGeral: 179,
                  dateTime: new Date(Date.now() - i * 86400000).toISOString(),
                })}
              >
                Reabrir medição
              </Text>
            </View>
          ))}
          {medicoes.map((m) => (
            <View
              key={m.id}
              style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
            >
              <Text style={{ color: '#111827' }}>{formatDateTime(new Date(m.dateTime))}</Text>
              <Text style={{ color: '#6B7280' }}>{formatCurrency(m.total).replace('.', ',')} • {m.rowsCount} itens</Text>
              <Text
                style={{ color: '#3B82F6', marginTop: 2, fontSize: 13 }}
                onPress={() => navigation.navigate('FinalizarMedicao', {
                  clientId: client.id,
                  medicaoRows: [], // Você pode buscar os dados completos se quiser reabrir real
                  bancadaRows: [],
                  valorMedicao: m.total,
                  valorBancada: 0,
                  totalGeral: m.total,
                  dateTime: m.dateTime,
                })}
              >
                Reabrir medição
              </Text>
            </View>
          ))}
        </Card>
        <Button title="Nova medição" onPress={() => navigation.navigate('CriarMedicao', { clientId: client.id })} />
        <View style={{ height: 16 }} />
        <Button title="Reposição extra" onPress={() => navigation.navigate('EnviarEstoque', { clientId: client.id })} variant="secondary" />
      </ScrollView>
      {/* Botão flutuante de edição */}
      <View
        style={{
          position: 'absolute',
          right: 24,
          bottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        <Button
          title="✏️"
          onPress={() => navigation.navigate('CadastrarCliente', { clientId: client.id })}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#3B82F6',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 0,
          }}
        />
      </View>
    </View>
  );
}
