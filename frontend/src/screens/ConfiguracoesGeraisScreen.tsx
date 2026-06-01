import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import { useResponsive } from '../hooks/useResponsive';
import { getCurrentUser } from '../services/api';
import { canAccessGeneralSettings, getUserAppRole } from '../services/access';

type Props = NativeStackScreenProps<RootStackParamList, 'ConfiguracoesGerais'>;

const INSTALLMENT_RATE_ROWS = [
  { installments: 2, rate: '9,60%' },
  { installments: 3, rate: '11,20%' },
  { installments: 4, rate: '11,40%' },
  { installments: 5, rate: '14,30%' },
  { installments: 6, rate: '14,30%' },
];

export default function ConfiguracoesGeraisScreen({ navigation }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const { padding, fontSize } = useResponsive();
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
    }

    loadSettings();
  }, []);

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
                A taxa de parcelamento no crédito agora é fixa por parcela (2x até 6x) e não é mais editável.
              </Text>
            </View>

            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ flex: 1, color: '#111827', fontWeight: '700' }}>Parcelas</Text>
                <Text style={{ flex: 1, color: '#111827', fontWeight: '700', textAlign: 'right' }}>Taxa aplicada</Text>
              </View>
              {INSTALLMENT_RATE_ROWS.map((row) => (
                <View
                  key={row.installments}
                  style={{
                    flexDirection: 'row',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderTopWidth: 1,
                    borderTopColor: '#F3F4F6',
                  }}
                >
                  <Text style={{ flex: 1, color: '#374151' }}>{row.installments}x</Text>
                  <Text style={{ flex: 1, color: '#1D4ED8', fontWeight: '700', textAlign: 'right' }}>{row.rate}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}
