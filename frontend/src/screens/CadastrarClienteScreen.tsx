import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Input from '../components/Input';
import Button from '../components/Button';
import { saveClient, listClients } from '../services/api';
import { useResponsive } from '../hooks/useResponsive';
import { findAddressByCep, formatCep, normalizeCep } from '../services/cep';
import { createKeyboardFocusHandler } from '../utils/keyboardFocus';

type Props = NativeStackScreenProps<RootStackParamList, 'CadastrarCliente'>;

export default function CadastrarClienteScreen({ navigation, route }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const handleFieldFocus = createKeyboardFocusHandler(scrollRef, 24);
  const clientId = route.params?.clientId;
  const [operationMode, setOperationMode] = useState<'CONSIGNADO' | 'VENDA'>('VENDA');
  const [nome, setNome] = useState('');
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const { isTablet, padding, fontSize } = useResponsive();

  // Carregar dados do cliente se estiver editando
  useEffect(() => {
    if (clientId) {
      listClients().then((clients) => {
        const client = clients.find((c) => c.id === clientId);
        if (client) {
          setOperationMode(client.operationMode || 'CONSIGNADO');
          setNome(client.nome || '');
          setCnpjCpf(client.cnpjCpf || '');
          setCep(client.cep || '');
          setEndereco(client.endereco || '');
          setNumero(client.numero || '');
          setComplemento(client.complemento || '');
          setResponsavel(client.responsavel || '');
          setTelefone(client.telefone || '');
          setEmail(client.email || '');
        }
      });
    }
  }, [clientId]);

  function isValidEmail(value: string) {
    const normalized = String(value || '').trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  }

  function formatDocument(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 14);

    if (digits.length <= 11) {
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
      if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }

    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '');
    const limited = digits.slice(0, 11);

    if (limited.length === 0) return '';
    if (limited.length <= 2) return `(${limited}`;

    if (limited.length <= 6) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    }

    if (limited.length <= 10) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
    }

    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  }

  function normalizeAddressNumber(value: string) {
    const normalized = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
    if (normalized === 'S/N' || normalized === 'SN') {
      return 'S/N';
    }

    return normalized.replace(/\D/g, '').slice(0, 10);
  }

  async function handleBuscarCep() {
    const cepDigits = normalizeCep(cep);
    if (cepDigits.length !== 8) {
      Alert.alert('Validação de CEP', 'Motivo: CEP inválido.\n\nComo ajustar: informe um CEP com 8 dígitos.');
      return;
    }

    try {
      setBuscandoCep(true);
      const result = await findAddressByCep(cepDigits);
      if (!result) {
        Alert.alert('CEP não encontrado', 'Não foi possível localizar este CEP nos Correios.');
        return;
      }

      setCep(formatCep(result.cep));
      const addressParts = [result.logradouro, result.bairro, `${result.localidade}-${result.uf}`].filter(Boolean);
      if (addressParts.length) {
        setEndereco(addressParts.join(', '));
      }
    } catch (error) {
      Alert.alert('Falha ao buscar CEP', (error as Error)?.message || 'Não foi possível consultar o CEP no momento.');
    } finally {
      setBuscandoCep(false);
    }
  }

  const docDigits = cnpjCpf.replace(/\D/g, '');
  const phoneDigits = telefone.replace(/\D/g, '');
  async function handleSalvar() {
    const normalizedNumber = normalizeAddressNumber(numero);

    if (!nome.trim() || !cnpjCpf.trim() || !cep.trim() || !endereco.trim() || !normalizedNumber || !responsavel.trim() || !telefone.trim() || !email.trim()) {
      Alert.alert(
        'Campos obrigatórios',
        'Motivo: existem campos relevantes sem preenchimento.\n\nComo ajustar: preencha Nome, CNPJ/CPF, CEP, Endereço, Número, Responsável, Telefone e E-mail.',
      );
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert(
        'Validação de e-mail',
        'Motivo: e-mail inválido.\n\nComo ajustar: informe um e-mail no formato nome@dominio.com.',
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

    const cepDigits = normalizeCep(cep);
    if (cepDigits.length !== 8) {
      Alert.alert(
        'Validação de CEP',
        'Motivo: CEP inválido.\n\nComo ajustar: informe um CEP com 8 dígitos no formato 00000-000.',
      );
      return;
    }

    const allClients = await listClients();
    const duplicate = allClients.find((c) => {
      const existingDoc = String(c.cnpjCpf || '').replace(/\D/g, '');
      const sameDocument = existingDoc.length > 0 && existingDoc === docDigits;
      const differentClient = c.id !== clientId;
      return sameDocument && differentClient;
    });

    if (duplicate) {
      const formattedDoc = formatDocument(docDigits);
      Alert.alert(
        'CNPJ/CPF já cadastrado',
        `Já existe uma barbearia com este CNPJ/CPF (${formattedDoc}): ${duplicate.nome}.\n\nUse outro documento ou edite o cadastro existente.`,
      );
      return;
    }

    const id = clientId || `c-${Date.now()}`;
    const client = {
      id,
      nome: nome.trim(),
      cnpjCpf: cnpjCpf.trim(),
      cep: formatCep(cepDigits),
      endereco: endereco.trim(),
      numero: normalizedNumber,
      complemento: complemento.trim(),
      responsavel: responsavel.trim(),
      telefone: telefone.trim(),
      email: email.trim().toLowerCase(),
      operationMode,
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >

        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Modelo da barbearia</Text>
        <Text style={{ color: '#6B7280', marginBottom: 10 }}>
          Escolha como esta barbearia opera no sistema.
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <Pressable
            onPress={() => setOperationMode('VENDA')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: operationMode === 'VENDA' ? '#1D4ED8' : '#E5E7EB',
              backgroundColor: operationMode === 'VENDA' ? '#DBEAFE' : '#FFFFFF',
            }}
          >
            <Text style={{ color: operationMode === 'VENDA' ? '#1D4ED8' : '#374151', fontWeight: '700' }}>Vendas</Text>
          </Pressable>
          <Pressable
            onPress={() => setOperationMode('CONSIGNADO')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: operationMode === 'CONSIGNADO' ? '#0F766E' : '#E5E7EB',
              backgroundColor: operationMode === 'CONSIGNADO' ? '#CCFBF1' : '#FFFFFF',
            }}
          >
            <Text style={{ color: operationMode === 'CONSIGNADO' ? '#0F766E' : '#374151', fontWeight: '700' }}>
              Consignado
            </Text>
          </Pressable>
        </View>

        <Input
          label="Nome da Barbearia *"
          value={nome}
          onChangeText={setNome}
          onFocus={handleFieldFocus}
          placeholder="Ex: Barbearia Elite"
        />

        <Input
          label="CNPJ / CPF *"
          value={cnpjCpf}
          onChangeText={(value) => setCnpjCpf(formatDocument(value))}
          onFocus={handleFieldFocus}
          placeholder="00.000.000/0000-00"
          keyboardType="numeric"
          maxLength={18}
        />

        <Input
          label="CEP *"
          value={cep}
          onChangeText={(value) => setCep(formatCep(value))}
          onFocus={handleFieldFocus}
          placeholder="00000-000"
          keyboardType="numeric"
          maxLength={9}
        />

        <Button
          title={buscandoCep ? 'Buscando CEP...' : 'Buscar CEP'}
          icon="search-outline"
          onPress={handleBuscarCep}
          disabled={buscandoCep}
          variant="secondary"
        />

        <View style={{ height: 10 }} />

        <Input
          label="Endereço *"
          value={endereco}
          onChangeText={setEndereco}
          onFocus={handleFieldFocus}
          placeholder="Rua, bairro, cidade"
        />

        <Input
          label="Número *"
          value={numero}
          onChangeText={(value) => setNumero(normalizeAddressNumber(value))}
          onFocus={handleFieldFocus}
          placeholder="Ex: 123 ou S/N"
          maxLength={10}
        />

        <Input
          label="Complemento"
          value={complemento}
          onChangeText={setComplemento}
          onFocus={handleFieldFocus}
          placeholder="Ex: Sala 2, fundos"
        />

        <Input
          label="Responsável *"
          value={responsavel}
          onChangeText={setResponsavel}
          onFocus={handleFieldFocus}
          placeholder="Nome do responsável"
        />

        <Input
          label="Telefone *"
          value={telefone}
          onChangeText={(value) => setTelefone(formatPhone(value))}
          onFocus={handleFieldFocus}
          placeholder="(11) 99999-9999"
          keyboardType="phone-pad"
          maxLength={15}
        />

        <Input
          label="E-mail *"
          value={email}
          onChangeText={setEmail}
          onFocus={handleFieldFocus}
          placeholder="contato@barbearia.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {!clientId && (
          <Text style={{ color: '#2563EB', marginBottom: 16 }}>
            {operationMode === 'VENDA'
              ? 'Modo Vendas: os itens vendidos serão baixados apenas do estoque da Bymen.'
              : 'Modo Consignado: este cliente participa do fluxo de medição/consignado.'}
          </Text>
        )}
        <Button
          title={clientId ? 'Atualizar Cliente' : 'Salvar Cliente'}
          icon={clientId ? 'save-outline' : 'checkmark-done-outline'}
          onPress={handleSalvar}
        />
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
