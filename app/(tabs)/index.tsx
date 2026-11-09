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
import { isSupabaseConfigured } from '../../lib/supabase';
import { fetchActivities, subscribeToActivityChanges, type Activity } from '../../lib/store';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Bottom sheet snap points. Default is COLLAPSED: the map is the hero on
// load and the sheet is a peek, not a 45% curtain over the pins.
const SNAP_FULL = 0.12;      // full open (12% from top)
const SNAP_HALF = 0.55;      // half open (55% from top)
const SNAP_COLLAPSED = 0.80; // peek (80% from top)

function formatCountdown(date: string, now: number) {
  const diff = new Date(date).getTime() - now;
  if (diff <= 0) return 'Now!';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `In ${h}h ${m}m`;
  return `In ${m}m`;
}

export default function Index() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [sheetSnap, setSheetSnap] = useState(SNAP_COLLAPSED);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Bottom sheet animation — starts collapsed so the map reads first.
  const sheetY = useRef(new Animated.Value(SCREEN_HEIGHT * SNAP_COLLAPSED)).current;
  const currentSnap = useRef(SNAP_COLLAPSED);

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
        setSheetSnap(snapConst);
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
    setSheetSnap(snap);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(sheetY, {
      toValue: SCREEN_HEIGHT * snap,
      useNativeDriver: false,
      damping: 25,
      stiffness: 200,
    }).start();
  }

  async function loadActivities() {
    try {
      const data = await fetchActivities();
      setActivities(data);
    } catch (_) {
      // keep whatever we have; the empty state covers it
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivities();
    getUserLocation();
    // Live updates: when anyone RSVPs, the list refreshes.
    const unsubscribe = subscribeToActivityChanges(() => loadActivities());
    // Countdowns tick every 30s so "In 29m" stays honest.
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      unsubscribe();
      clearInterval(tick);
    };
  }, []);

  async function getUserLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (_) {
      console.warn('Could not fetch location');
    }
  }

  const filteredActivities = activities.filter((a) => {
    if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const hay = `${a.title} ${a.crew_name ?? ''} ${a.creator_name ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const liveCount = activities.filter((a) => a.committed >= a.threshold).length;

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

  const renderActivity = ({ item }: { item: Activity }) => {
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
            {item.crew_name || 'Open'} · {formatCountdown(item.scheduled_at, now)}
            {item.myStatus === 'committed' ? ' · You\'re in' : ''}
          </Text>
          {/* RSVP progress bar — counts come from real participants */}
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, hype && styles.progressFillHype, { width: `${progress * 100}%` }]} />
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
        sheetTopFraction={sheetSnap}
      />

      {/* ── FLOATING HEADER ── */}
      <View style={[styles.headerFloat, { top: insets.top + 12 }]} pointerEvents="box-none">
        <BlurView intensity={85} tint="systemChromeMaterialLight" style={styles.headerBlur}>
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.headerGreeting}>Hey there 👋</Text>
              <Text style={styles.headerSub}>
                {liveCount > 0
                  ? `${liveCount} ${liveCount === 1 ? 'plan is' : 'plans are'} locked in — what's the vibe?`
                  : "What's the vibe today?"}
              </Text>
            </View>
            <TouchableOpacity style={styles.avatarButton} onPress={() => router.push('/(tabs)/profile')}>
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

        {/* Demo-mode banner: honest about where the data lives */}
        {!isSupabaseConfigured && (
          <TouchableOpacity
            style={styles.demoBanner}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.demoBannerText}>👀 Demo data — connect Supabase in Profile to go live with your squad</Text>
          </TouchableOpacity>
        )}

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="What are we doing?"
              placeholderTextColor={Colors.textSecondary}
              value={query}
              onChangeText={setQuery}
              onFocus={() => snapSheet(SNAP_FULL)}
              returnKeyType="search"
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
          onRefresh={loadActivities}
          refreshing={loading}
        />
      </Animated.View>

      {/* Current location button — only when the sheet is collapsed, so it
          never floats over the list. Sits just above the sheet's top edge. */}
      {sheetSnap === SNAP_COLLAPSED && (
        <TouchableOpacity
          style={[styles.locationButton, { bottom: SCREEN_HEIGHT * (1 - SNAP_COLLAPSED) + 16 }]}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            getUserLocation();
          }}
        >
          <Ionicons name="locate" size={20} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DDEBE2',
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

  // Demo banner
  demoBanner: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    backgroundColor: 'rgba(255,149,0,0.1)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  demoBannerText: {
    ...Typography.caption1,
    color: '#8a5a00',
    fontWeight: '600',
    textAlign: 'center',
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
    backgroundColor: 'rgba(108, 43, 217, 0.12)',
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
    backgroundColor: 'rgba(108, 43, 217, 0.12)',
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
  progressFillHype: {
    backgroundColor: Colors.accent,
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
