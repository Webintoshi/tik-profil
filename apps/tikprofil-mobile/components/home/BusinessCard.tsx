import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
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
  if (business.description) return business.description;

  const descriptions: Record<string, string> = {
    restaurant: 'Premium yemek deneyimi, şefin özel menüsü ve unutulmaz lezzetler.',
    cafe: 'Keyifli vakit geçirebileceğiniz, özel kahve çeşitleri sunan mekan.',
    fastfood: 'Burger, Coffee & Beats',
    beauty: 'Kendinizi özel hissedeceğiniz profesyonel bakım hizmetleri.',
    shopping: 'En trend ürünler ve keyifli alışveriş deneyimi.',
    service: 'Güvenilir, hızlı ve profesyonel hizmet çözümleri.',
    other: 'Kaliteli hizmet ve müşteri memnuniyeti odaklı işletme.',
  };

  return descriptions[business.category] || descriptions.other;
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
  const descriptionText = getDescriptionText(business);

  const coverImageURL = getSafeImageURL(
    business.coverImage,
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI0YzRjRGNiIvPjwvc3ZnPg=='
  );

  const logoImageURL = getSafeImageURL(
    business.logoUrl,
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0U1RTdFQiIvPjwvc3ZnPg=='
  );

  return (
    <AnimatedTouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.cardInner}>
        {/* Cover Image Section */}
        <View style={styles.coverContainer}>
          <Image source={{ uri: coverImageURL }} style={styles.coverImage} resizeMode="cover" />
          <View style={styles.coverGradient} />

          {/* Recommended Badge (Top Right) */}
          {business.rating && business.rating >= 4.0 && (
            <BlurView intensity={20} tint="dark" style={styles.recommendedBadge}>
              <View style={styles.pingDot} />
              <Text style={styles.recommendedText}>ÖNERİLEN</Text>
            </BlurView>
          )}

          {/* Logo & Title Overlay (Bottom Glass) */}
          <BlurView intensity={80} tint="dark" style={styles.overlayContent}>
            <View style={styles.logoContainer}>
              <Image source={{ uri: logoImageURL }} style={styles.logoImage} />
            </View>
            <View style={styles.titleContainer}>
              <View style={styles.nameRow}>
                <Text style={styles.businessName} numberOfLines={1}>{business.name}</Text>
                {/* Verified Badge Integration */}
                <Ionicons name="checkmark-circle" size={16} color="#3B82F6" style={styles.verifiedIcon} />
              </View>
              {/* Category Pill Integration */}
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{categoryDisplayName.toUpperCase()}</Text>
              </View>
            </View>
          </BlurView>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Metrics Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Ionicons name="star" size={14} color="#F59E0B" style={styles.metricIcon} />
              <Text style={styles.ratingValue}>{business.rating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.reviewCount}>({business.reviewCount || 0})</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.metricItem}>
              <Ionicons name="time-outline" size={14} color="#9CA3AF" style={styles.metricIcon} />
              <Text style={styles.metricText}>15-20 dk</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.metricItem}>
              <Ionicons name="location-outline" size={14} color="#9CA3AF" style={styles.metricIcon} />
              <Text style={styles.metricText}>
                {business.distance
                  ? (business.distance < 1 ? `${Math.round(business.distance * 1000)} m` : `${business.distance.toFixed(1)} km`)
                  : '0 km'}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description} numberOfLines={2}>
            {descriptionText}
          </Text>

          {/* Footer: Tags & Like Button */}
          <View style={styles.footerRow}>
            <View style={styles.tagsRow}>
              <Text style={styles.tag}>#Premium</Text>
              <Text style={styles.tag}>#Rezervasyon</Text>
            </View>

            <AnimatedTouchableOpacity onPress={handleLikePress}>
              <Animated.View style={animatedStyle}>
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={22}
                  color={isLiked ? "#EF4444" : "#D1D5DB"}
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
    marginBottom: 16,
    marginHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  cardInner: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  coverContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'transparent',
  },
  recommendedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginRight: 6,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  overlayContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginRight: 12,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  businessName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  verifiedIcon: {
    marginTop: 2,
    marginLeft: 4,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subCategoryText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flex: 1,
  },
  contentSection: {
    padding: 16,
    paddingTop: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    marginRight: 4,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  reviewCount: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 2,
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
    marginBottom: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
