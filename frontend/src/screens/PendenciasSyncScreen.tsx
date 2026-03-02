import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Button from '../components/Button';
import {
  listSyncPending,
  removeSyncPending,
  updateMeasurementSyncStatus,
  SyncPendingItem,
} from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'PendenciasSync'>;

export default function PendenciasSyncScreen({ navigation }: Props) {
  const [items, setItems] = useState<SyncPendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);

  const loadQueue = useCallback(async () => {
    const queue = await listSyncPending();
    setItems(queue);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadQueue);
    return unsubscribe;
  }, [navigation, loadQueue]);

  async function retrySingleItem(item: SyncPendingItem): Promise<boolean> {
    try {
      const response = await fetch(item.endpoint, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.method === 'POST' || item.method === 'PUT' ? JSON.stringify(item.payload) : undefined,
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || `HTTP ${response.status}`);
      }

      await removeSyncPending(item.id);

      if (item.entityType === 'MEDICAO') {
        await updateMeasurementSyncStatus(
          item.entityId,
          'SYNCED',
          'Sincronização manual concluída com sucesso.',
          'SIGNED',
        );
      }

      return true;
    } catch (error) {
      if (item.entityType === 'MEDICAO') {
        await updateMeasurementSyncStatus(
          item.entityId,
          'FAILED',
          'Tentativa manual de sincronização falhou.',
          'FINALIZED',
        );
      }

      return false;
    }
  }

  async function handleRetry(item: SyncPendingItem) {
    setRetryingId(item.id);
    const ok = await retrySingleItem(item);

    if (ok) {
      Alert.alert('Sucesso', 'Pendência sincronizada com sucesso.');
    } else {
      Alert.alert('Falha no reenvio', 'Não foi possível sincronizar este item agora.');
    }

    await loadQueue();
    setRetryingId(null);
  }

  async function runRetryAll() {
    setRetryingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of items) {
      const ok = await retrySingleItem(item);
      if (ok) {
        successCount += 1;
      } else {
        failCount += 1;
      }
    }

    await loadQueue();
    setRetryingAll(false);

    Alert.alert(
      'Reenvio em lote finalizado',
      `Sucesso: ${successCount}\nFalhas: ${failCount}`,
    );
  }

  function handleRetryAll() {
    if (items.length === 0 || retryingAll) return;

    Alert.alert(
      'Confirmar reenvio',
      `Deseja reenviar todas as ${items.length} pendências agora?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Reenviar todas',
          onPress: () => {
            runRetryAll();
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>Pendências de Sincronização</Text>
        <Text style={{ color: '#6B7280', marginTop: 6, marginBottom: 16 }}>
          Itens aguardando envio para o Bling: {items.length}
        </Text>

        {!loading && items.length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <Button
              title={retryingAll ? 'Reenviando pendências...' : 'Reenviar todas'}
              onPress={handleRetryAll}
              disabled={retryingAll || !!retryingId}
              icon="refresh-outline"
              variant="secondary"
            />
          </View>
        )}

        {loading ? (
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <ActivityIndicator color="#3B82F6" />
            <Text style={{ marginTop: 8, color: '#6B7280' }}>Carregando pendências...</Text>
          </View>
        ) : items.length === 0 ? (
          <Text style={{ color: '#6B7280', fontStyle: 'italic' }}>Nenhuma pendência no momento.</Text>
        ) : (
          items.map((item) => (
            <View
              key={item.id}
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
                backgroundColor: '#F9FAFB',
              }}
            >
              <Text style={{ color: '#111827', fontWeight: '700' }}>Medição: {item.entityId}</Text>
              <Text style={{ color: '#6B7280', marginTop: 4 }}>Motivo: {item.reason}</Text>
              <Text style={{ color: '#6B7280', marginTop: 2 }}>Criado em: {new Date(item.createdAt).toLocaleString('pt-BR')}</Text>
              <View style={{ height: 10 }} />
              <Button
                title={retryingId === item.id ? 'Reenviando...' : 'Reenviar agora'}
                onPress={() => handleRetry(item)}
                disabled={retryingId === item.id || retryingAll}
                icon="sync-outline"
              />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
