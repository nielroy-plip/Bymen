import React, { useRef, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Dimensions, Image } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { useResponsive } from '../hooks/useResponsive';

type Props = {
  label?: string;
  onChange: (dataUrl: string) => void;
  height?: number;
};

export default function SignaturePad({ label = 'Assinatura', onChange, height }: Props) {
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const ref = useRef<SignatureCanvas | null>(null);
  const { isTablet, fontSize } = useResponsive();
  const signatureHeight = height || (isTablet ? 300 : 200);

  // Estado do modal
  const [modalVisible, setModalVisible] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const handleSignatureConfirm = (data: string) => {
    setSignatureData(data);
    onChange(data);
    setModalVisible(false);
  };

  const handleClear = () => {
    setSignatureData(null);
    ref.current?.clearSignature?.();
  };

  return (
    <View style={{ marginTop: isTablet ? 16 : 12 }}>
      <Text style={{ color: '#111827', fontWeight: '600', marginBottom: isTablet ? 12 : 8, fontSize: fontSize.base }}>
        {label}
      </Text>

      {/* Área de preview/botão */}
      <Pressable
        onPress={() => setModalVisible(true)}
        style={{
          borderWidth: 1,
          borderColor: '#E5E7EB',
          borderRadius: isTablet ? 16 : 8,
          padding: isTablet ? 16 : 12,
          backgroundColor: '#F9FAFB',
          minHeight: signatureHeight,
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {signatureData ? (
          <>
            <Image
              source={{ uri: signatureData }}
              style={{ width: '100%', height: signatureHeight - 40 }}
              resizeMode="contain"
            />
            <Text style={{ marginTop: 8, color: '#6B7280', fontSize: fontSize.small }}>
              Toque para alterar assinatura
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 48, color: '#D1D5DB', marginBottom: 8 }}>✍️</Text>
            <Text style={{ color: '#6B7280', fontSize: fontSize.base, fontWeight: '600' }}>
              Toque aqui para assinar
            </Text>
          </>
        )}
      </Pressable>

      {/* Modal de assinatura em tela cheia */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assinatura Digital</Text>
            <Text style={styles.modalSubtitle}>Assine na área abaixo com o dedo</Text>
          </View>

          {/* Área de assinatura */}
          <View style={styles.signatureContainer}>
            <SignatureCanvas
              ref={ref}
              onOK={handleSignatureConfirm}
              webStyle={`
                .m-signature-pad { 
                  box-shadow: none; 
                  border: none; 
                  width: 100%;
                  height: 100%;
                }
                .m-signature-pad--body { 
                  border: none; 
                  background: white;
                }
                .m-signature-pad--footer { 
                  display: none; 
                }
                body, html { 
                  width: 100%; 
                  height: 100%; 
                  margin: 0;
                  padding: 0;
                  overflow: hidden;
                  touch-action: none;
                }
                canvas {
                  touch-action: none;
                }
              `}
              penColor="#111827"
              backgroundColor="#FFFFFF"
              autoClear={false}
              descriptionText=""
              clearText="Limpar"
              confirmText="Confirmar"
              imageType="image/png"
              style={{ flex: 1 }}
            />
          </View>

          {/* Botões de ação */}
          <View style={styles.modalFooter}>
            <Pressable
              onPress={handleClear}
              style={[styles.button, styles.buttonSecondary]}
            >
              <Text style={styles.buttonSecondaryText}>🗑️ Limpar</Text>
            </Pressable>

            <Pressable
              onPress={() => setModalVisible(false)}
              style={[styles.button, styles.buttonDanger]}
            >
              <Text style={styles.buttonDangerText}>✖️ Cancelar</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                ref.current?.readSignature();
              }}
              style={[styles.button, styles.buttonPrimary]}
            >
              <Text style={styles.buttonPrimaryText}>✓ Confirmar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  modalHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  signatureContainer: {
    flex: 1,
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  modalFooter: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#3B82F6',
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonSecondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  buttonSecondaryText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDanger: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  buttonDangerText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
});
