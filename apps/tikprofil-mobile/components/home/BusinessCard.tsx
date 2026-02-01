import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import type { Business } from '@tikprofil/shared-types';
import { BlurView } from 'expo-blur';

interface BusinessCardProps {
  business: Business;
  onPress?: (business: Business) => void;
  onFavoritePress?: (business: Business) => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

const CATEGORY_NAMES: Record<string, string> = {
  all: 'Tümü',
  restaurant: 'Restoran',
  cafe: 'Cafe & Bistro',
  fastfood: 'Fast Food',
  beauty: 'Güzellik & Spa',
  shopping: 'Alışveriş',
  service: 'Hizmet',
  other: 'Diğer',
};

const getCategoryDisplayName = (business: Business): string => {
  if (business.category && business.category !== 'other') {
    return CATEGORY_NAMES[business.category] || business.category;
  }
  return business.subCategory || CATEGORY_NAMES.other || 'İşletme';
};

const formatDistance = (distance: number | null): string => {
  if (!distance || distance >= 999999) return '';
  if (distance < 1) return `${Math.round(distance * 1000)} m`;
  return `${distance.toFixed(1)} km`;
};

const getSafeImageURL = (url: string | undefined | null, fallbackColor: string = '#E5E7EB'): string => {
  if (!url) {
    return `data:image/svg+xml;base64,${btoa(`<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="200" fill="${fallbackColor}"/></svg>`)}`;
  }
  const blockedDomains = ['via.placeholder.com', 'placeholder.com'];
  try {
    const urlObj = new URL(url);
    if (blockedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return `data:image/svg+xml;base64,${btoa(`<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="200" fill="${fallbackColor}"/></svg>`)}`;
    }
  } catch {
    return `data:image/svg+xml;base64,${btoa(`<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="200" fill="${fallbackColor}"/></svg>`)}`;
  }
  return url;
};

export function BusinessCard({ business, onPress, onFavoritePress }: BusinessCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleLikePress = () => {
    setIsLiked(!isLiked);
    scale.value = withSequence(
      withTiming(1.4, { duration: 150 }),
      withSpring(1, { damping: 15 })
    );
    onFavoritePress?.(business);
  };

  const handlePress = () => {
    onPress?.(business);
  };

  const categoryDisplayName = getCategoryDisplayName(business);
  const distanceText = formatDistance(business.distance);

  const coverImageURL = getSafeImageURL(business.coverImage, '#F3F4F6');
  const logoImageURL = getSafeImageURL(business.logoUrl, '#3B82F6');

  return (
    <AnimatedTouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.95}
    >
      {/* Cover Image Section */}
      <View style={styles.coverSection}>
        <Image
          source={{ uri: coverImageURL }}
          style={styles.coverImage}
          resizeMode="cover"
        />

        {/* Glassmorphism Overlay at Bottom of Cover */}
        <BlurView intensity={80} tint="dark" style={styles.overlayContent}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image source={{ uri: logoImageURL }} style={styles.logoImage} />
          </View>

          {/* Name & Category */}
          <View style={styles.titleContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.businessName} numberOfLines={1}>
                {business.name}
              </Text>
              {business.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color="#3B82F6" style={styles.verifiedIcon} />
              )}
            </View>
            <Text style={styles.categoryText}>{categoryDisplayName}</Text>
          </View>
        </BlurView>
      </View>

      {/* White Content Section - ONLY REAL DATA */}
      <View style={styles.contentSection}>
        {/* Metrics Row - Only show what we have */}
        <View style={styles.metricsRow}>
          {/* Rating - only if exists */}
          {business.rating && business.rating > 0 && (
            <>
              <View style={styles.metricItem}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingValue}>{business.rating.toFixed(1)}</Text>
                {business.reviewCount && business.reviewCount > 0 && (
                  <Text style={styles.reviewCount}>({business.reviewCount})</Text>
                )}
              </View>
              {distanceText && <View style={styles.separator} />}
            </>
          )}

          {/* Distance - only if exists */}
          {distanceText && (
            <View style={styles.metricItem}>
              <Ionicons name="location-outline" size={14} color="#9CA3AF" />
              <Text style={styles.metricText}>{distanceText}</Text>
            </View>
          )}
        </View>

        {/* Description - REAL DATA from business.description */}
        {business.description && (
          <Text style={styles.description} numberOfLines={2}>
            {business.description}
          </Text>
        )}

        {/* Footer: Only Like Button */}
        <View style={styles.footerRow}>
          <View style={styles.spacer} />
          <TouchableOpacity onPress={handleLikePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Animated.View style={animatedStyle}>
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={22}
                color={isLiked ? "#EF4444" : "#D1D5DB"}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  coverSection: {
    height: 160,
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  overlayContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: '#E5E7EB',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  verifiedIcon: {
    marginLeft: 6,
  },
  categoryText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  contentSection: {
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 20,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  reviewCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  separator: {
    width: 1,
    height: 12,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  metricText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
});
