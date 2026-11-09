import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../constants/theme';
import { isSupabaseConfigured } from '../../lib/supabase';
import { fetchStats, getCurrentUser, signOut, type CurrentUser } from '../../lib/store';

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [stats, setStats] = useState({ activities: 0, joined: 0, crews: 0, amigos: 0 });

    useEffect(() => {
        load();
    }, []);

    async function load() {
        const u = await getCurrentUser();
        setUser(u);
        setStats(await fetchStats());
    }

    async function handleSignOut() {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await signOut();
                    router.replace('/auth');
                },
            },
        ]);
    }

    const displayName = user?.username || 'You';
    const initial = displayName[0]?.toUpperCase() || '?';

    const settingsItems = [
        { icon: 'notifications-outline' as const, label: 'Notifications', onPress: () => { } },
        { icon: 'location-outline' as const, label: 'Location Sharing', onPress: () => { } },
        { icon: 'shield-checkmark-outline' as const, label: 'Privacy', onPress: () => { } },
        { icon: 'help-circle-outline' as const, label: 'Help & Feedback', onPress: () => { } },
    ];

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity style={styles.settingsBtn}>
                    <Ionicons name="settings-outline" size={22} color={Colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>

                {/* Avatar + Name */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarInitial}>{initial}</Text>
                        <View style={styles.onlineDot} />
                    </View>
                    <Text style={styles.displayName}>{displayName}</Text>
                    <Text style={styles.emailText}>{user?.email || (isSupabaseConfigured ? 'Signed in' : 'Local mode — no account yet')}</Text>
                    {!isSupabaseConfigured && (
                        <View style={styles.localBadge}>
                            <Text style={styles.localBadgeText}>📱 Local demo mode</Text>
                        </View>
                    )}
                </View>

                {/* Stats strip — real counts from the store */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.activities}</Text>
                        <Text style={styles.statLabel}>Created</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.joined}</Text>
                        <Text style={styles.statLabel}>Joined</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.crews}</Text>
                        <Text style={styles.statLabel}>Crews</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.amigos}</Text>
                        <Text style={styles.statLabel}>Amigos</Text>
                    </View>
                </View>

                {/* Supabase setup card (local mode only) */}
                {!isSupabaseConfigured && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Go live</Text>
                        <View style={styles.setupCard}>
                            <Text style={styles.setupTitle}>Connect Supabase to sync with your squad</Text>
                            <Text style={styles.setupBody}>
                                1. Create a project at supabase.com{'\n'}
                                2. Run the SQL in supabase/migrations/ (or `supabase db push`){'\n'}
                                3. Copy `.env.example` to `.env` and fill in your URL + anon key{'\n'}
                                4. Restart the app — your demo plans stay on this device
                            </Text>
                        </View>
                    </View>
                )}

                {/* Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Settings</Text>
                    <View style={styles.settingsList}>
                        {settingsItems.map((item, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={[
                                    styles.settingsRow,
                                    idx < settingsItems.length - 1 && styles.settingsRowBorder,
                                ]}
                                onPress={item.onPress}
                                activeOpacity={0.7}
                            >
                                <View style={styles.settingsIcon}>
                                    <Ionicons name={item.icon} size={18} color={Colors.textSecondary} />
                                </View>
                                <Text style={styles.settingsLabel}>{item.label}</Text>
                                <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Sign out (Supabase mode only — there is no account in local mode) */}
                {isSupabaseConfigured && (
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={styles.signOutBtn}
                            onPress={handleSignOut}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
                            <Text style={styles.signOutText}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Version */}
                <Text style={styles.version}>Vámonos v1.0 · Made with ❤️ for the spontaneous</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.lg,
        backgroundColor: Colors.backgroundElevated,
        borderBottomWidth: 1,
        borderBottomColor: Colors.separatorLight,
    },
    headerTitle: {
        ...Typography.title2,
        color: Colors.text,
    },
    settingsBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Profile hero
    profileSection: {
        backgroundColor: Colors.backgroundElevated,
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
        paddingBottom: Spacing.xxl,
        borderBottomWidth: 1,
        borderBottomColor: Colors.separatorLight,
    },
    avatarCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        ...Shadows.medium,
    },
    avatarInitial: {
        fontSize: 36,
        fontWeight: '700',
        color: Colors.white,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: Colors.success,
        borderWidth: 2,
        borderColor: Colors.backgroundElevated,
    },
    displayName: {
        ...Typography.title1,
        color: Colors.text,
        marginBottom: 4,
    },
    emailText: {
        ...Typography.subhead,
        color: Colors.textSecondary,
    },
    localBadge: {
        marginTop: Spacing.md,
        backgroundColor: 'rgba(255,149,0,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: Radius.pill,
    },
    localBadgeText: {
        ...Typography.caption1,
        color: '#8a5a00',
        fontWeight: '700',
    },

    // Stats
    statsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundElevated,
        marginHorizontal: Spacing.xl,
        marginTop: Spacing.xl,
        borderRadius: Radius.xxl,
        padding: Spacing.xxl,
        ...Shadows.small,
        borderWidth: 1,
        borderColor: Colors.separatorLight,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        ...Typography.title1,
        color: Colors.text,
    },
    statLabel: {
        ...Typography.caption1,
        color: Colors.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 36,
        backgroundColor: Colors.backgroundTertiary,
    },

    // Setup card
    section: {
        marginHorizontal: Spacing.xl,
        marginTop: Spacing.xl,
    },
    sectionLabel: {
        ...Typography.footnote,
        color: Colors.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing.sm,
        paddingLeft: 4,
    },
    setupCard: {
        backgroundColor: Colors.backgroundElevated,
        borderRadius: Radius.xl,
        padding: Spacing.xl,
        ...Shadows.small,
        borderWidth: 1,
        borderColor: Colors.separatorLight,
        gap: 8,
    },
    setupTitle: {
        ...Typography.headline,
        color: Colors.text,
    },
    setupBody: {
        ...Typography.subhead,
        color: Colors.textSecondary,
        lineHeight: 22,
    },

    // Settings section
    settingsList: {
        backgroundColor: Colors.backgroundElevated,
        borderRadius: Radius.xl,
        overflow: 'hidden',
        ...Shadows.small,
        borderWidth: 1,
        borderColor: Colors.separatorLight,
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md + 2,
        gap: Spacing.md,
    },
    settingsRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.separatorLight,
    },
    settingsIcon: {
        width: 32,
        height: 32,
        borderRadius: Radius.sm,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsLabel: {
        flex: 1,
        ...Typography.callout,
        color: Colors.text,
        fontWeight: '500',
    },

    // Sign out
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.backgroundElevated,
        borderRadius: Radius.xl,
        paddingVertical: Spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,59,48,0.2)',
        ...Shadows.small,
    },
    signOutText: {
        ...Typography.callout,
        color: Colors.danger,
        fontWeight: '700',
    },

    version: {
        ...Typography.caption1,
        color: Colors.textTertiary,
        textAlign: 'center',
        marginTop: Spacing.xl,
        paddingHorizontal: Spacing.xxl,
    },
});
