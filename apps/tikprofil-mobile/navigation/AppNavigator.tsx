import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { authService } from '@/services/auth';

// Components
import { CustomTabBar } from '@/components/navigation/CustomTabBar';

// Screens
import { HomeScreen } from '@/screens/HomeScreen';
import { ExploreScreen } from '@/screens/ExploreScreen';
import { QRScreen } from '@/screens/QRScreen';
import { OrdersScreen } from '@/screens/OrdersScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { BusinessDetailScreen } from '@/screens/BusinessDetailScreen';

// Types
import type { RootStackParamList, MainTabParamList } from '@/types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarAccessibilityLabel: 'Ana sayfa',
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarAccessibilityLabel: 'Rezervasyonlar',
        }}
      />
      <Tab.Screen
        name="QR"
        component={QRScreen}
        options={{
          tabBarAccessibilityLabel: 'QR kodu tara',
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarAccessibilityLabel: 'Siparişler',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarAccessibilityLabel: 'Profil',
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    console.log('[AppNavigator] Initializing auth...');
    authService.initialize().then(() => {
      const authState = authService.isAuthenticated();
      console.log('[AppNavigator] Auth initialized, isAuthenticated:', authState);
      console.log('[AppNavigator] Current user:', authService.getUser());
      setIsAuthenticated(authState);
      setIsLoading(false);
    }).catch((error) => {
      console.error('[AppNavigator] Auth initialization error:', error);
      setIsLoading(false);
    });

    const unsubscribe = authService.subscribe((state) => {
      console.log('[AppNavigator] Auth state changed:', state);
      setIsAuthenticated(state.authenticated);
    });

    return () => {
      console.log('[AppNavigator] Unsubscribing auth listener');
      unsubscribe();
    };
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="BusinessDetail"
          component={BusinessDetailScreen}
          options={{
            headerShown: true,
            title: 'İşletme Detayı',
            headerTintColor: '#111827',
            headerStyle: {
              backgroundColor: '#FFFFFF',
              shadowColor: 'transparent',
              elevation: 0,
              borderBottomWidth: 1,
              borderBottomColor: '#F3F4F6',
            },
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 16,
            },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
