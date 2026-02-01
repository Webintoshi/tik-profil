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
import type { Business } from '@tikprofil/shared-types';

interface Story {
  id: string;
  name: string;
  avatar: string | null;
  isLive?: boolean;
  hasUnseen?: boolean;
}

interface StoriesBarProps {
  stories?: Story[];
  loading?: boolean;
  onStoryPress?: (story: Story) => void;
}

const DEFAULT_STORIES: Story[] = [];

export function StoriesBar({
  stories = DEFAULT_STORIES,
  loading = false,
  onStoryPress,
}: StoriesBarProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <View key={item} style={styles.storyItem}>
              <View style={[styles.storyRing, styles.skeletonRing]} />
              <View style={styles.skeletonText} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (stories.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {stories.map((story) => (
          <TouchableOpacity
            key={story.id}
            style={styles.storyItem}
            onPress={() => onStoryPress?.(story)}
            activeOpacity={0.9}
          >
            <View
              style={[
                styles.storyRing,
                story.hasUnseen && styles.storyRingUnseen,
              ]}
            >
              <View style={styles.storyInnerRing}>
                <Image
                  source={{
                    uri:
                      story.avatar ||
                      'https://via.placeholder.com/100?text=Business',
                  }}
                  style={styles.storyImage}
                />
              </View>
            </View>
            {story.isLive && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
            <Text style={styles.storyName} numberOfLines={1}>
              {story.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  storyItem: {
    alignItems: 'center',
    width: 72,
  },
  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 2,
    marginBottom: 6,
  },
  storyRingUnseen: {
    borderColor: '#3B82F6',
    borderWidth: 3,
  },
  storyInnerRing: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    padding: 2,
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
  },
  liveBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  storyName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  skeletonRing: {
    backgroundColor: '#F3F4F6',
  },
  skeletonText: {
    width: 50,
    height: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    marginTop: 4,
  },
});
