import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
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
import { createActivity, emojiForCategory } from '../../lib/store';
import LocationPicker, { type PickedLocation } from '../../components/LocationPicker';

const TIME_PRESETS = [
    { label: 'Now!', offset: 0 },
    { label: '30 min', offset: 30 },
    { label: '1 hr', offset: 60 },
    { label: '2 hrs', offset: 120 },
    { label: 'Tonight', offset: 480 },
];

function tomorrowDateStr(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD + HH:MM (24h) into an ISO string, or null when invalid. */
function parseDateTime(dateStr: string, timeStr: string): string | null {
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    const tm = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
    if (!dm || !tm) return null;
    const d = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]), 0, 0);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
}

export default function CreateScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState(0);
    const [timeMode, setTimeMode] = useState<'preset' | 'custom'>('preset');
    const [customDate, setCustomDate] = useState(tomorrowDateStr());
    const [customTime, setCustomTime] = useState('18:00');
    const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
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
        if (!title.trim() || isSubmitting) return;
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // The pin has to be where the plan is: tap-to-place on the map, or
        // your current location. No more deterministic ±500 m hash offset.
        const loc = pickedLocation ?? userLocation;
        if (!loc) {
            Alert.alert('Where is it?', 'Tap the map below to drop the pin where the plan actually is, or allow location access.');
            return;
        }

        let scheduledAt: string;
        if (timeMode === 'custom') {
            const parsed = parseDateTime(customDate, customTime);
            if (!parsed) {
                Alert.alert('When is it?', 'Use a real date (YYYY-MM-DD) and time (HH:MM, 24-hour).');
                return;
            }
            scheduledAt = parsed;
        } else {
            scheduledAt = new Date(Date.now() + selectedTime * 60000).toISOString();
        }

        try {
            setIsSubmitting(true);

            const activity = await createActivity({
                title: title.trim(),
                description: description.trim() || null,
                category: selectedCategory,
                scheduled_at: scheduledAt,
                threshold,
                latitude: loc.latitude,
                longitude: loc.longitude,
                location_name: pickedLocation ? 'Pinned on map' : null,
            });

            if (!activity) throw new Error('Activity was not created');
            router.replace(`/(tabs)` as any);
        } catch (error: any) {
            // Fail loudly: the old version silently navigated away and the
            // plan never existed. The user should know it didn't save.
            Alert.alert('Could not create activity', error?.message ?? 'Something went wrong. Try again.');
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
                    <Text style={styles.titleEmoji}>{selectedCategory ? emojiForCategory(selectedCategory) : '✨'}</Text>
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

                {/* Description */}
                <Text style={styles.label}>What&apos;s the plan?</Text>
                <TextInput
                    style={styles.descInput}
                    placeholder="Details your crew needs — what to bring, where to meet, the vibe..."
                    placeholderTextColor={Colors.textTertiary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    maxLength={280}
                />

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
                        const active = timeMode === 'preset' && selectedTime === t.offset;
                        return (
                            <TouchableOpacity
                                key={t.offset}
                                style={[styles.timeChip, active && styles.timeChipActive]}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setTimeMode('preset');
                                    setSelectedTime(t.offset);
                                }}
                            >
                                <Text style={[styles.timeChipLabel, active && styles.timeChipLabelActive]}>{t.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Pick a date & time — presets only cover today */}
                <Text style={styles.subLabel}>Or pick a date &amp; time</Text>
                <View style={styles.dateTimeRow}>
                    <TextInput
                        style={[styles.dateTimeInput, timeMode === 'custom' && styles.dateTimeInputActive]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={Colors.textTertiary}
                        value={customDate}
                        onChangeText={(v) => { setCustomDate(v); setTimeMode('custom'); }}
                        maxLength={10}
                    />
                    <TextInput
                        style={[styles.dateTimeInput, timeMode === 'custom' && styles.dateTimeInputActive]}
                        placeholder="HH:MM"
                        placeholderTextColor={Colors.textTertiary}
                        value={customTime}
                        onChangeText={(v) => { setCustomTime(v); setTimeMode('custom'); }}
                        maxLength={5}
                    />
                </View>

                {/* Where? Tap the map to place the pin. */}
                <Text style={styles.label}>Where?</Text>
                <LocationPicker initial={userLocation} value={pickedLocation} onPick={setPickedLocation} />

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
                    Plans save on this device in demo mode. Share the plan from its page once it&apos;s created.
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

    // Description input
    descInput: {
        backgroundColor: Colors.background,
        borderRadius: Radius.xl,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        ...Typography.callout,
        color: Colors.text,
        minHeight: 84,
        textAlignVertical: 'top',
    },

    // Date/time picker
    subLabel: {
        ...Typography.caption1,
        color: Colors.textSecondary,
        fontWeight: '600',
        marginTop: Spacing.md,
        marginBottom: 6,
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    dateTimeInput: {
        flex: 1,
        backgroundColor: Colors.background,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        height: 48,
        ...Typography.callout,
        color: Colors.text,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    dateTimeInputActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.backgroundElevated,
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
