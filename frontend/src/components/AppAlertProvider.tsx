import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertButton,
  AlertOptions,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { installAppAlertAdapter, showNativeFallbackAlert } from '../services/appAlert';

type AlertPayload = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
};

type Props = {
  children: React.ReactNode;
};

type AlertTone = 'success' | 'warning' | 'error' | 'info';

function inferTone(title?: string, message?: string): AlertTone {
  const source = `${String(title || '')} ${String(message || '')}`.toLowerCase();

  if (source.includes('erro') || source.includes('falha') || source.includes('inválid') || source.includes('insuficiente')) {
    return 'error';
  }

  if (source.includes('sucesso') || source.includes('conclu') || source.includes('atualizado')) {
    return 'success';
  }

  if (source.includes('aten') || source.includes('aviso') || source.includes('confirma') || source.includes('pend')) {
    return 'warning';
  }

  return 'info';
}

function getToneTokens(tone: AlertTone) {
  if (tone === 'success') {
    return {
      icon: 'checkmark-circle',
      iconColor: '#166534',
      iconBg: '#DCFCE7',
      titleColor: '#14532D',
      accentColor: '#16A34A',
      primaryButtonColor: '#166534',
    };
  }

  if (tone === 'error') {
    return {
      icon: 'close-circle',
      iconColor: '#B91C1C',
      iconBg: '#FEE2E2',
      titleColor: '#7F1D1D',
      accentColor: '#EF4444',
      primaryButtonColor: '#B91C1C',
    };
  }

  if (tone === 'warning') {
    return {
      icon: 'warning',
      iconColor: '#B45309',
      iconBg: '#FEF3C7',
      titleColor: '#78350F',
      accentColor: '#F59E0B',
      primaryButtonColor: '#92400E',
    };
  }

  return {
    icon: 'information-circle',
    iconColor: '#1D4ED8',
    iconBg: '#DBEAFE',
    titleColor: '#1E3A8A',
    accentColor: '#3B82F6',
    primaryButtonColor: '#1D4ED8',
  };
}

function normalizeButtons(buttons?: AlertButton[]) {
  const normalized = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];

  return normalized.map((button, index) => ({
    key: `${button.text || 'button'}-${index}`,
    text: button.text || 'OK',
    style: button.style,
    onPress: button.onPress,
  }));
}

export default function AppAlertProvider({ children }: Props) {
  const queueRef = useRef<AlertPayload[]>([]);
  const [currentAlert, setCurrentAlert] = useState<AlertPayload | null>(null);

  const showAlert = useCallback((title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => {
    const payload: AlertPayload = {
      title: String(title || ''),
      message,
      buttons,
      options,
    };

    setCurrentAlert((prev) => {
      if (prev) {
        queueRef.current.push(payload);
        return prev;
      }
      return payload;
    });
  }, []);

  const closeAndFlushNext = useCallback(() => {
    setCurrentAlert(null);

    if (queueRef.current.length > 0) {
      const next = queueRef.current.shift() || null;
      if (next) {
        setTimeout(() => setCurrentAlert(next), 40);
      }
    }
  }, []);

  useEffect(() => {
    try {
      installAppAlertAdapter(showAlert);
    } catch {
      // Se algo inesperado acontecer, mantém fallback nativo.
      installAppAlertAdapter((title, message, buttons, options) => {
        showNativeFallbackAlert(title, message, buttons, options);
      });
    }
  }, [showAlert]);

  const buttonItems = useMemo(() => normalizeButtons(currentAlert?.buttons), [currentAlert?.buttons]);
  const tone = useMemo(() => inferTone(currentAlert?.title, currentAlert?.message), [currentAlert?.title, currentAlert?.message]);
  const toneTokens = useMemo(() => getToneTokens(tone), [tone]);

  const canDismissByBackdrop = Boolean(currentAlert?.options?.cancelable);

  return (
    <>
      {children}

      <Modal
        visible={Boolean(currentAlert)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (canDismissByBackdrop) closeAndFlushNext();
        }}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(17, 24, 39, 0.45)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onPress={() => {
            if (canDismissByBackdrop) closeAndFlushNext();
          }}
        >
          <Pressable
            style={{
              width: '100%',
              maxWidth: 420,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
            }}
            onPress={() => undefined}
          >
            <View style={{ height: 6, backgroundColor: toneTokens.accentColor }} />
            <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    backgroundColor: toneTokens.iconBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}
                >
                  <Ionicons name={toneTokens.icon as any} size={20} color={toneTokens.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}>BYMEN</Text>
                  <Text style={{ color: toneTokens.titleColor, fontSize: 18, fontWeight: '800' }}>
                    {currentAlert?.title || 'Aviso'}
                  </Text>
                </View>
              </View>

              {!!currentAlert?.message && (
                <Text style={{ color: '#4B5563', fontSize: 14, marginTop: 8, lineHeight: 20 }}>
                  {currentAlert.message}
                </Text>
              )}
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
              {buttonItems.map((button, index) => {
                const isDestructive = button.style === 'destructive';
                const isCancel = button.style === 'cancel';

                return (
                  <Pressable
                    key={button.key}
                    style={{
                      minHeight: 50,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: '#E5E7EB',
                      backgroundColor: '#FFFFFF',
                    }}
                    onPress={() => {
                      closeAndFlushNext();
                      button.onPress?.();
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: isCancel ? '800' : '700',
                        color: isDestructive ? '#DC2626' : toneTokens.primaryButtonColor,
                      }}
                    >
                      {button.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
