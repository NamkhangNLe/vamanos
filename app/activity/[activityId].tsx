import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { supabase } from '../../lib/supabase';

export default function ActivityDetail() {
    const { activityId } = useLocalSearchParams();
    const [activity, setActivity] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        fetchActivityDetails();
    }, [activityId]);

    async function fetchActivityDetails() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('activities')
                .select(`
          *,
          creator:profiles!creator_id(username, avatar_url),
          crew:crews(name)
        `)
                .eq('id', activityId)
                .single();

            if (error) throw error;
            setActivity(data);

            const { data: partData } = await supabase
                .from('activity_participants')
                .select('*, profiles(username, avatar_url)')
                .eq('activity_id', activityId);

            setParticipants(partData || []);
        } catch (error) {
            console.error('Error fetching activity details:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleRSVP(status: 'committed' | 'interested' | 'declined') {
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Auth Required', 'Please log in to RSVP');
                return;
            }

            const { error } = await supabase
                .from('activity_participants')
                .upsert({
                    activity_id: activityId,
                    user_id: user.id,
                    status: status,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            fetchActivityDetails();
            Alert.alert('Vámonos!', `You're ${status === 'committed' ? 'IN' : 'interested'}!`);
        } catch (error) {
            Alert.alert('Error', 'Failed to update RSVP');
        }
    }

    const confirmedCount = participants.filter(p => p.status === 'committed').length;
    const isConfirmed = confirmedCount >= (activity?.threshold || 1);

    if (loading || !activity) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#ffd33d" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isConfirmed ? '🔥 IT\'S ON!' : 'Activity Details'}</Text>
                <Ionicons name="share-outline" size={24} color="#fff" />
            </View>

            <View style={styles.mapContainer}>
                <MapView
                    provider={PROVIDER_DEFAULT}
                    style={styles.map}
                    initialRegion={{
                        latitude: activity.latitude || 34.0522,
                        longitude: activity.longitude || -118.2437,
                        latitudeDelta: 0.1,
                        longitudeDelta: 0.1,
                    }}
                    userInterfaceStyle="dark"
                >
                    <Marker
                        coordinate={{
                            latitude: activity.latitude || 34.0522,
                            longitude: activity.longitude || -118.2437,
                        }}
                        pinColor="#ffd33d"
                        title={activity.title}
                    />
                    {participants.map((p, idx) => (
                        <Marker
                            key={idx}
                            coordinate={{
                                latitude: (activity.latitude || 34.0522) + (Math.random() - 0.5) * 0.05,
                                longitude: (activity.longitude || -118.2437) + (Math.random() - 0.5) * 0.05,
                            }}
                            title={p.profiles?.username}
                        >
                            <View style={styles.friendMarker}>
                                <Text style={styles.markerText}>{p.profiles?.username?.[0]}</Text>
                            </View>
                        </Marker>
                    ))}
                </MapView>
            </View>

            <ScrollView style={styles.detailsSection}>
                <View style={styles.titleRow}>
                    <Text style={styles.title}>{activity.title}</Text>
                    {isConfirmed && <Text style={styles.confirmedBadge}>CONFIRMED</Text>}
                </View>
                <Text style={styles.subtitle}>{activity.crew?.name} Crew</Text>

                <View style={styles.statsCard}>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{confirmedCount}</Text>
                        <Text style={styles.statLabel}>Down</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{activity.threshold || 1}</Text>
                        <Text style={styles.statLabel}>Target</Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={20} color="#ffd33d" />
                    <Text style={styles.infoText}>
                        {new Date(activity.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </Text>
                </View>

                <View style={styles.rsvpSection}>
                    <TouchableOpacity
                        style={[styles.rsvpButton, styles.confirmButton]}
                        onPress={() => handleRSVP('committed')}
                    >
                        <Text style={styles.confirmText}>I'm Down!</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.rsvpButton, styles.maybeButton]}
                        onPress={() => handleRSVP('interested')}
                    >
                        <Text style={styles.maybeText}>Maybe</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Participants</Text>
                {participants.map((p, idx) => (
                    <View key={idx} style={styles.participantRow}>
                        <View style={[styles.avatar, { backgroundColor: p.status === 'committed' ? '#ffd33d' : '#444' }]}>
                            <Text style={[styles.avatarText, { color: p.status === 'committed' ? '#000' : '#fff' }]}>
                                {p.profiles?.username?.[0] || '?'}
                            </Text>
                        </View>
                        <Text style={styles.participantName}>{p.profiles?.username || 'User'}</Text>
                        <Text style={styles.participantStatus}>{p.status}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    centered: {
        flex: 1,
        backgroundColor: '#121212',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#1e1e1e',
        zIndex: 10,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    mapContainer: {
        height: 350,
        width: '100%',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    detailsSection: {
        padding: 20,
        backgroundColor: '#121212',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#fff',
    },
    confirmedBadge: {
        backgroundColor: '#ffd33d',
        color: '#000',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 18,
        color: '#ffd33d',
        marginBottom: 24,
        fontWeight: '600',
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: '#1e1e1e',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        alignItems: 'center',
    },
    stat: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#333',
    },
    statValue: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#666',
        fontSize: 12,
        textTransform: 'uppercase',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 32,
    },
    infoText: {
        color: '#fff',
        fontSize: 16,
    },
    rsvpSection: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 40,
    },
    rsvpButton: {
        flex: 1,
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButton: {
        backgroundColor: '#ffd33d',
    },
    maybeButton: {
        backgroundColor: '#2a2a2a',
    },
    confirmText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 18,
    },
    maybeText: {
        color: '#fff',
        fontSize: 18,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    participantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: '#1e1e1e',
        padding: 12,
        borderRadius: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontWeight: 'bold',
        fontSize: 18,
    },
    participantName: {
        color: '#fff',
        fontSize: 16,
        flex: 1,
    },
    participantStatus: {
        color: '#666',
        fontSize: 12,
    },
    friendMarker: {
        backgroundColor: '#ffd33d',
        padding: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#000',
    },
    markerText: {
        color: '#000',
        fontWeight: 'bold',
    },
});
