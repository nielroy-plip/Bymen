import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Input from '../components/Input';
import Button from '../components/Button';
import { saveClient, listClients } from '../services/api';
import { PRODUCTS } from '../data/products';
import { useResponsive } from '../hooks/useResponsive';

type Props = NativeStackScreenProps<RootStackParamList, 'CadastrarCliente'>;

export default function CadastrarClienteScreen({ navigation, route }: Props) {
  const [showEstoque, setShowEstoque] = useState(false);
  const [estoqueInicial, setEstoqueInicial] = useState<Record<string, string>>({});
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

  async function handleSalvar() {
    if (!nome.trim() || !telefone.trim()) {
      Alert.alert('Erro', 'Preencha pelo menos nome e telefone');
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
      estoqueInicial: Object.entries(estoqueInicial)
        .filter(([_, v]) => v && !isNaN(Number(v)))
        .map(([productId, quantidade]) => ({ productId, quantidade: Number(quantidade) }))
    };

    await saveClient(client);
    Alert.alert('Sucesso', clientId ? 'Cliente atualizado com sucesso' : 'Cliente cadastrado com sucesso', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
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
          label="CNPJ / CPF"
          value={cnpjCpf}
          onChangeText={setCnpjCpf}
          placeholder="00.000.000/0000-00"
          keyboardType="numeric"
        />

        <Input
          label="Endereço"
          value={endereco}
          onChangeText={setEndereco}
          placeholder="Rua, número, bairro, cidade"
        />

        <Input
          label="Responsável"
          value={responsavel}
          onChangeText={setResponsavel}
          placeholder="Nome do responsável"
        />

        <Input
          label="Telefone *"
          value={telefone}
          onChangeText={setTelefone}
          placeholder="+55 11 99999-9999"
          keyboardType="phone-pad"
        />

        {/* Botão de cadastrar estoque inicial removido ao editar */}
        {!clientId && (
          <Button
            title="Cadastrar Estoque Inicial"
            icon="add-circle-outline"
            onPress={() => navigation.navigate('NovoEstoque')}
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
