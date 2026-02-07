import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
// import TabRoutes from './TabRoutes';
import DashboardScreen from './screens/DashboardScreen';
import ClientesScreen from './screens/ClientesScreen';
import ClienteDetalhesScreen from './screens/ClienteDetalhesScreen';
import CriarMedicaoScreen from './screens/CriarMedicaoScreen';
import FinalizarMedicaoScreen from './screens/FinalizarMedicaoScreen';
import HistoricoMedicoesScreen from './screens/HistoricoMedicoesScreen';
import EstoqueScreen from './screens/EstoqueScreen';
import EnviarEstoqueScreen from './screens/EnviarEstoqueScreen';
import ImportarEstoqueScreen from './screens/ImportarEstoqueScreen';
import CadastrarClienteScreen from './screens/CadastrarClienteScreen';
import { MedicaoRow, BancadaRow } from './services/api';
import NovoEstoqueScreen from './screens/NovoEstoqueScreen';
import RelatoriosScreen from './screens/RelatoriosScreen';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Clientes: undefined;
  ClienteDetalhes: { clientId: string } | undefined;
  CriarMedicao: { clientId: string } | undefined;
  FinalizarMedicao: {
    clientId: string;
    medicaoRows: MedicaoRow[];
    bancadaRows: BancadaRow[];
    valorMedicao: number;
    valorBancada: number;
    totalGeral: number;
    dateTime: string;
    responsavel?: string;
    signatureDataUrl?: string;
  };
  HistoricoMedicoes: undefined;
  Estoque: undefined;
  EnviarEstoque: { clientId: string } | undefined;
  ImportarEstoque: undefined;
  CadastrarCliente: { clientId?: string } | undefined;
  NovoEstoque: undefined;
  Relatorios: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Routes() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerBackTitle: 'Login', // texto do botão de voltar (opcional)
        gestureEnabled: true, // permite gestos
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: false,
          gestureEnabled: false, // impede swipe back na tela de login
        }}
      />
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={({ navigation }) => ({
          title: 'Dashboard',
          headerLeft: () => (
            <TouchableOpacity
              style={{ marginLeft: 16 }}
              onPress={() => navigation.replace('Login')}
            >
              <Ionicons name="log-out-outline" size={24} color="#111827" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="Clientes"
        component={ClientesScreen}
        options={{
          title: 'Barbearias',
          headerBackTitle: 'Dashboard',
        }}
      />
      <Stack.Screen
        name="ClienteDetalhes"
        component={ClienteDetalhesScreen}
        options={{
          title: 'Barbearia',
          headerBackTitle: 'Barbearias',
        }}
      />
      <Stack.Screen
        name="CriarMedicao"
        component={CriarMedicaoScreen}
        options={{
          title: 'Nova medição',
          headerBackTitle: 'Barbearias',
        }}
      />
      <Stack.Screen
        name="FinalizarMedicao"
        component={FinalizarMedicaoScreen}
        options={{
          title: 'Finalizar Medição',
          headerBackTitle: 'Criar Medição',
        }}
      />
      <Stack.Screen
        name="HistoricoMedicoes"
        component={HistoricoMedicoesScreen}
        options={{
          title: 'Histórico',
          headerBackTitle: 'Dashboard',
        }}
      />
      <Stack.Screen
        name="Estoque"
        component={EstoqueScreen}
        options={{
          title: 'Estoque',
          headerBackTitle: 'Dashboard',
        }}
      />
      <Stack.Screen
        name="EnviarEstoque"
        component={EnviarEstoqueScreen}
        options={{
          title: 'Reposição Extra',
          headerBackTitle: 'Barbearias',
        }}
      />
      <Stack.Screen
        name="ImportarEstoque"
        component={ImportarEstoqueScreen}
        options={{
          title: 'Importar Estoque',
          headerBackTitle: 'Dashboard',
          headerBackVisible: true,
        }}
      />
      <Stack.Screen
        name="CadastrarCliente"
        component={CadastrarClienteScreen}
        options={({ route }) => ({
          title: route.params && route.params.clientId ? 'Editar Barbearia' : 'Nova Barbearia',
          headerBackTitle: 'Barbearias',
        })}
      />
      <Stack.Screen
        name="NovoEstoque"
        component={NovoEstoqueScreen}
        options={{
          title: 'Estoque Inicial',
          headerBackTitle: 'Nova Barbearia',
        }}
      />
      <Stack.Screen
        name="Relatorios"
        component={RelatoriosScreen}
        options={{
          title: 'Relatórios',
          headerBackTitle: 'Dashboard',
        }}
      />
    </Stack.Navigator>
  );
}
