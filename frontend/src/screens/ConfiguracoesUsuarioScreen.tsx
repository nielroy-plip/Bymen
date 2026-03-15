import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, NativeSyntheticEvent, TextInputFocusEventData } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Input from '../components/Input';
import Button from '../components/Button';
import PasswordInput from '../components/PasswordInput';
import { changeUserPassword, getCurrentUser, saveCurrentUserProfile } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'ConfiguracoesUsuario'>;

type UserSettings = {
  nome: string;
  email: string;
  telefone: string;
  receberNotificacoes: boolean;
};

const USER_SETTINGS_KEY = 'bymen_user_settings';

export default function ConfiguracoesUsuarioScreen({ navigation }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [receberNotificacoes, setReceberNotificacoes] = useState(true);
  const [loading, setLoading] = useState(false);

  function handleFieldFocus(event: NativeSyntheticEvent<TextInputFocusEventData>) {
    const target = event.nativeEvent.target;
    setTimeout(() => {
      (scrollRef.current as any)?.scrollResponderScrollNativeHandleToKeyboard(target, 120, true);
    }, 40);
  }

  useEffect(() => {
    async function loadSettings() {
      try {
        const raw = await AsyncStorage.getItem(USER_SETTINGS_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as UserSettings;
        setNome(parsed.nome || '');
        setEmail(parsed.email || '');
        setTelefone(parsed.telefone || '');
        setReceberNotificacoes(parsed.receberNotificacoes ?? true);

        const currentUser = await getCurrentUser();
        if (currentUser?.email) {
          setEmail(currentUser.email);
          if (currentUser.username) setNome(currentUser.username);
          if (currentUser.phone) setTelefone(currentUser.phone);
        }
      } catch {
        Alert.alert('Aviso', 'Não foi possível carregar as configurações do usuário.');
      }
    }

    loadSettings();
  }, []);

  async function handleSalvar() {
    if (nome.trim().length === 0 || email.trim().length === 0) {
      Alert.alert('Erro', 'Preencha nome e e-mail.');
      return;
    }

    setLoading(true);
    try {
      const payload: UserSettings = {
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        receberNotificacoes,
      };
      await AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(payload));

      await saveCurrentUserProfile({
        email: email.trim(),
        username: nome.trim(),
        phone: telefone.trim(),
      });

      if (senhaAtual || novaSenha || confirmarSenha) {
        if (!senhaAtual || !novaSenha || !confirmarSenha) {
          Alert.alert('Erro', 'Preencha todos os campos de senha para alterar.');
          setLoading(false);
          return;
        }
        if (novaSenha.length < 6) {
          Alert.alert('Erro', 'A nova senha deve ter no mínimo 6 caracteres.');
          setLoading(false);
          return;
        }
        if (novaSenha !== confirmarSenha) {
          Alert.alert('Erro', 'A confirmação da nova senha não confere.');
          setLoading(false);
          return;
        }

        await changeUserPassword({
          email: email.trim().toLowerCase(),
          currentPassword: senhaAtual,
          newPassword: novaSenha,
        });
      }

      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      Alert.alert('Sucesso', 'Configurações salvas com sucesso!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as configurações.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
      >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
          Configuração do Usuário
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
          Atualize seus dados de acesso e preferências.
        </Text>

        <Input
          label="Usuário"
          value={nome}
          onChangeText={setNome}
          onFocus={handleFieldFocus}
          placeholder="Nome do usuário"
        />

        <Input
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          onFocus={handleFieldFocus}
          placeholder="email@empresa.com"
          keyboardType="email-address"
        />

        <Input
          label="Telefone"
          value={telefone}
          onChangeText={setTelefone}
          onFocus={handleFieldFocus}
          placeholder="(11) 99999-9999"
          keyboardType="phone-pad"
        />

        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 8, marginBottom: 8 }}>
          Alterar senha
        </Text>

        <PasswordInput
          label="Senha atual"
          value={senhaAtual}
          onChangeText={setSenhaAtual}
          onFocus={handleFieldFocus}
          placeholder="Digite a senha atual"
        />

        <PasswordInput
          label="Nova senha"
          value={novaSenha}
          onChangeText={setNovaSenha}
          onFocus={handleFieldFocus}
          placeholder="Digite a nova senha"
        />

        <PasswordInput
          label="Confirmar nova senha"
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          onFocus={handleFieldFocus}
          placeholder="Confirme a nova senha"
        />

        <TouchableOpacity
          onPress={() => setReceberNotificacoes((prev) => !prev)}
          style={{
            marginTop: 8,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderWidth: 2,
              borderColor: receberNotificacoes ? '#111827' : '#D1D5DB',
              backgroundColor: receberNotificacoes ? '#111827' : '#FFFFFF',
              borderRadius: 6,
              marginRight: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {receberNotificacoes ? <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>✓</Text> : null}
          </View>
          <Text style={{ color: '#111827', fontSize: 15 }}>Receber notificações no aplicativo</Text>
        </TouchableOpacity>

        <Button
          title={loading ? 'Salvando...' : 'Salvar configurações'}
          onPress={handleSalvar}
          icon="save-outline"
          disabled={loading}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
