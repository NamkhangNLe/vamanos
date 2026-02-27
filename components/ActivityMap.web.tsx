import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/theme';

interface ActivityMapProps {
    activity: any;
    participants: any[];
}

// Web version - displays graceful fallback
export default function ActivityMap({ activity, participants }: ActivityMapProps) {
    if (!activity) return null;

    return (
        <View style={[styles.mapContainer, styles.fallback]}>
            <Text style={styles.fallbackEmoji}>{activity.emoji || '📍'}</Text>
            <Text style={styles.fallbackTitle}>{activity.title}</Text>
            <Text style={styles.fallbackSub}>
                {activity.latitude?.toFixed(4)}, {activity.longitude?.toFixed(4)}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    mapContainer: {
        height: '100%',
        width: '100%',
        backgroundColor: '#E4EBF0',
    },
    fallback: {
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    fallbackEmoji: { fontSize: 48 },
    fallbackTitle: {
        color: Colors.text,
        fontWeight: '700',
        fontSize: 16,
    },
    fallbackSub: {
        color: Colors.textSecondary,
        fontSize: 13,
    },
});
