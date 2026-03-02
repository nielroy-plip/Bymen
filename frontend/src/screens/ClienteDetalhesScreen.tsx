import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Button from '../components/Button';
import Card from '../components/Card';
import { Client } from '../data/clients';
import { listMeasurements, listClients, deleteClient } from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/format';
import { sum } from '../utils/calculate';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'ClienteDetalhes'>;

export default function ClienteDetalhesScreen({ navigation, route }: Props) {
  const clientId = route.params?.clientId;
  const [menuOpen, setMenuOpen] = useState(false);
  const [client, setClient] = useState<Client | undefined>(undefined);
  const [medicoes, setMedicoes] = useState<
    Array<{
      id: string;
      total: number;
      dateTime: string;
      rowsCount: number;
      status?: string;
      syncStatus?: string;
      lastEventMessage?: string;
      medicaoRows: any[];
      bancadaRows: any[];
      valorMedicao: number;
      valorBancada: number;
      responsavel?: string;
      signatureDataUrl?: string;
    }>
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
          total: it.totalGeral || 0,
          dateTime: it.dateTime,
          rowsCount: (it.medicaoRows?.length || 0) + (it.bancadaRows?.length || 0),
          status: it.status,
          syncStatus: it.syncStatus,
          lastEventMessage: it.timeline?.length ? it.timeline[it.timeline.length - 1]?.message : undefined,
          medicaoRows: it.medicaoRows || [],
          bancadaRows: it.bancadaRows || [],
          valorMedicao: it.valorMedicao || 0,
          valorBancada: it.valorBancada || 0,
          responsavel: it.responsavel,
          signatureDataUrl: it.signatureDataUrl,
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
      <View style={{ position: 'absolute', top: 20, right: 20, zIndex: 20 }}>
        <TouchableOpacity
          onPress={() => setMenuOpen((prev) => !prev)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#F3F4F6',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#111827" />
        </TouchableOpacity>
        {menuOpen && (
          <View
            style={{
              marginTop: 8,
              backgroundColor: '#FFFFFF',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              minWidth: 150,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <TouchableOpacity
              style={{ paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
              onPress={() => {
                setMenuOpen(false);
                navigation.navigate('CadastrarCliente', { clientId: client.id });
              }}
            >
              <Text style={{ color: '#111827', fontWeight: '600' }}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingVertical: 12, paddingHorizontal: 14 }}
              onPress={() => {
                setMenuOpen(false);
                Alert.alert('Excluir barbearia', `Deseja excluir ${client.nome}?`, [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await deleteClient(client.id);
                        Alert.alert('Sucesso', 'Barbearia excluída com sucesso.');
                        navigation.replace('Clientes');
                      } catch (error) {
                        Alert.alert('Erro', (error as Error)?.message || 'Não foi possível excluir a barbearia.');
                      }
                    },
                  },
                ]);
              }}
            >
              <Text style={{ color: '#DC2626', fontWeight: '600' }}>Excluir</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

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
          {medicoes.length === 0 && (
            <Text style={{ color: '#6B7280', fontStyle: 'italic' }}>Nenhuma medição encontrada.</Text>
          )}
          {medicoes.map((m) => (
            <View
              key={m.id}
              style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
            >
              <Text style={{ color: '#111827' }}>{m.dateTime}</Text>
              <Text style={{ color: '#6B7280' }}>{formatCurrency(m.total).replace('.', ',')} • {m.rowsCount} itens</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <Text style={{ color: '#374151', fontSize: 12 }}>
                  {m.status === 'SIGNED' ? 'Assinada' : m.status === 'FINALIZED' ? 'Finalizada' : 'Rascunho'}
                </Text>
                <Text style={{ color: '#6B7280', fontSize: 12 }}>
                  • {m.syncStatus === 'SYNCED' ? 'Sincronizada' : m.syncStatus === 'FAILED' ? 'Falhou' : 'Pendente'}
                </Text>
              </View>
              {!!m.lastEventMessage && <Text style={{ color: '#6B7280', fontSize: 12 }}>{m.lastEventMessage}</Text>}
              <Text
                style={{ color: '#3B82F6', marginTop: 2, fontSize: 13 }}
                onPress={() => navigation.navigate('FinalizarMedicao', {
                  clientId: client.id,
                  medicaoRows: m.medicaoRows,
                  bancadaRows: m.bancadaRows,
                  valorMedicao: m.valorMedicao,
                  valorBancada: m.valorBancada,
                  totalGeral: m.total,
                  dateTime: m.dateTime,
                  responsavel: m.responsavel,
                  signatureDataUrl: m.signatureDataUrl,
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
    </View>
  );
}
