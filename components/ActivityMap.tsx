import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Shadows } from '../constants/theme';

interface ActivityMapProps {
    activity: any;
    participants: any[];
}

const FRIEND_COLORS = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30', '#5AC8FA'];
function getFriendColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return FRIEND_COLORS[Math.abs(hash) % FRIEND_COLORS.length];
}

// Native iOS/Android version - uses react-native-maps
// The .web.tsx platform extension ensures this file is NEVER loaded on web
export default function ActivityMap({ activity, participants }: ActivityMapProps) {
    if (!activity) return null;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RNMaps = require('react-native-maps');
    const MapView = RNMaps.default;
    const Marker = RNMaps.Marker;
    const PROVIDER_DEFAULT = RNMaps.PROVIDER_DEFAULT;

    return (
        <View style={styles.mapContainer}>
            <MapView
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                initialRegion={{
                    latitude: activity.latitude || 34.0522,
                    longitude: activity.longitude || -118.2437,
                    latitudeDelta: 0.08,
                    longitudeDelta: 0.08,
                }}
                userInterfaceStyle="light"
                showsCompass={false}
                showsMyLocationButton={false}
            >
                {/* Destination pin */}
                <Marker
                    coordinate={{
                        latitude: activity.latitude || 34.0522,
                        longitude: activity.longitude || -118.2437,
                    }}
                >
                    <View style={styles.destPin}>
                        <Text style={styles.destPinEmoji}>{activity.emoji || '📍'}</Text>
                    </View>
                </Marker>

                {/* Participant pins */}
                {participants
                    .filter(p => p.status === 'committed')
                    .slice(0, 8)
                    .map((p, idx) => {
                        const name = p.profiles?.username || '?';
                        return (
                            <Marker
                                key={idx}
                                coordinate={{
                                    latitude: (activity.latitude || 34.0522) + (Math.random() - 0.5) * 0.04,
                                    longitude: (activity.longitude || -118.2437) + (Math.random() - 0.5) * 0.04,
                                }}
                                title={name}
                            >
                                <View style={[styles.friendPing, { backgroundColor: getFriendColor(name) }]}>
                                    <Text style={styles.friendPingText}>{name[0].toUpperCase()}</Text>
                                </View>
                            </Marker>
                        );
                    })}
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    mapContainer: {
        height: '100%' as any,
        width: '100%',
        backgroundColor: '#E4EBF0',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    destPin: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: Colors.text,
        ...Shadows.large,
    },
    destPinEmoji: { fontSize: 24 },
    friendPing: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.white,
        ...Shadows.medium,
    },
    friendPingText: {
        color: Colors.white,
        fontWeight: '700',
        fontSize: 14,
    },
});
