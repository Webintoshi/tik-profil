import React from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

// Premium Tab Bar - TikProfil
const BRAND_BLUE = '#3B82F6';
const BRAND_BLUE_DARK = '#2563EB';

type TabRoute = 'Home' | 'Explore' | 'QR' | 'Orders' | 'Profile';

const tabConfig: Record<TabRoute, { icon: string; iconFilled: string; label: string }> = {
  Home: { icon: 'home-outline', iconFilled: 'home', label: 'Ana Sayfa' },
  Explore: { icon: 'compass-outline', iconFilled: 'compass', label: 'Keşfet' },
  QR: { icon: 'qr-code-outline', iconFilled: 'qr-code', label: 'QR' },
  Orders: { icon: 'receipt-outline', iconFilled: 'receipt', label: 'Siparişler' },
  Profile: { icon: 'person-outline', iconFilled: 'person', label: 'Profil' },
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const handleTabPress = (routeName: string) => {
    navigation.navigate(routeName);
  };

  const handleQRPress = () => {
    navigation.navigate('QR');
  };

  return (
    <View style={styles.containerWrapper}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 80 : 90}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.container,
          {
            paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
            borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          },
        ]}
      >
        <View style={styles.tabsRow}>
          {/* Left tabs - Home, Explore */}
          {['Home', 'Explore'].map((routeName) => {
            const routeIndex = state.routeNames.indexOf(routeName);
            const isFocused = state.index === routeIndex;
            const config = tabConfig[routeName as TabRoute];

            return (
              <Pressable
                key={routeName}
                onPress={() => handleTabPress(routeName)}
                style={styles.tab}
              >
                <Ionicons
                  name={(isFocused ? config.iconFilled : config.icon) as any}
                  size={24}
                  color={isFocused ? BRAND_BLUE : isDark ? '#9CA3AF' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.label,
                    {
                      color: isFocused ? BRAND_BLUE : isDark ? '#9CA3AF' : '#6B7280',
                      fontWeight: isFocused ? '600' : '500',
                    },
                  ]}
                >
                  {config.label}
                </Text>
              </Pressable>
            );
          })}

          {/* Center QR Button */}
          <Pressable onPress={handleQRPress} style={styles.qrButtonWrapper}>
            <View style={[styles.qrButton, isDark && styles.qrButtonDark]}>
              <Ionicons name="qr-code" size={28} color="#FFFFFF" />
            </View>
          </Pressable>

          {/* Right tabs - Orders, Profile */}
          {['Orders', 'Profile'].map((routeName) => {
            const routeIndex = state.routeNames.indexOf(routeName);
            const isFocused = state.index === routeIndex;
            const config = tabConfig[routeName as TabRoute];

            return (
              <Pressable
                key={routeName}
                onPress={() => handleTabPress(routeName)}
                style={styles.tab}
              >
                <Ionicons
                  name={(isFocused ? config.iconFilled : config.icon) as any}
                  size={24}
                  color={isFocused ? BRAND_BLUE : isDark ? '#9CA3AF' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.label,
                    {
                      color: isFocused ? BRAND_BLUE : isDark ? '#9CA3AF' : '#6B7280',
                      fontWeight: isFocused ? '600' : '500',
                    },
                  ]}
                >
                  {config.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  containerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    // Glassmorphism typically doesn't need heavy shadows if it has border
    // but some elevation helps separation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 0,
  },
  container: {
    width: '100%',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 64,
    gap: 2,
  },
  label: {
    fontSize: 10,
    marginTop: 2,
  },
  qrButtonWrapper: {
    marginTop: -20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  qrButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  qrButtonDark: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
  },
});
