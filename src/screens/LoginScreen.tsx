import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Input from '../components/Input';
import Button from '../components/Button';
import { Image } from 'react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  // Para ocultar o botão de voltar, defina a opção 'headerLeft' como null no Stack.Navigator onde LoginScreen é usado.
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  function handleLogin() {
    if (usuario.trim().length === 0 || senha.trim().length === 0) {
      setErro('Informe usuário e senha');
      return;
    }
    if (usuario === 'admin' && senha === 'bymen') {
      setErro('');
      navigation.replace('Dashboard');
      return;
    }
    setErro('Credenciais inválidas');
  }

  return (
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
          label="Usuário"
          value={usuario}
          onChangeText={setUsuario}
          placeholder="usuário"
          style={{ width: 320, maxWidth: '90%' }}
        />
        <Input
          label="Senha"
          value={senha}
          onChangeText={setSenha}
          placeholder="senha"
          style={{ width: 320, maxWidth: '90%' }}
        />
        {erro ? <Text style={{ color: '#EF4444', marginBottom: 12 }}>{erro}</Text> : null}
        <Button title="Entrar" onPress={handleLogin} />
      </View>
    </KeyboardAvoidingView>
  );
}
