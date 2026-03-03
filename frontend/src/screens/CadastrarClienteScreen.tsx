import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Input from '../components/Input';
import Button from '../components/Button';
import { saveClient, listClients } from '../services/api';
import { useResponsive } from '../hooks/useResponsive';

type Props = NativeStackScreenProps<RootStackParamList, 'CadastrarCliente'>;

export default function CadastrarClienteScreen({ navigation, route }: Props) {
  const clientId = route.params?.clientId;
  const [nome, setNome] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [telefone, setTelefone] = useState('');
  const { isTablet, padding, fontSize } = useResponsive();

  // Carregar dados do cliente se estiver editando
  useEffect(() => {
    if (clientId) {
      listClients().then((clients) => {
        const client = clients.find((c) => c.id === clientId);
        if (client) {
          setNome(client.nome || '');
          setCnpjCpf(client.cnpjCpf || '');
          setEndereco(client.endereco || '');
          setResponsavel(client.responsavel || '');
          setTelefone(client.telefone || '');
        }
      });
    }
  }, [clientId]);

  function normalizeDocumentInput(value: string) {
    return value.replace(/\D/g, '').slice(0, 14);
  }

  function normalizePhoneInput(value: string) {
    return value.replace(/\D/g, '').slice(0, 11);
  }

  const nomeOk = nome.trim().length >= 2;
  const enderecoOk = endereco.trim().length >= 5;
  const responsavelOk = responsavel.trim().length >= 3;
  const docDigits = cnpjCpf.replace(/\D/g, '');
  const phoneDigits = telefone.replace(/\D/g, '');
  const docOk = docDigits.length === 11 || docDigits.length === 14;
  const phoneOk = phoneDigits.length >= 10 && phoneDigits.length <= 11;
  const canOpenInitialStock = nomeOk && enderecoOk && responsavelOk && docOk && phoneOk;

  async function handleSalvar() {
    if (!nome.trim() || !cnpjCpf.trim() || !endereco.trim() || !responsavel.trim() || !telefone.trim()) {
      Alert.alert(
        'Campos obrigatórios',
        'Motivo: existem campos relevantes sem preenchimento.\n\nComo ajustar: preencha Nome, CNPJ/CPF, Endereço, Responsável e Telefone.',
      );
      return;
    }

    const digitsPhone = telefone.replace(/\D/g, '');
    if (digitsPhone.length < 10) {
      Alert.alert(
        'Validação de telefone',
        'Motivo: telefone inválido.\n\nComo ajustar: informe DDD + número, com no mínimo 10 dígitos.',
      );
      return;
    }

    const docDigits = cnpjCpf.replace(/\D/g, '');
    if (docDigits.length > 0 && docDigits.length !== 11 && docDigits.length !== 14) {
      Alert.alert(
        'Validação de documento',
        'Motivo: CNPJ/CPF inválido.\n\nComo ajustar: informe 11 dígitos (CPF) ou 14 dígitos (CNPJ).',
      );
      return;
    }

    const id = clientId || `c-${Date.now()}`;
    const client = {
      id,
      nome: nome.trim(),
      cnpjCpf: cnpjCpf.trim(),
      endereco: endereco.trim(),
      responsavel: responsavel.trim(),
      telefone: telefone.trim(),
    };

    try {
      await saveClient(client);
      Alert.alert('Sucesso', clientId ? 'Cliente atualizado com sucesso' : 'Cliente cadastrado com sucesso', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert(
        'Falha ao salvar na homologação',
        `Motivo: ${(error as Error)?.message || 'erro inesperado ao salvar no servidor.'}\n\nComo ajustar: valide os dados e tente novamente. Se persistir, confirme se o backend está online.`,
      );
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ padding }}>

        <Input
          label="Nome da Barbearia *"
          value={nome}
          onChangeText={setNome}
          placeholder="Ex: Barbearia Elite"
        />

        <Input
          label="CNPJ / CPF *"
          value={cnpjCpf}
          onChangeText={(value) => setCnpjCpf(normalizeDocumentInput(value))}
          placeholder="00.000.000/0000-00"
          keyboardType="numeric"
          maxLength={14}
        />

        <Input
          label="Endereço *"
          value={endereco}
          onChangeText={setEndereco}
          placeholder="Rua, número, bairro, cidade"
        />

        <Input
          label="Responsável *"
          value={responsavel}
          onChangeText={setResponsavel}
          placeholder="Nome do responsável"
        />

        <Input
          label="Telefone *"
          value={telefone}
          onChangeText={(value) => setTelefone(normalizePhoneInput(value))}
          placeholder="+55 11 99999-9999"
          keyboardType="phone-pad"
          maxLength={11}
        />

        {/* Botão de cadastrar estoque inicial removido ao editar */}
        {!clientId && (
          <Button
            title="Cadastrar Estoque Inicial"
            icon="add-circle-outline"
            disabled={!canOpenInitialStock}
            onPress={() =>
              navigation.navigate('NovoEstoque', {
                draftClient: {
                  id: `c-${Date.now()}`,
                  nome: nome.trim(),
                  cnpjCpf: docDigits,
                  endereco: endereco.trim(),
                  responsavel: responsavel.trim(),
                  telefone: phoneDigits,
                },
              })
            }
            style={{ marginBottom: 16 }}
          />
        )}
        <Button
          title={clientId ? 'Atualizar Cliente' : 'Salvar Cliente'}
          icon={clientId ? 'save-outline' : 'checkmark-done-outline'}
          onPress={handleSalvar}
        />
      </ScrollView>
    </View>
  );
}
