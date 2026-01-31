import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Place {
  id: string;
  name: string;
  image: string;
  category: string;
}

interface CityData {
  id: string;
  name: string;
  tagline: string;
  description: string;
  coverImage: string;
  places: Place[];
}

interface CityGuideCardProps {
  cityData: CityData | null;
  loading?: boolean;
  onPlacePress?: (place: Place) => void;
  onDetailPress?: () => void;
}

export function CityGuideCard({
  cityData,
  loading = false,
  onPlacePress,
  onDetailPress,
}: CityGuideCardProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.skeletonCard]}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (!cityData) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image
          source={{ uri: cityData.coverImage }}
          style={styles.coverImage}
          resizeMode="cover"
        />
        <View style={styles.overlay} />
        
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Ionicons name="location" size={14} color="#3B82F6" />
              <Text style={styles.badgeText}>Şehir Rehberi</Text>
            </View>
          </View>

          <Text style={styles.cityName}>
            {cityData.name}
            <Text style={styles.cityDot}>.</Text>
          </Text>

          <Text style={styles.tagline}>"{cityData.tagline}"</Text>

          <Text style={styles.description} numberOfLines={3}>
            {cityData.description}
          </Text>

          <TouchableOpacity
            style={styles.detailButton}
            onPress={onDetailPress}
            activeOpacity={0.9}
          >
            <Text style={styles.detailButtonText}>Detaylı Keşfet</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.placesSection}>
            <View style={styles.placesHeader}>
              <Ionicons name="information-circle" size={16} color="#3B82F6" />
              <Text style={styles.placesTitle}>Gezilecek Yerler</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.placesScroll}
            >
              {cityData.places.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  style={styles.placeCard}
                  onPress={() => onPlacePress?.(place)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: place.image }}
                    style={styles.placeImage}
                    resizeMode="cover"
                  />
                  <View style={styles.placeOverlay} />
                  <View style={styles.placeInfo}>
                    <Text style={styles.placeCategory}>{place.category}</Text>
                    <Text style={styles.placeName} numberOfLines={1}>
                      {place.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  card: {
    height: 280,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  skeletonCard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'flex-start',
    gap: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cityName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cityDot: {
    color: '#3B82F6',
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
    marginBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    padding: 8,
    borderRadius: 12,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  placesSection: {
    marginTop: 8,
  },
  placesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  placesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placesScroll: {
    gap: 16,
  },
  placeCard: {
    width: 120,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  placeImage: {
    width: '100%',
    height: '100%',
  },
  placeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  placeInfo: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  placeCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 2,
  },
  placeName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
