import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: string, coords?: { lat: number; lng: number }) => void;
  currentLocation: string;
}

const MAJOR_CITIES = [
  'İstanbul',
  'Ankara',
  'İzmir',
  'Antalya',
  'Bursa',
  'Adana',
  'Gaziantep',
  'Konya',
];

export function LocationModal({
  visible,
  onClose,
  onLocationSelect,
  currentLocation,
}: LocationModalProps) {
  const [isLocating, setIsLocating] = useState(false);

  const handleGetCurrentLocation = async () => {
    try {
      setIsLocating(true);

      if (Platform.OS === 'web') {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              await reverseGeocode(latitude, longitude);
            },
            (error) => {
              console.error('Geolocation error:', error);
              setIsLocating(false);
            }
          );
        }
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.error('Location permission denied');
          setIsLocating(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        await reverseGeocode(latitude, longitude);
      }
    } catch (error) {
      console.error('Location error:', error);
      setIsLocating(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      const city =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.municipality ||
        data.address?.county ||
        'Konum';

      onLocationSelect(city, { lat, lng });
      setIsLocating(false);
      onClose();
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      setIsLocating(false);
    }
  };

  const handleCitySelect = (city: string) => {
    onLocationSelect(city);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Konumunuzu Seçin</Text>
            <Text style={styles.subtitle}>
              Konum bilgileriniz size yakın işletmeleri göstermemize yardımcı olur.
            </Text>

            <TouchableOpacity
              style={styles.gpsButton}
              onPress={handleGetCurrentLocation}
              disabled={isLocating}
            >
              <Ionicons name="location" size={22} color="#3B82F6" />
              <Text style={styles.gpsButtonText}>
                {isLocating ? 'Konum Alınıyor...' : 'Mevcut Konumu Kullan'}
              </Text>
              {isLocating && (
                <ActivityIndicator size="small" color="#3B82F6" />
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Şehir Seçin</Text>
            <View style={styles.citiesContainer}>
              {MAJOR_CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.cityButton,
                    currentLocation === city && styles.cityButtonActive,
                  ]}
                  onPress={() => handleCitySelect(city)}
                >
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={currentLocation === city ? '#FFFFFF' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.cityButtonText,
                      currentLocation === city && styles.cityButtonTextActive,
                    ]}
                  >
                    {city}
                  </Text>
                  {currentLocation === city && (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.disclaimer}>
              Konum bilgileriniz sadece size yakın işletmeleri göstermek için kullanılır.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    marginBottom: 24,
  },
  gpsButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1D4ED8',
    flex: 1,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  citiesContainer: {
    gap: 10,
    marginBottom: 20,
  },
  cityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  cityButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  cityButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  cityButtonTextActive: {
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
});
