import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActivityMap from '../../components/ActivityMap';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../constants/theme';
import { formatDistance } from '../../lib/geo';
import {
    fetchActivity,
    fetchParticipants,
    setRSVP,
    subscribeToActivityChanges,
    type Activity,
    type Participant,
    type RSVPStatus,
} from '../../lib/store';

const AVATAR_COLORS = ['#0D7A5F', '#6C2BD9', '#B7791F', '#2FA37F', '#D92D20', '#075C46'];
function getColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function formatCountdown(date: string, now: number) {
    const diff = new Date(date).getTime() - now;
    if (diff <= 0) return 'Now';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return `In ${Math.floor(h / 24)}d`;
    if (h > 0) return `In ${h}h ${m}m`;
    return `In ${m}m`;
}

export default function ActivityDetail() {
    const { activityId } = useLocalSearchParams<{ activityId: string }>();
    const [activity, setActivity] = useState<Activity | null>(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [now, setNow] = useState(Date.now());
    const router = useRouter();
    const insets = useSafeAreaInsets();

    async function load() {
        if (!activityId) return;
        try {
            const [a, parts] = await Promise.all([
                fetchActivity(activityId),
                fetchParticipants(activityId),
            ]);
            if (a) setActivity(a);
            setParticipants(parts);
        } catch (error) {
            console.error('Error fetching activity:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        getUserLocation();
        // Live: someone RSVPs and this screen updates without a refresh.
        const unsubscribe = subscribeToActivityChanges(() => load());
        const tick = setInterval(() => setNow(Date.now()), 30000);
        return () => {
            unsubscribe();
            clearInterval(tick);
        };
    }, [activityId]);

    async function getUserLocation() {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
        } catch (_) { }
    }

    async function handleRSVP(status: RSVPStatus) {
        if (!activity) return;
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            await setRSVP(activity.id, status);
            await load();
            if (status === 'committed') {
                Alert.alert(
                    "🔥 You're in!",
                    `${activity.title} — ${formatTime(activity.scheduled_at)}. You're committed and counted toward the ${threshold} needed to lock it in. See you there!`,
                );
            }
        } catch (_) {
            Alert.alert('Error', 'Failed to update RSVP');
        }
    }

    async function handleShare() {
        if (!activity) return;
        try {
            await Share.share({
                message: `${activity.emoji} ${activity.title} — ${formatTime(activity.scheduled_at)}. ${activity.committed}/${activity.threshold} down. Vámonos?`,
            });
        } catch (_) { }
    }

    const confirmedCount = participants.filter(p => p.status === 'committed').length;
    const threshold = activity?.threshold || 1;
    const progress = Math.min(confirmedCount / threshold, 1);
    const isHype = confirmedCount >= threshold;
    const myStatus = activity?.myStatus ?? null;
    const distance = formatDistance(
        userLocation,
        activity?.latitude != null && activity?.longitude != null
            ? { latitude: activity.latitude, longitude: activity.longitude }
            : null,
    );

    if (loading || !activity) {
        return (
            <View style={[styles.centered, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Map hero */}
            <View style={styles.mapHero}>
                <ActivityMap activity={activity} participants={participants} userLocation={userLocation} />

                {/* Back button overlay */}
                <TouchableOpacity
                    style={[styles.backBtn, { top: insets.top + 12 }]}
                    onPress={() => router.back()}
                >
                    <BlurView intensity={70} tint="systemChromeMaterialLight" style={styles.backBtnBlur}>
                        <Ionicons name="chevron-back" size={20} color={Colors.text} />
                    </BlurView>
                </TouchableOpacity>

                {/* Share button */}
                <TouchableOpacity
                    style={[styles.shareBtn, { top: insets.top + 12 }]}
                    onPress={handleShare}
                >
                    <BlurView intensity={70} tint="systemChromeMaterialLight" style={styles.backBtnBlur}>
                        <Ionicons name="share-outline" size={18} color={Colors.text} />
                    </BlurView>
                </TouchableOpacity>
            </View>

            {/* Detail sheet */}
            <View style={styles.detailSheet}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>

                    {/* Title row */}
                    <View style={styles.titleSection}>
                        <View style={styles.emojiPill}>
                            <Text style={styles.titleEmoji}>{activity.emoji || '✨'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.activityTitle}>{activity.title}</Text>
                            <Text style={styles.crewText}>{activity.crew_name ?? 'Open'} · by {activity.creator_name ?? 'Someone'}</Text>
                        </View>
                        {isHype && (
                            <View style={styles.hypeFlag}>
                                <Text style={styles.hypeFlagText}>🔥 ON</Text>
                            </View>
                        )}
                    </View>

                    {/* Stats strip */}
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statNum}>{confirmedCount}</Text>
                            <Text style={styles.statCaption}>Down</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statCard}>
                            <Text style={styles.statNum}>{threshold}</Text>
                            <Text style={styles.statCaption}>Needed</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statCard}>
                            <Text style={styles.statNum}>{formatCountdown(activity.scheduled_at, now)}</Text>
                            <Text style={styles.statCaption}>Starts</Text>
                        </View>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressSection}>
                        <View style={styles.progressRow}>
                            <Text style={styles.progressLabel}>
                                {isHype ? "🎉 It's happening!" : `${threshold - confirmedCount} more to confirm`}
                            </Text>
                            <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
                        </View>
                        <View style={styles.progressBg}>
                            <View style={[styles.progressFill, isHype && styles.progressFillHype, { width: `${progress * 100}%` }]} />
                        </View>
                    </View>

                    {/* Time info */}
                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                        </View>
                        <Text style={styles.infoText}>{formatTime(activity.scheduled_at)}</Text>
                    </View>

                    {/* Location info */}
                    {(activity.location_name || distance) && (
                        <View style={styles.infoRow}>
                            <View style={[styles.infoIcon, { backgroundColor: 'rgba(108, 43, 217, 0.10)' }]}>
                                <Ionicons name="location-outline" size={18} color={Colors.accent} />
                            </View>
                            <Text style={styles.infoText}>
                                {activity.location_name ?? 'Somewhere nearby'}
                                {distance ? ` · ${distance}` : ''}
                            </Text>
                        </View>
                    )}

                    {/* Plan note */}
                    {activity.description && (
                        <View style={styles.infoRow}>
                            <View style={[styles.infoIcon, { backgroundColor: 'rgba(108, 43, 217, 0.10)' }]}>
                                <Ionicons name="chatbubble-outline" size={18} color="#6C2BD9" />
                            </View>
                            <Text style={styles.infoText}>{activity.description}</Text>
                        </View>
                    )}

                    {/* RSVP buttons */}
                    <View style={styles.rsvpRow}>
                        <TouchableOpacity
                            style={[styles.rsvpBtn, styles.rsvpPrimary, myStatus === 'committed' && styles.rsvpActive]}
                            onPress={() => handleRSVP('committed')}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.rsvpPrimaryText}>
                                {myStatus === 'committed' ? "✓ I'm In!" : "I'm Down! 🚀"}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.rsvpBtn, styles.rsvpSecondary, myStatus === 'interested' && styles.rsvpSecondaryActive]}
                            onPress={() => handleRSVP('interested')}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.rsvpSecondaryText, myStatus === 'interested' && { color: Colors.text }]}>
                                Maybe 👀
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {myStatus && myStatus !== 'declined' && (
                        <TouchableOpacity style={styles.declineBtn} onPress={() => handleRSVP('declined')}>
                            <Text style={styles.declineText}>Can't make it</Text>
                        </TouchableOpacity>
                    )}
                    {myStatus === 'declined' && (
                        <Text style={styles.declinedNote}>You're out for this one — tap "I'm Down" to jump back in.</Text>
                    )}

                    {/* Participants — real people only, no padded fakes */}
                    <Text style={styles.sectionTitle}>Who's in</Text>
                    {participants.length === 0 ? (
                        <Text style={styles.noParticipants}>Nobody yet. Be the first to say you're down.</Text>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -Spacing.xxl }} contentContainerStyle={{ paddingHorizontal: Spacing.xxl, gap: 12 }}>
                            {participants.map((p) => {
                                const name = p.username || 'User';
                                const committed = p.status === 'committed';
                                return (
                                    <View key={p.id} style={styles.participantChip}>
                                        <View style={[styles.participantAvatar, { backgroundColor: getColor(name) }]}>
                                            <Text style={styles.participantInitial}>{name[0]?.toUpperCase()}</Text>
                                            <View style={[styles.statusDot, { backgroundColor: committed ? Colors.success : p.status === 'declined' ? Colors.textTertiary : Colors.warning }]} />
                                        </View>
                                        <Text style={styles.participantName}>{name.split(' ')[0]}</Text>
                                        <Text style={styles.participantStatus}>{committed ? '✓ In' : p.status === 'declined' ? '✕ Out' : '~ Maybe'}</Text>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },

    // Map hero
    mapHero: {
        height: 320,
        backgroundColor: Colors.background,
    },
    backBtn: {
        position: 'absolute',
        left: Spacing.xl,
        width: 38,
        height: 38,
        borderRadius: 19,
        overflow: 'hidden',
        ...Shadows.medium,
    },
    shareBtn: {
        position: 'absolute',
        right: Spacing.xl,
        width: 38,
        height: 38,
        borderRadius: 19,
        overflow: 'hidden',
        ...Shadows.medium,
    },
    backBtnBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Detail sheet
    detailSheet: {
        flex: 1,
        backgroundColor: Colors.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: -28,
        paddingHorizontal: Spacing.xxl,
        paddingTop: Spacing.xxl,
        ...Shadows.sheet,
    },

    // Title
    titleSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    emojiPill: {
        width: 52,
        height: 52,
        borderRadius: Radius.md,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleEmoji: { fontSize: 26 },
    activityTitle: {
        ...Typography.title2,
        color: Colors.text,
        lineHeight: 28,
    },
    crewText: {
        ...Typography.footnote,
        color: Colors.textSecondary,
        marginTop: 2,
        fontWeight: '500',
    },
    hypeFlag: {
        backgroundColor: Colors.accent,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: Radius.pill,
    },
    hypeFlagText: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '800',
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        backgroundColor: Colors.background,
        borderRadius: Radius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
        alignItems: 'center',
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
    },
    statNum: {
        ...Typography.title3,
        color: Colors.text,
        textAlign: 'center',
        fontSize: 16,
    },
    statCaption: {
        ...Typography.caption2,
        color: Colors.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: Colors.backgroundTertiary,
    },

    // Progress
    progressSection: {
        marginBottom: Spacing.xl,
        gap: 8,
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    progressLabel: {
        ...Typography.footnote,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    progressPct: {
        ...Typography.footnote,
        color: Colors.success,
        fontWeight: '700',
    },
    progressBg: {
        height: 8,
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

    // Info row
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.background,
        padding: Spacing.md,
        borderRadius: Radius.lg,
        marginBottom: Spacing.md,
    },
    infoIcon: {
        width: 34,
        height: 34,
        borderRadius: Radius.sm,
        backgroundColor: 'rgba(13, 122, 95, 0.10)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoText: {
        ...Typography.callout,
        color: Colors.text,
        fontWeight: '500',
        flex: 1,
    },

    // RSVP buttons
    rsvpRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: Spacing.md,
        marginBottom: Spacing.md,
    },
    rsvpBtn: {
        flex: 1,
        height: 56,
        borderRadius: Radius.pill,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.medium,
    },
    rsvpPrimary: {
        flex: 2,
        backgroundColor: Colors.text,
    },
    rsvpActive: {
        backgroundColor: Colors.success,
    },
    rsvpPrimaryText: {
        color: Colors.white,
        fontWeight: '800',
        fontSize: 17,
    },
    rsvpSecondary: {
        backgroundColor: Colors.backgroundElevated,
        borderWidth: 1.5,
        borderColor: Colors.backgroundTertiary,
        shadowOpacity: 0,
    },
    rsvpSecondaryActive: {
        borderColor: Colors.text,
    },
    rsvpSecondaryText: {
        color: Colors.textSecondary,
        fontWeight: '700',
        fontSize: 16,
    },
    declineBtn: {
        alignItems: 'center',
        paddingVertical: 8,
        marginBottom: Spacing.xl,
    },
    declineText: {
        ...Typography.footnote,
        color: Colors.textSecondary,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    declinedNote: {
        ...Typography.footnote,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },

    // Participants
    sectionTitle: {
        ...Typography.title3,
        color: Colors.text,
        marginBottom: Spacing.lg,
    },
    noParticipants: {
        ...Typography.subhead,
        color: Colors.textSecondary,
        marginBottom: Spacing.lg,
    },
    participantChip: {
        alignItems: 'center',
        gap: 4,
    },
    participantAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.small,
    },
    participantInitial: {
        color: Colors.white,
        fontWeight: '700',
        fontSize: 20,
    },
    statusDot: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: Colors.white,
    },
    participantName: {
        ...Typography.caption1,
        color: Colors.text,
        fontWeight: '600',
    },
    participantStatus: {
        ...Typography.caption2,
        color: Colors.textSecondary,
    },
});
