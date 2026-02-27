import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeMap from '../../components/HomeMap';
import { ActivityCategories, Colors, Radius, Shadows, Spacing, Typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Bottom sheet snap points
const SNAP_FULL = 0.12;      // full open (12% from top)
const SNAP_HALF = 0.55;      // half open (55% from top)
const SNAP_COLLAPSED = 0.80; // peek (80% from top)

// Dummy activity data for when DB is empty
const DUMMY_ACTIVITIES = [
  {
    id: 'dummy-1',
    title: 'Beach Volleyball',
    emoji: '🏐',
    creator: { username: 'Nam' },
    crew: { name: 'LA Squad' },
    scheduled_at: new Date(Date.now() + 7200000).toISOString(),
    latitude: 34.0125,
    longitude: -118.496,
    threshold: 6,
    committed: 4,
    category: 'sports',
  },
  {
    id: 'dummy-2',
    title: 'Pizza Run 🍕',
    emoji: '🍕',
    creator: { username: 'Alex' },
    crew: { name: 'Foodies' },
    scheduled_at: new Date(Date.now() + 3600000).toISOString(),
    latitude: 34.0195,
    longitude: -118.491,
    threshold: 4,
    committed: 3,
    category: 'food',
  },
  {
    id: 'dummy-3',
    title: 'Late Night Movie',
    emoji: '🎬',
    creator: { username: 'Jordan' },
    crew: { name: 'Cinema Crew' },
    scheduled_at: new Date(Date.now() + 14400000).toISOString(),
    latitude: 34.023,
    longitude: -118.485,
    threshold: 5,
    committed: 2,
    category: 'movies',
  },
  {
    id: 'dummy-4',
    title: 'Pickup Basketball',
    emoji: '🏀',
    creator: { username: 'Sam' },
    crew: { name: 'Ballers' },
    scheduled_at: new Date(Date.now() + 1800000).toISOString(),
    latitude: 34.016,
    longitude: -118.502,
    threshold: 10,
    committed: 7,
    category: 'sports',
  },
];

function formatCountdown(date: string) {
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return 'Now!';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `In ${h}h ${m}m`;
  return `In ${m}m`;
}

export default function Index() {
  const [activities, setActivities] = useState<any[]>(DUMMY_ACTIVITIES);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Bottom sheet animation
  const sheetY = useRef(new Animated.Value(SCREEN_HEIGHT * SNAP_HALF)).current;
  const currentSnap = useRef(SNAP_HALF);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 5,
      onPanResponderMove: (_, { dy }) => {
        const newY = SCREEN_HEIGHT * currentSnap.current + dy;
        const minY = SCREEN_HEIGHT * SNAP_FULL;
        const maxY = SCREEN_HEIGHT * SNAP_COLLAPSED;
        sheetY.setValue(Math.max(minY, Math.min(maxY, newY)));
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        const currentY = SCREEN_HEIGHT * currentSnap.current + dy;
        const fullY = SCREEN_HEIGHT * SNAP_FULL;
        const halfY = SCREEN_HEIGHT * SNAP_HALF;
        const collapsedY = SCREEN_HEIGHT * SNAP_COLLAPSED;

        let target: number;
        let snapConst: number;

        if (vy < -0.5 || currentY < (fullY + halfY) / 2) {
          if (vy < -1 || currentY < (fullY + halfY) / 2) {
            target = fullY;
            snapConst = SNAP_FULL;
          } else {
            target = halfY;
            snapConst = SNAP_HALF;
          }
        } else if (vy > 0.5 || currentY > (halfY + collapsedY) / 2) {
          target = collapsedY;
          snapConst = SNAP_COLLAPSED;
        } else {
          target = halfY;
          snapConst = SNAP_HALF;
        }

        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        currentSnap.current = snapConst;
        Animated.spring(sheetY, {
          toValue: target,
          useNativeDriver: false,
          damping: 25,
          stiffness: 200,
        }).start();
      },
    })
  ).current;

  function snapSheet(snap: number) {
    currentSnap.current = snap;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(sheetY, {
      toValue: SCREEN_HEIGHT * snap,
      useNativeDriver: false,
      damping: 25,
      stiffness: 200,
    }).start();
  }

  useEffect(() => {
    fetchActivities();
    getUserLocation();
  }, []);

  async function getUserLocation() {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Update activities if they are dummy ones to be near the user
      setActivities(prev => prev.map((a, i) => {
        if (a.id.startsWith('dummy-')) {
          return {
            ...a,
            latitude: location.coords.latitude + (Math.random() - 0.5) * 0.04,
            longitude: location.coords.longitude + (Math.random() - 0.5) * 0.04,
          };
        }
        return a;
      }));
    } catch (_) {
      console.warn('Could not fetch location');
    }
  }

  async function fetchActivities() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activities')
        .select(`*, creator:profiles!creator_id(username, avatar_url), crew:crews(name)`)
        .order('scheduled_at', { ascending: true });

      if (!error && data && data.length > 0) {
        setActivities(data);
      }
    } catch (_) {
      // use dummy data on error
    } finally {
      setLoading(false);
    }
  }

  const filteredActivities = selectedCategory === 'all'
    ? activities
    : activities.filter(a => a.category === selectedCategory);

  const renderCategoryPill = ({ item }: { item: typeof ActivityCategories[number] }) => {
    const active = selectedCategory === item.id;
    return (
      <TouchableOpacity
        style={[styles.categoryPill, active && styles.categoryPillActive]}
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedCategory(item.id);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.categoryEmoji}>{item.emoji}</Text>
        <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  const renderActivity = ({ item }: { item: any }) => {
    const committed = item.committed ?? 0;
    const threshold = item.threshold ?? 1;
    const progress = Math.min(committed / threshold, 1);
    const hype = committed >= threshold;

    return (
      <TouchableOpacity
        style={styles.activityCard}
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/activity/${item.id}`);
        }}
        activeOpacity={0.92}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.cardEmoji, hype && styles.cardEmojiHype]}>
            <Text style={styles.cardEmojiText}>{item.emoji || '✨'}</Text>
          </View>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            {hype && <View style={styles.hypeTag}><Text style={styles.hypeTagText}>🔥 On!</Text></View>}
          </View>
          <Text style={styles.cardMeta}>
            {item.crew?.name || 'Local'} · {formatCountdown(item.scheduled_at)}
          </Text>
          {/* RSVP progress bar */}
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{committed}/{threshold}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} style={{ marginTop: 2 }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>

      {/* ── FULL-BLEED MAP ── */}
      <HomeMap
        activities={filteredActivities}
        userLocation={userLocation}
        onPinPress={(id) => router.push(`/activity/${id}`)}
        onMapPress={() => snapSheet(SNAP_COLLAPSED)}
      />

      {/* ── FLOATING HEADER ── */}
      <View style={[styles.headerFloat, { top: insets.top + 12 }]} pointerEvents="box-none">
        <BlurView intensity={85} tint="systemChromeMaterialLight" style={styles.headerBlur}>
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.headerGreeting}>Hey there 👋</Text>
              <Text style={styles.headerSub}>What's the vibe today?</Text>
            </View>
            <TouchableOpacity style={styles.avatarButton}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>N</Text>
              </View>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>

      {/* ── BOTTOM SHEET ── */}
      <Animated.View style={[styles.sheet, { top: sheetY }]}>

        {/* Drag Handle */}
        <View {...panResponder.panHandlers} style={styles.dragArea}>
          <View style={styles.dragger} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="What are we doing?"
              placeholderTextColor={Colors.textSecondary}
              onFocus={() => snapSheet(SNAP_FULL)}
            />
          </View>
          <TouchableOpacity
            style={styles.createFAB}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/create' as any);
            }}
          >
            <Ionicons name="add" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Category Pills */}
        <FlatList
          data={ActivityCategories as any}
          keyExtractor={item => item.id}
          renderItem={renderCategoryPill}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContainer}
          style={styles.pillsList}
        />

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Activities</Text>
          <Text style={styles.sectionCount}>{filteredActivities.length} spots</Text>
        </View>

        {/* Activity List */}
        <FlatList
          data={filteredActivities}
          keyExtractor={item => item.id}
          renderItem={renderActivity}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌅</Text>
              <Text style={styles.emptyTitle}>All quiet nearby</Text>
              <Text style={styles.emptySubtitle}>Be the spark — start something!</Text>
            </View>
          }
          onRefresh={fetchActivities}
          refreshing={loading}
        />
      </Animated.View>

      {/* Current location button */}
      <TouchableOpacity
        style={[styles.locationButton, { bottom: insets.bottom + 100 }]}
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <Ionicons name="locate" size={20} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E8ED',
  },

  // Map
  mapFallback: {
    backgroundColor: '#E8EDF0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapFallbackText: {
    fontSize: 48,
  },
  mapPin: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 8,
    ...Shadows.medium,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  mapPinEmoji: {
    fontSize: 18,
  },

  // Floating header
  headerFloat: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    zIndex: 100,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  headerBlur: {
    borderRadius: Radius.xxl,
    overflow: 'hidden',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  headerGreeting: {
    ...Typography.headline,
    color: Colors.text,
  },
  headerSub: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  avatarButton: {},
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },

  // Bottom sheet
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    ...Shadows.sheet,
  },
  dragArea: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  dragger: {
    width: 40,
    height: 4,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: Radius.pill,
  },

  // Search row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  createFAB: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },

  // Category pills
  pillsList: {
    flexGrow: 0,
  },
  pillsContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: Colors.text,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryLabel: {
    ...Typography.footnote,
    fontWeight: '600',
    color: Colors.text,
  },
  categoryLabelActive: {
    color: Colors.white,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.title3,
    color: Colors.text,
  },
  sectionCount: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  // Activity cards
  listContent: {
    paddingHorizontal: Spacing.xl,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: 10,
    ...Shadows.small,
    borderWidth: 1,
    borderColor: Colors.separatorLight,
    gap: 12,
  },
  cardLeft: {},
  cardEmoji: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEmojiHype: {
    backgroundColor: 'rgba(255,107,44,0.12)',
  },
  cardEmojiText: {
    fontSize: 22,
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    ...Typography.headline,
    color: Colors.text,
    flex: 1,
  },
  hypeTag: {
    backgroundColor: 'rgba(255,107,44,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  hypeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
  },
  cardMeta: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.background,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: Radius.pill,
  },
  progressLabel: {
    ...Typography.caption2,
    color: Colors.textSecondary,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'right',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.huge,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.title3,
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...Typography.subhead,
    color: Colors.textSecondary,
  },

  // Location button
  locationButton: {
    position: 'absolute',
    right: Spacing.xl,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
});