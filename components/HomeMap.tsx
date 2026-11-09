import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Shadows } from '../constants/theme';
import { offsetFor } from '../lib/geo';

interface HomeMapProps {
    activities: any[];
    userLocation?: { latitude: number, longitude: number } | null;
    onPinPress: (activityId: string) => void;
    onMapPress: () => void;
}

// Native iOS/Android version — react-native-maps is lazy-required so Metro
// doesn't statically analyze it. The .web.tsx platform extension ensures
// this file is never loaded on web builds anyway.
export default function HomeMap({ activities, userLocation, onPinPress, onMapPress }: HomeMapProps) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RNMaps = require('react-native-maps');
    const MapView = RNMaps.default;
    const Marker = RNMaps.Marker;
    const PROVIDER_DEFAULT = RNMaps.PROVIDER_DEFAULT;

    const initialLat = userLocation?.latitude || 34.0522;
    const initialLng = userLocation?.longitude || -118.2437;

    return (
        <MapView
            key={`${initialLat}-${initialLng}`}
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFill}
            initialRegion={{
                latitude: initialLat,
                longitude: initialLng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }}
            userInterfaceStyle="light"
            showsUserLocation={true}
            showsCompass={false}
            showsMyLocationButton={false}
            onPress={onMapPress}
        >
            {activities.map((activity: any, idx: number) => {
                // Deterministic fallback position (stable per activity id),
                // so pins never jump around between renders.
                const { dLat, dLng } = offsetFor(activity.id || `idx-${idx}`, 0.005);
                const lat = activity.latitude ?? initialLat + dLat;
                const lng = activity.longitude ?? initialLng + dLng;
                return (
                    <Marker
                        key={activity.id || idx}
                        coordinate={{
                            latitude: lat,
                            longitude: lng,
                        }}
                        onPress={() => onPinPress(activity.id)}
                    >
                        <View style={styles.mapPin}>
                            <Text style={styles.mapPinEmoji}>{activity.emoji || '📍'}</Text>
                        </View>
                    </Marker>
                );
            })}
        </MapView>
    );
}

const styles = StyleSheet.create({
    mapPin: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 8,
        ...Shadows.medium,
        borderWidth: 2,
        borderColor: Colors.white,
    },
    mapPinEmoji: {
        fontSize: 18,
    },
});
