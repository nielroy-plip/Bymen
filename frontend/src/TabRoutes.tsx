import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DashboardScreen from './screens/DashboardScreen';
import ClientesScreen from './screens/ClientesScreen';
import EstoqueScreen from './screens/EstoqueScreen';
import RelatoriosScreen from './screens/RelatoriosScreen';

const Tab = createBottomTabNavigator();

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
          let iconName = 'home';
          let IconComponent = Ionicons;
          if (route.name === 'Dashboard') iconName = 'home';
          if (route.name === 'Clientes') iconName = 'people';
          if (route.name === 'Estoque') {
            // Usar ícone de bancada customizado (MaterialCommunityIcons: table-furniture)
            IconComponent = MaterialCommunityIcons;
            iconName = 'table-furniture';
          }
          if (route.name === 'Relatorios') iconName = 'stats-chart';
          return <IconComponent name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="Clientes" component={ClientesScreen} options={{ tabBarLabel: 'Clientes' }} />
      <Tab.Screen name="Estoque" component={EstoqueScreen} options={{ tabBarLabel: 'Estoque' }} />
      <Tab.Screen name="Relatorios" component={RelatoriosScreen} options={{ tabBarLabel: 'Relatórios' }} />
    </Tab.Navigator>
  );
}
