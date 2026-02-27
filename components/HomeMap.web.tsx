import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/theme';

interface HomeMapProps {
    activities: any[];
    onPinPress: (activityId: string) => void;
    onMapPress: () => void;
}

// Web version — displays a graceful fallback since react-native-maps
// requires a Google Maps API key on the web.
export default function HomeMap({ activities, onPinPress, onMapPress }: HomeMapProps) {
    return (
        <View style={styles.fallback}>
            <Text style={styles.fallbackEmoji}>🗺️</Text>
            <Text style={styles.fallbackText}>Santa Monica, CA</Text>
            {activities.map((a, idx) => (
                <View key={idx} style={[styles.pin, { top: 100 + idx * 60, left: 80 + idx * 100 }]}>
                    <Text style={styles.pinEmoji}>{a.emoji || '📍'}</Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    fallback: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#C8D8E4',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fallbackEmoji: { fontSize: 64, marginBottom: 8 },
    fallbackText: {
        color: Colors.textSecondary,
        fontWeight: '600',
        fontSize: 15,
    },
    pin: {
        position: 'absolute',
    },
    pinEmoji: { fontSize: 28 },
});
