import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
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

interface BusinessCardProps {
  business: Business;
  onPress?: (business: Business) => void;
  onFavoritePress?: (business: Business) => void;
}

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

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
  return business.subCategory || business.categoryName || CATEGORY_NAMES.other || 'İşletme';
};

const getDescriptionText = (business: Business): string => {
  if (business.description) {
    return business.description;
  }

  const categoryName = getCategoryDisplayName(business);
  if (business.category === 'other' && business.subCategory) {
    return `${business.subCategory} sektöründe kaliteli hizmet.`;
  }

  const descriptions: Record<string, string> = {
    restaurant: 'Lezzetli yemekler ve eşsiz bir deneyim.',
    cafe: 'Keyifli vakit geçirebileceğiniz mekan.',
    fastfood: 'Hızlı ve lezzetli atıştırmalıklar.',
    beauty: 'Profesyonel bakım hizmetleri.',
    shopping: 'Kaliteli ürünler ve uygun fiyatlar.',
    service: 'Güvenilir ve kaliteli hizmet.',
  };

  return descriptions[business.category] || `${categoryName} sektöründe kaliteli hizmet.`;
};

const getSafeImageURL = (url: string | undefined, fallback: string): string => {
  if (!url) return fallback;

  const blockedDomains = ['via.placeholder.com', 'placeholder.com'];
  try {
    const urlObj = new URL(url);
    if (blockedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return fallback;
    }
  } catch {
    return fallback;
  }

  return url;
};

export function BusinessCard({
  business,
  onPress,
  onFavoritePress,
}: BusinessCardProps) {
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
  const descriptionText = getDescriptionText(business);

  const coverImageURL = getSafeImageURL(
    business.coverImage,
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0YzRjRGNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0iIzlDQTNBRiI+T8SZTGV0bWV5aW4gWW9rPC90ZXh0Pjwvc3ZnPg=='
  );

  const logoImageURL = getSafeImageURL(
    business.logoUrl,
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0U1RTdFQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0iIzdCNzI4MCI+TG9nbzwvdGV4dD48L3N2Zz4='
  );

  return (
    <AnimatedTouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.cardInner}>
        <View style={styles.coverContainer}>
          <Image
            source={{ uri: coverImageURL }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View style={styles.coverGradient} />

          {business.rating && business.rating >= 4.8 && (
            <View style={styles.recommendedBadge}>
              <View style={styles.pingDot} />
              <View style={styles.staticDot} />
              <Text style={styles.recommendedText}>Önerilen</Text>
            </View>
          )}

          <View style={styles.bottomSection}>
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: logoImageURL }}
                style={styles.logoImage}
              />
            </View>

            <View style={styles.titleSection}>
              <Text style={styles.businessName} numberOfLines={1}>
                {business.name}
              </Text>
              <Text style={styles.businessCategory} numberOfLines={1}>
                {categoryDisplayName}
                {business.district ? ` • ${business.district}` : ''}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.contentSection}>
          <View style={styles.metricsRow}>
            {business.rating && (
              <View style={styles.metric}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.metricValue}>{business.rating}</Text>
                {business.reviewCount && (
                  <Text style={styles.metricLabel}>
                    ({business.reviewCount})
                  </Text>
                )}
              </View>
            )}

            <View style={styles.metric}>
              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
              <Text style={styles.metricLabel}>15-20 dk</Text>
            </View>

            {business.distance && (
              <View style={styles.metric}>
                <Ionicons name="location" size={14} color="#9CA3AF" />
                <Text style={styles.metricLabel}>
                  {business.distance < 1
                    ? `${Math.round(business.distance * 1000)} m`
                    : `${business.distance.toFixed(1)} km`}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.footerRow}>
            <View style={styles.footerLeft}>
              <Text style={styles.description} numberOfLines={2}>
                {descriptionText}
              </Text>
            </View>

            <AnimatedTouchableOpacity
              style={[
                styles.likeButton,
                isLiked && styles.likeButtonLiked,
              ]}
              onPress={handleLikePress}
              activeOpacity={0.8}
            >
              <Animated.View style={animatedStyle}>
                <Ionicons
                  name="heart"
                  size={22}
                  color={isLiked ? '#EF4444' : '#D1D5DB'}
                />
              </Animated.View>
            </AnimatedTouchableOpacity>
          </View>
        </View>
      </View>
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  cardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  coverContainer: {
    height: 180,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  recommendedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  pingDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  staticDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    marginLeft: 8,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  logoContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 2,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  titleSection: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  businessCategory: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  contentSection: {
    padding: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  footerLeft: {
    flex: 1,
    marginRight: 12,
  },
  description: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 6,
  },
  likeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeButtonLiked: {
    backgroundColor: '#FEF2F2',
  },
});
