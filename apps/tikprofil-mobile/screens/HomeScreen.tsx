import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Business } from '@tikprofil/shared-types';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types/navigation';
import { getBusinesses } from '@tikprofil/shared-api';
import { useLocation } from '@/hooks/useLocation';
import { StoriesBar } from '@/components/home/StoriesBar';
import { BusinessTypesBar, BusinessCategory } from '@/components/home/BusinessTypesBar';
import { CityGuideCard } from '@/components/home/CityGuideCard';
import { BusinessCard } from '@/components/home/BusinessCard';
import { SearchBar } from '@/components/home/SearchBar';
import { FilterModal, FilterState } from '@/components/home/FilterModal';
import { LocationModal } from '@/components/home/LocationModal';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Story {
  id: string;
  name: string;
  avatar: string | null;
  isLive?: boolean;
  hasUnseen?: boolean;
}

interface CityData {
  id: string;
  name: string;
  tagline: string;
  description: string;
  coverImage: string;
  places: Array<{
    id: string;
    name: string;
    image: string;
    category: string;
  }>;
}

export function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // Location hook - real GPS location
  const location = useLocation();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showLocation, setShowLocation] = useState(false);

  const [stories, setStories] = useState<Story[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);

  const [cityData, setCityData] = useState<CityData | null>(null);
  const [cityLoading, setCityLoading] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    sortBy: 'distance',
    minRating: 0,
  });

  // Use location city or fallback
  const currentLocation = location.city || 'Konum alınıyor...';

  const fetchBusinesses = async (category: BusinessCategory = 'all') => {
    try {
      console.log('Fetching businesses...', {
        category,
        lat: location.coords?.latitude,
        lng: location.coords?.longitude
      });

      const data = await getBusinesses({
        limit: 30,
        ...(category !== 'all' && { category }),
        // Pass real coordinates for distance calculation
        ...(location.coords && {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        }),
      });

      console.log('Businesses fetched:', data.length);
      setBusinesses(data);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('İşletmeler yüklenirken bir hata oluştu: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const fetchStories = async () => {
    try {
      setStoriesLoading(true);
      const data = await getBusinesses({ limit: 8 });
      const storyData: Story[] = data.slice(0, 8).map((b, index) => ({
        id: b.id,
        name: b.name,
        avatar: b.logoUrl || b.coverImage || null,
        isLive: index < 2,
        hasUnseen: index < 4,
      }));
      setStories(storyData);
    } catch (err) {
      console.error('Stories fetch error:', err);
    } finally {
      setStoriesLoading(false);
    }
  };

  const fetchCityData = async (city: string) => {
    try {
      setCityLoading(true);
      // Web ortamında localhost çalışır ama native'de IP adresi gerekir
      // Şimdilik mock data dönelim hata almamak için
      // const response = await fetch(
      //   `http://localhost:3000/api/cities?name=${encodeURIComponent(city)}`
      // );
      // const data = await response.json();
      // setCityData(data);

      // Mock City Data (API hazır olana kadar)
      setCityData({
        id: 'istanbul',
        name: 'İstanbul',
        tagline: 'İki kıtayı birleştiren şehir',
        description: 'Tarihi yarımada, boğaz manzarası ve eşsiz lezzetleriyle İstanbul sizi bekliyor.',
        coverImage: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=800',
        places: [
          { id: '1', name: 'Galata Kulesi', category: 'Tarihi', image: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?q=80&w=400' },
          { id: '2', name: 'Kız Kulesi', category: 'Simge', image: 'https://images.unsplash.com/photo-1622587853578-dd1bf9608d26?q=80&w=400' },
          { id: '3', name: 'Ayasofya', category: 'Cami', image: 'https://images.unsplash.com/photo-1545459720-aac3e5c22128?q=80&w=400' },
        ]
      });
    } catch (err) {
      console.error('City data fetch error:', err);
      setCityData(null);
    } finally {
      setCityLoading(false);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([
      fetchBusinesses(selectedCategory),
      fetchStories(),
      fetchCityData(currentLocation),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchBusinesses(selectedCategory);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (currentLocation && !loading) {
      fetchCityData(currentLocation);
    }
  }, [currentLocation]);

  // Refetch businesses when location coordinates change
  useEffect(() => {
    if (location.coords && !loading) {
      console.log('[HomeScreen] Location changed, refetching businesses...');
      fetchBusinesses(selectedCategory);
    }
  }, [location.coords?.latitude, location.coords?.longitude]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategoryChange = (category: BusinessCategory) => {
    setSelectedCategory(category);
    setFilters({ ...filters, category });
  };

  const handleFilterApply = (newFilters: FilterState) => {
    setFilters(newFilters);
    if (newFilters.category !== selectedCategory) {
      setSelectedCategory(newFilters.category);
    }
  };

  const handleBusinessPress = (business: Business) => {
    navigation.navigate('BusinessDetail', { slug: business.slug });
  };

  const handleStoryPress = (story: Story) => {
    console.log('Story pressed:', story);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <SearchBar
        value={searchQuery}
        onChangeText={handleSearch}
        onFilterPress={() => setShowFilters(true)}
      />

      <View style={styles.locationRow}>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => setShowLocation(true)}
        >
          <Ionicons name="location" size={18} color="#6B7280" />
          <Text style={styles.locationText}>{currentLocation}</Text>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <StoriesBar
        stories={stories}
        loading={storiesLoading}
        onStoryPress={handleStoryPress}
      />

      <BusinessTypesBar
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />

      <CityGuideCard
        cityData={cityData}
        loading={cityLoading}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Keşfet</Text>
        <Text style={styles.sectionSubtitle}>Yakınındaki en iyi mekanlar</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadInitialData}
          >
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const filteredBusinesses = businesses.filter((business) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        business.name.toLowerCase().includes(query) ||
        business.category?.toLowerCase().includes(query) ||
        business.district?.toLowerCase().includes(query)
      );
    }
    if (filters.minRating > 0 && (!business.rating || business.rating < filters.minRating)) {
      return false;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleFilterApply}
        initialFilters={filters}
      />

      <LocationModal
        visible={showLocation}
        onClose={() => setShowLocation(false)}
        onLocationSelect={() => location.refresh()}
        currentLocation={currentLocation}
      />

      <FlatList
        data={filteredBusinesses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BusinessCard
            business={item}
            onPress={handleBusinessPress}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>
              {businesses.length === 0 ? 'İşletme Bulunamadı' : 'Sonuç bulunamadı'}
            </Text>
            <Text style={styles.emptyText}>
              {businesses.length === 0
                ? 'Sistemde kayıtlı aktif işletme görünmüyor.'
                : 'Farklı arama kriterleri deneyin'}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { marginTop: 20 }]}
              onPress={loadInitialData}
            >
              <Text style={styles.retryText}>Yenile</Text>
            </TouchableOpacity>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 100,
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
