import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../constants/theme';
import { isSupabaseConfigured } from '../../lib/supabase';
import { addCrewMember, createCrew, fetchCrews, joinCrewByInvite, type Crew } from '../../lib/store';

const AVATAR_COLORS = ['#0D7A5F', '#6C2BD9', '#B7791F', '#2FA37F', '#D92D20', '#075C46'];

function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function AmigosScreen() {
  const insets = useSafeAreaInsets();
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCrewName, setNewCrewName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addName, setAddName] = useState('');
  const [copiedCrewId, setCopiedCrewId] = useState<string | null>(null);

  useEffect(() => {
    loadCrews();
    handleInviteLink();
  }, []);

  /** Opening a shared invite link joins that crew (local mode). */
  async function handleInviteLink() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get('invite');
    if (!inviteId) return;
    const crewName = params.get('crew') ?? 'A crew';
    try {
      const crew = await joinCrewByInvite(inviteId, crewName);
      if (crew) {
        await loadCrews();
        setExpandedId(crew.id);
        Alert.alert('Welcome to the crew!', `You joined ${crew.name}.`);
      } else if (isSupabaseConfigured) {
        Alert.alert('Invite needs an account', 'Crew invites work in local demo mode. In live mode your friend needs a Supabase account first — invite links for accounts are still to be built.');
      }
    } catch (_) {
      // A bad link is not a crash; the crews list is still there.
    }
  }

  function inviteLinkFor(crew: Crew): string {
    const base =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname.split('?')[0]}`
        : 'https://namkhangnle.github.io/vamanos/amigos';
    return `${base}?invite=${encodeURIComponent(crew.id)}&crew=${encodeURIComponent(crew.name)}`;
  }

  async function handleCopyInvite(crew: Crew) {
    const link = inviteLinkFor(crew);
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        setCopiedCrewId(crew.id);
      } else {
        await Share.share({ message: `Join my ${crew.name} crew on Vámonos: ${link}` });
      }
    } catch (_) {
      Alert.alert('Invite link', link);
    }
  }

  async function handleAddMember(crew: Crew) {
    if (!addName.trim()) return;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const updated = await addCrewMember(crew.id, addName.trim());
      if (!updated) {
        Alert.alert(
          'Could not add them yet',
          isSupabaseConfigured
            ? 'Adding a friend by name works in local demo mode. In live mode they need a Supabase account first — invite links for accounts are still to be built.'
            : 'That crew could not be found. Try again.',
        );
        return;
      }
      setAddName('');
      await loadCrews();
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to add member');
    }
  }

  async function loadCrews() {
    try {
      setCrews(await fetchCrews());
    } catch (_) {
      // keep whatever we have
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCrew() {
    if (!newCrewName.trim() || loading) return;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      setLoading(true);
      const crew = await createCrew(newCrewName.trim());
      if (!crew) throw new Error('Crew was not created');
      setNewCrewName('');
      await loadCrews();
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to create crew');
    } finally {
      setLoading(false);
    }
  }

  const renderCrew = ({ item }: { item: Crew }) => {
    const members = item.members || [];
    const expanded = expandedId === item.id;
    return (
      <View style={styles.crewCard}>
        <TouchableOpacity
          style={styles.crewRow}
          activeOpacity={0.85}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setExpandedId(expanded ? null : item.id);
          }}
        >
          <View style={styles.crewLeft}>
            <View style={styles.crewIconBg}>
              <Text style={styles.crewIcon}>👥</Text>
            </View>
          </View>
          <View style={styles.crewInfo}>
            <View style={styles.crewTitleRow}>
              <Text style={styles.crewName}>{item.name}</Text>
              <View style={styles.memberBadge}>
                <Text style={styles.memberBadgeText}>{members.length}</Text>
              </View>
            </View>
            {/* Avatar stack */}
            <View style={styles.avatarStack}>
              {members.slice(0, 5).map((m, idx) => {
                const name = m.username || '?';
                return (
                  <View
                    key={m.user_id}
                    style={[
                      styles.stackAvatar,
                      { backgroundColor: getColor(name), marginLeft: idx === 0 ? 0 : -8, zIndex: 10 - idx }
                    ]}
                  >
                    <Text style={styles.stackAvatarText}>{name[0].toUpperCase()}</Text>
                  </View>
                );
              })}
              {members.length > 5 && (
                <View style={[styles.stackAvatar, { backgroundColor: Colors.backgroundTertiary, marginLeft: -8 }]}>
                  <Text style={[styles.stackAvatarText, { color: Colors.textSecondary }]}>+{members.length - 5}</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={16}
            color={Colors.textTertiary}
          />
        </TouchableOpacity>

        {expanded && (
          <View style={styles.memberList}>
            {members.map((m) => (
              <View key={m.user_id} style={styles.memberRow}>
                <View style={[styles.memberAvatar, { backgroundColor: getColor(m.username || '?') }]}>
                  <Text style={styles.memberAvatarText}>{(m.username || '?')[0].toUpperCase()}</Text>
                </View>
                <Text style={styles.memberName}>{m.username || 'Someone'}</Text>
              </View>
            ))}

            {/* Add an amigo by name — they actually join the crew */}
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="Add an amigo by name..."
                placeholderTextColor={Colors.textSecondary}
                value={addName}
                onChangeText={setAddName}
                returnKeyType="done"
                onSubmitEditing={() => handleAddMember(item)}
              />
              <TouchableOpacity
                style={[styles.addBtn, !addName.trim() && styles.addBtnDisabled]}
                onPress={() => handleAddMember(item)}
                disabled={!addName.trim()}
              >
                <Ionicons name="add" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>

            {/* Shareable invite link — opening it joins the crew */}
            <TouchableOpacity style={styles.inviteBtn} onPress={() => handleCopyInvite(item)} activeOpacity={0.8}>
              <Ionicons name="link-outline" size={18} color={Colors.primary} />
              <Text style={styles.inviteBtnText}>
                {copiedCrewId === item.id ? 'Invite link copied!' : 'Copy invite link'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.inviteHint}>Anyone who opens the link joins this crew.</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Amigos</Text>
        <Text style={styles.headerSub}>Your crews — tap one to see who's in it, add amigos, or share an invite link</Text>
      </View>

      <FlatList
        data={crews}
        keyExtractor={item => item.id}
        renderItem={renderCrew}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        onRefresh={loadCrews}
        refreshing={loading}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>👯</Text>
            <Text style={styles.emptyTitle}>No crews yet</Text>
            <Text style={styles.emptySub}>Create one below to get started!</Text>
          </View>
        }
      />

      {/* Create crew floating bar */}
      <View style={[styles.createBar, { paddingBottom: insets.bottom + 16 }]}>
        <TextInput
          style={styles.createInput}
          placeholder="New crew name..."
          placeholderTextColor={Colors.textSecondary}
          value={newCrewName}
          onChangeText={setNewCrewName}
          returnKeyType="done"
          onSubmitEditing={handleCreateCrew}
        />
        <TouchableOpacity
          style={[styles.createBtn, !newCrewName.trim() && styles.createBtnDisabled]}
          onPress={handleCreateCrew}
          disabled={!newCrewName.trim() || loading}
        >
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    backgroundColor: Colors.backgroundElevated,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separatorLight,
  },
  headerTitle: {
    ...Typography.largeTitle,
    color: Colors.text,
  },
  headerSub: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // List
  listContent: {
    padding: Spacing.xl,
    gap: 10,
  },

  // Crew card
  crewCard: {
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: 10,
    ...Shadows.small,
    borderWidth: 1,
    borderColor: Colors.separatorLight,
  },
  crewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  crewLeft: {},
  crewIconBg: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(13, 122, 95, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crewIcon: { fontSize: 24 },
  crewInfo: {
    flex: 1,
    gap: 6,
  },
  crewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crewName: {
    ...Typography.headline,
    color: Colors.text,
  },
  memberBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  memberBadgeText: {
    ...Typography.caption2,
    color: Colors.textSecondary,
    fontWeight: '700',
  },

  // Avatar stack
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stackAvatarText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },

  // Expanded member list
  memberList: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.separatorLight,
    gap: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  memberName: {
    ...Typography.callout,
    color: Colors.text,
    fontWeight: '500',
  },

  // Add-member + invite
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  addInput: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.background,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    ...Typography.callout,
    color: Colors.text,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: Colors.backgroundTertiary,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.background,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    marginTop: 4,
  },
  inviteBtnText: {
    ...Typography.footnote,
    color: Colors.primary,
    fontWeight: '700',
  },
  inviteHint: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.title3, color: Colors.text, marginBottom: 4 },
  emptySub: { ...Typography.subhead, color: Colors.textSecondary },

  // Create bar
  createBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.backgroundElevated,
    borderTopWidth: 1,
    borderTopColor: Colors.separatorLight,
    ...Shadows.sheet,
  },
  createInput: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.background,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    ...Typography.callout,
    color: Colors.text,
  },
  createBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  createBtnDisabled: {
    backgroundColor: Colors.backgroundTertiary,
    shadowOpacity: 0,
  },
});
