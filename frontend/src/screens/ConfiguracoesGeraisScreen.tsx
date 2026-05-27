import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Input from '../components/Input';
import Button from '../components/Button';
import BymenLoadingOverlay from '../components/BymenLoadingOverlay';
import { useResponsive } from '../hooks/useResponsive';
import { getCurrentUser } from '../services/api';
import { canAccessGeneralSettings, getUserAppRole } from '../services/access';
import { getGeneralSettings, saveGeneralSettings } from '../services/settings';
import { createKeyboardFocusHandler } from '../utils/keyboardFocus';

type Props = NativeStackScreenProps<RootStackParamList, 'ConfiguracoesGerais'>;

export default function ConfiguracoesGeraisScreen({ navigation }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const handleFieldFocus = createKeyboardFocusHandler(scrollRef, 24);
  const { padding, fontSize } = useResponsive();
  const [interestRate, setInterestRate] = useState('2,49');
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const currentUser = await getCurrentUser();
      const hasAccess = canAccessGeneralSettings(getUserAppRole(currentUser));

      if (!hasAccess) {
        Alert.alert('Acesso negado', 'Apenas o perfil Gestor pode acessar as Configurações Gerais.', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
        return;
      }

      setAuthorized(true);
      const settings = await getGeneralSettings();
      setInterestRate(String(settings.creditInstallmentMonthlyInterestPercent).replace('.', ','));
    }

    loadSettings();
  }, []);

  function normalizePercentInput(value: string) {
    const clean = String(value || '')
      .replace(/[^\d,\.]/g, '')
      .replace('.', ',');

    const parts = clean.split(',');
    if (parts.length <= 1) return clean;
    return `${parts[0]},${parts.slice(1).join('')}`;
  }

  async function handleSave() {
    const numeric = Number(String(interestRate || '').replace(',', '.'));

    if (!Number.isFinite(numeric)) {
      Alert.alert('Validação', 'Informe uma taxa válida de juros ao mês.');
      return;
    }

    if (numeric < 0 || numeric > 100) {
      Alert.alert('Validação', 'A taxa deve estar entre 0 e 100%.');
      return;
    }

    setLoading(true);
    try {
      await saveGeneralSettings({
        creditInstallmentMonthlyInterestPercent: numeric,
      });

      Alert.alert('Sucesso', 'Configurações gerais salvas com sucesso.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as configurações gerais.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {authorized ? (
        <>
          <ScrollView ref={scrollRef} contentContainerStyle={{ padding, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: fontSize.xlarge, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
              Configurações Gerais
            </Text>
            <Text style={{ color: '#6B7280', marginBottom: 16 }}>
              Defina os parâmetros globais usados no app.
            </Text>

            <View
              style={{
                backgroundColor: '#F9FAFB',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 12,
                padding: 12,
                marginBottom: 14,
              }}
            >
              <Text style={{ color: '#374151', fontSize: fontSize.small }}>
                Esta taxa é usada para calcular juros no pagamento em crédito parcelado (2x até 12x).
              </Text>
            </View>

            <Input
              label="Taxa de juros mensal do parcelado (%)"
              value={interestRate}
              onChangeText={(value) => setInterestRate(normalizePercentInput(value))}
              onFocus={handleFieldFocus}
              placeholder="Ex: 2,49"
              keyboardType="numeric"
            />

            <Button
              title={loading ? 'Salvando...' : 'Salvar configurações gerais'}
              icon="save-outline"
              onPress={handleSave}
              disabled={loading}
            />
          </ScrollView>
          <BymenLoadingOverlay visible={loading} label="Salvando configurações gerais..." />
        </>
      ) : null}
    </View>
  );
}
