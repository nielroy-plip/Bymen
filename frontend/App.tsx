import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableFreeze, enableScreens } from 'react-native-screens';
import Routes from './src/routes';
import AppAlertProvider from './src/components/AppAlertProvider';
// [EXPO GO] expo-notifications desativado para testes no Expo Go
// import { setupNotifications } from './src/services/notifications';

enableScreens(true);
enableFreeze(true);

export default function App() {
  // useEffect(() => {
  //   setupNotifications().catch(() => undefined);
  // }, []);

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#FFFFFF',
      text: '#111827',
      primary: '#C8A961'
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppAlertProvider>
        <NavigationContainer theme={navTheme}>
          <Routes />
        </NavigationContainer>
      </AppAlertProvider>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}
