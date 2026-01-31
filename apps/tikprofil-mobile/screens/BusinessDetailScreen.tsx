import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation';

type BusinessDetailRouteProp = RouteProp<RootStackParamList, 'BusinessDetail'>;

export function BusinessDetailScreen() {
  const route = useRoute<BusinessDetailRouteProp>();
  const navigation = useNavigation();
  const webViewRef = useRef<WebView>(null);
  const { slug } = route.params;

  const url = `https://tikprofil.com/${slug}`;

  useEffect(() => {
    return () => {
      // Cleanup: WebView loading'i durdur ve referansı temizle
      if (webViewRef.current) {
        webViewRef.current.stopLoading();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            
            if (data.type === 'ORDER_CREATED') {
              navigation.navigate('Orders' as never);
            }
            
            if (data.type === 'ADD_FAVORITE') {
              // Refresh favorites
            }
          } catch (error) {
            console.error('WebView message error:', error);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webview: {
    flex: 1,
  },
});
