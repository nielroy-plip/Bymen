import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DashboardScreen from './screens/DashboardScreen';
import ClientesScreen from './screens/ClientesScreen';
import EstoqueScreen from './screens/EstoqueScreen';
import RelatoriosScreen from './screens/RelatoriosScreen';

type TabParamList = {
  Dashboard: undefined;
  Clientes: undefined;
  Estoque: undefined;
  Relatorios: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabRoutes() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#C8A961',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Estoque') {
            return <MaterialCommunityIcons name="table-furniture" size={size} color={color} />;
          }

          if (route.name === 'Clientes') {
            return <Ionicons name="people" size={size} color={color} />;
          }

          if (route.name === 'Relatorios') {
            return <Ionicons name="stats-chart" size={size} color={color} />;
          }

          return <Ionicons name="home" size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen as React.ComponentType<any>} options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="Clientes" component={ClientesScreen as React.ComponentType<any>} options={{ tabBarLabel: 'Clientes' }} />
      <Tab.Screen name="Estoque" component={EstoqueScreen as React.ComponentType<any>} options={{ tabBarLabel: 'Estoque' }} />
      <Tab.Screen name="Relatorios" component={RelatoriosScreen as React.ComponentType<any>} options={{ tabBarLabel: 'Relatórios' }} />
    </Tab.Navigator>
  );
}
