import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityCategories, Colors, Radius, Shadows, Spacing, Typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

const TIME_PRESETS = [
    { label: 'Now!', offset: 0 },
    { label: '30 min', offset: 30 },
    { label: '1 hr', offset: 60 },
    { label: '2 hrs', offset: 120 },
    { label: 'Tonight', offset: 480 },
];

export default function CreateScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [title, setTitle] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState(0);
    const [threshold, setThreshold] = useState(4);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);

    const activeCategory = ActivityCategories.find(c => c.id === selectedCategory);

    useEffect(() => {
        getUserLocation();
    }, []);

    async function getUserLocation() {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
        } catch (_) {
            // fallback to null if location fails
        }
    }

    async function handleCreate() {
        if (!title.trim()) return;
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            setIsSubmitting(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                // For demo, just navigate back
                router.replace('/(tabs)');
                return;
            }

            const { data: crewData } = await supabase
                .from('crew_members')
                .select('crew_id')
                .eq('user_id', user.id)
                .limit(1)
                .single();

            const scheduledAt = new Date(Date.now() + selectedTime * 60000).toISOString();

            await supabase.from('activities').insert({
                title: title.trim(),
                creator_id: user.id,
                crew_id: crewData?.crew_id,
                scheduled_at: scheduledAt,
                threshold,
                category: selectedCategory,
                latitude: userLocation?.latitude,
                longitude: userLocation?.longitude,
            });

            router.replace('/(tabs)');
        } catch (_) {
            router.replace('/(tabs)');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => router.replace('/(tabs)')}
                >
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Activity</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>

                {/* Title */}
                <Text style={styles.label}>What are we doing?</Text>
                <View style={styles.titleInputWrapper}>
                    <Text style={styles.titleEmoji}>{activeCategory?.emoji || '✨'}</Text>
                    <TextInput
                        style={styles.titleInput}
                        placeholder="Beach volleyball, food run..."
                        placeholderTextColor={Colors.textTertiary}
                        value={title}
                        onChangeText={setTitle}
                        autoFocus
                        returnKeyType="next"
                        maxLength={60}
                    />
                </View>

                {/* Category */}
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryGrid}>
                    {ActivityCategories.filter(c => c.id !== 'all').map(cat => {
                        const active = selectedCategory === cat.id;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[styles.catChip, active && styles.catChipActive]}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedCategory(active ? null : cat.id);
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.catChipEmoji}>{cat.emoji}</Text>
                                <Text style={[styles.catChipLabel, active && styles.catChipLabelActive]}>{cat.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Time */}
                <Text style={styles.label}>When?</Text>
                <View style={styles.timeRow}>
                    {TIME_PRESETS.map((t) => {
                        const active = selectedTime === t.offset;
                        return (
                            <TouchableOpacity
                                key={t.offset}
                                style={[styles.timeChip, active && styles.timeChipActive]}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedTime(t.offset);
                                }}
                            >
                                <Text style={[styles.timeChipLabel, active && styles.timeChipLabelActive]}>{t.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Threshold */}
                <Text style={styles.label}>Minimum squad size</Text>
                <View style={styles.thresholdRow}>
                    <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setThreshold(t => Math.max(2, t - 1));
                        }}
                    >
                        <Ionicons name="remove" size={22} color={Colors.text} />
                    </TouchableOpacity>
                    <View style={styles.thresholdDisplay}>
                        <Text style={styles.thresholdValue}>{threshold}</Text>
                        <Text style={styles.thresholdUnit}>people</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setThreshold(t => Math.min(20, t + 1));
                        }}
                    >
                        <Ionicons name="add" size={22} color={Colors.text} />
                    </TouchableOpacity>
                </View>

                {/* CTA */}
                <TouchableOpacity
                    style={[styles.vamanosBtn, (!title.trim() || isSubmitting) && styles.vamanosBtnDisabled]}
                    onPress={handleCreate}
                    disabled={!title.trim() || isSubmitting}
                    activeOpacity={0.85}
                >
                    <Text style={styles.vamonosBtnText}>
                        {isSubmitting ? '🏃 Going...' : '🚀 Vámonos!'}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.footerNote}>
                    Your crew gets notified and confirms before it's locked in.
                </Text>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.backgroundElevated,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.separatorLight,
    },
    cancelBtn: { width: 60 },
    cancelText: {
        ...Typography.callout,
        color: Colors.primary,
        fontWeight: '500',
    },
    headerTitle: {
        ...Typography.headline,
        color: Colors.text,
    },

    scrollContent: {
        padding: Spacing.xxl,
        gap: Spacing.sm,
    },
    label: {
        ...Typography.subhead,
        color: Colors.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: Spacing.xl,
        marginBottom: Spacing.sm,
    },

    // Title input
    titleInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: Radius.xl,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
        height: 60,
    },
    titleEmoji: { fontSize: 24 },
    titleInput: {
        flex: 1,
        ...Typography.headline,
        color: Colors.text,
    },

    // Category grid
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    catChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.background,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: Radius.pill,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    catChipActive: {
        backgroundColor: Colors.text,
        borderColor: Colors.text,
    },
    catChipEmoji: { fontSize: 14 },
    catChipLabel: {
        ...Typography.footnote,
        fontWeight: '600',
        color: Colors.text,
    },
    catChipLabelActive: { color: Colors.white },

    // Time picker
    timeRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    timeChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: Radius.pill,
        backgroundColor: Colors.background,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    timeChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    timeChipLabel: {
        ...Typography.subhead,
        fontWeight: '600',
        color: Colors.text,
    },
    timeChipLabelActive: { color: Colors.white },

    // Threshold stepper
    thresholdRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xxl,
    },
    stepBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.small,
    },
    thresholdDisplay: {
        alignItems: 'center',
        minWidth: 60,
    },
    thresholdValue: {
        ...Typography.largeTitle,
        color: Colors.text,
        lineHeight: 40,
    },
    thresholdUnit: {
        ...Typography.caption1,
        color: Colors.textSecondary,
        fontWeight: '600',
    },

    // CTA
    vamanosBtn: {
        backgroundColor: Colors.text,
        borderRadius: Radius.pill,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.xxxl,
        ...Shadows.medium,
    },
    vamanosBtnDisabled: {
        backgroundColor: Colors.backgroundTertiary,
        shadowOpacity: 0,
    },
    vamonosBtnText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    footerNote: {
        ...Typography.footnote,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.md,
    },
});
