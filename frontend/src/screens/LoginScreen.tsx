import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Alert, ScrollView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Input from '../components/Input';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/Button';
import { Image } from 'react-native';
import { loginUser, registerUser } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  // Para ocultar o botão de voltar, defina a opção 'headerLeft' como null no Stack.Navigator onde LoginScreen é usado.
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [cadastroOpen, setCadastroOpen] = useState(false);
  const [emailCadastro, setEmailCadastro] = useState('');
  const [usuarioCadastro, setUsuarioCadastro] = useState('');
  const [telefoneCadastro, setTelefoneCadastro] = useState('');
  const [senhaCadastro, setSenhaCadastro] = useState('');
  const [cadastroErro, setCadastroErro] = useState('');

  async function handleLogin() {
    if (usuario.trim().length === 0 || senha.trim().length === 0) {
      setErro('Informe usuário e senha');
      return;
    }

    const identifier = usuario.trim().toLowerCase();
    if (!identifier) {
      setErro('Informe e-mail ou usuário');
      return;
    }

    try {
      await loginUser({ identifier, password: senha });
      setErro('');
      navigation.replace('Dashboard');
    } catch (error) {
      setErro((error as Error)?.message || 'Credenciais inválidas ou indisponibilidade do servidor');
    }
  }

  async function handleCadastro() {
    const email = emailCadastro.trim().toLowerCase();
    const username = usuarioCadastro.trim();
    const phone = telefoneCadastro.trim();
    const password = senhaCadastro.trim();

    if (!email || !username || !phone || !password) {
      setCadastroErro('Preencha todos os campos');
      return;
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      setCadastroErro('Informe um e-mail válido');
      return;
    }

    if (password.length < 6) {
      setCadastroErro('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (username.length < 3) {
      setCadastroErro('Usuário deve ter no mínimo 3 caracteres');
      return;
    }

    if (phone.replace(/\D/g, '').length < 10) {
      setCadastroErro('Telefone inválido');
      return;
    }

    try {
      await registerUser({ email, password, username, phone });
      setCadastroOpen(false);
      setEmailCadastro('');
      setUsuarioCadastro('');
      setTelefoneCadastro('');
      setSenhaCadastro('');
      setCadastroErro('');
      setUsuario(email);
      Alert.alert('Sucesso', 'Usuário criado com sucesso!', [
        {
          text: 'OK',
          onPress: () => navigation.replace('Login'),
        },
      ]);
    } catch (e) {
      setCadastroErro((e as Error)?.message || 'Erro ao criar usuário em homologação');
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <Image
          source={require('../assets/icon.png')}
          style={{ width: 80, height: 80, marginBottom: 16, borderRadius: 16 }}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 24 }}>Bymen • Login</Text>
        <Input
          label="E-mail ou usuário"
          value={usuario}
          onChangeText={setUsuario}
          placeholder="seu@email.com ou seu_usuario"
          style={{ width: 320, maxWidth: '90%' }}
        />
        <PasswordInput value={senha} onChangeText={setSenha} style={{ width: 320, maxWidth: '90%' }} />
        {erro ? <Text style={{ color: '#EF4444', marginBottom: 12 }}>{erro}</Text> : null}
        <Button
          title="Entrar"
          onPress={handleLogin}
          style={{ width: 320, maxWidth: '90%' }}
        />
        <Button
          title="Criar conta"
          onPress={() => setCadastroOpen(true)}
          style={{ marginTop: 12, width: 320, maxWidth: '90%' }}
        />
        {cadastroOpen && (
          <KeyboardAvoidingView
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
          >
            <ScrollView
              style={{ width: '100%' }}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ width: 320, maxWidth: '90%', padding: 24, borderRadius: 12, backgroundColor: '#F3F4F6', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Cadastro de Usuário</Text>
                <Input label="E-mail" value={emailCadastro} onChangeText={setEmailCadastro} style={{ marginBottom: 8 }} />
                <Input label="Usuário" value={usuarioCadastro} onChangeText={setUsuarioCadastro} style={{ marginBottom: 8 }} />
                <Input
                  label="Telefone"
                  value={telefoneCadastro}
                  onChangeText={setTelefoneCadastro}
                  style={{ marginBottom: 8 }}
                  keyboardType="phone-pad"
                />
                <PasswordInput
                  value={senhaCadastro}
                  onChangeText={setSenhaCadastro}
                  style={{ marginBottom: 8 }}
                  inputContainerStyle={{ backgroundColor: '#FFFFFF' }}
                />
                {cadastroErro ? <Text style={{ color: '#EF4444', marginBottom: 8 }}>{cadastroErro}</Text> : null}
                <Button title="Cadastrar" onPress={handleCadastro} style={{ width: '100%' }} />
                <Button title="Cancelar" onPress={() => setCadastroOpen(false)} style={{ marginTop: 8, width: '100%' }} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
