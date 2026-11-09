import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Colors, Shadows } from '../constants/theme';
import { activityCentroid, offsetFor, spreadPositions } from '../lib/geo';

// Region the map opens on. Kept in sync with the spread below.
const LATITUDE_DELTA = 0.05;
const LONGITUDE_DELTA = 0.05;

interface HomeMapProps {
    activities: any[];
    userLocation?: { latitude: number, longitude: number } | null;
    onPinPress: (activityId: string) => void;
    onMapPress: () => void;
    /** Web-only: top edge of the bottom sheet; ignored on native. */
    sheetTopFraction?: number;
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

    // Default center: the user's location when known, else the centroid of
    // the activities that carry real coordinates, else downtown SF.
    const centroid = activityCentroid(activities);
    const initialLat = userLocation?.latitude ?? centroid?.latitude ?? 37.7749;
    const initialLng = userLocation?.longitude ?? centroid?.longitude ?? -122.4194;

    // Marker positions (explicit coords when present, else a deterministic
    // offset from the center), spread apart so no two pins stack: two venues
    // a few hundred metres apart render on top of each other at this zoom
    // (see the web map — same helper, same 46px rule, derived here from the
    // region deltas and the screen size). A no-op for well-separated pins.
    const markerPositions = useMemo(() => {
        const raw: [number, number][] = activities.map((activity: any, idx: number) => {
            const { dLat, dLng } = offsetFor(activity.id || `idx-${idx}`, 0.005);
            return [
                activity.latitude ?? initialLat + dLat,
                activity.longitude ?? initialLng + dLng,
            ];
        });
        if (raw.length < 2) return raw;
        const { width, height } = Dimensions.get('window');
        const latMpp = (LATITUDE_DELTA * 111320) / Math.max(height, 1);
        const lngMpp = (LONGITUDE_DELTA * 111320 * Math.cos((initialLat * Math.PI) / 180)) / Math.max(width, 1);
        const mpp = Math.max(latMpp, lngMpp);
        return spreadPositions(raw, 46 * mpp);
    }, [activities, initialLat, initialLng]);

    return (
        <MapView
            key={`${initialLat}-${initialLng}`}
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFill}
            initialRegion={{
                latitude: initialLat,
                longitude: initialLng,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA,
            }}
            userInterfaceStyle="light"
            showsUserLocation={true}
            showsCompass={false}
            showsMyLocationButton={false}
            onPress={onMapPress}
        >
            {activities.map((activity: any, idx: number) => {
                const pos = markerPositions[idx];
                if (!pos) return null;
                return (
                    <Marker
                        key={activity.id || idx}
                        coordinate={{
                            latitude: pos[0],
                            longitude: pos[1],
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
