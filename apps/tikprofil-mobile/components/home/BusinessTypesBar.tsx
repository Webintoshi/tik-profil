import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type BusinessCategory =
  | 'all'
  | 'restaurant'
  | 'cafe'
  | 'fastfood'
  | 'beauty'
  | 'shopping'
  | 'service'
  | 'other';

interface BusinessType {
  id: BusinessCategory;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface BusinessTypesBarProps {
  selectedCategory: BusinessCategory;
  onCategoryChange: (category: BusinessCategory) => void;
  categories?: BusinessType[];
}

const DEFAULT_CATEGORIES: BusinessType[] = [
  { id: 'all', name: 'Tümü', icon: 'compass-outline' },
  { id: 'restaurant', name: 'Restoran', icon: 'restaurant-outline' },
  { id: 'cafe', name: 'Cafe', icon: 'cafe-outline' },
  { id: 'fastfood', name: 'Fast Food', icon: 'pizza-outline' },
  { id: 'beauty', name: 'Güzellik', icon: 'scissors-outline' },
  { id: 'shopping', name: 'Alışveriş', icon: 'bag-outline' },
  { id: 'service', name: 'Hizmet', icon: 'briefcase-outline' },
  { id: 'other', name: 'Diğer', icon: 'business-outline' },
];

export function BusinessTypesBar({
  selectedCategory,
  onCategoryChange,
  categories = DEFAULT_CATEGORIES,
}: BusinessTypesBarProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => {
          const isActive = selectedCategory === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                isActive && styles.categoryButtonActive
              ]}
              onPress={() => onCategoryChange(category.id)}
              activeOpacity={0.9}
            >
              <View style={[
                styles.iconContainer,
                isActive && styles.iconContainerActive
              ]}>
                <Ionicons
                  name={category.icon}
                  size={20}
                  color={isActive ? '#FFFFFF' : '#6B7280'}
                />
              </View>
              <Text style={[
                styles.categoryText,
                isActive && styles.categoryTextActive
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: '#F3F4F6',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
