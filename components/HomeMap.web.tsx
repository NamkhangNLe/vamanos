import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { StyleSheet, View } from 'react-native';
import { offsetFor } from '../lib/geo';

interface HomeMapProps {
    activities: any[];
    userLocation?: { latitude: number, longitude: number } | null;
    onPinPress: (activityId: string) => void;
    onMapPress: () => void;
}

// Convert emoji strings to Leaflet DivIcons
const createEmojiIcon = (emoji: string) => {
    return new L.DivIcon({
        className: 'custom-leaflet-icon',
        html: `
      <div style="
        background: white;
        border-radius: 20px;
        padding: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: 2px solid white;
        text-align: center;
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      ">
        ${emoji || '📍'}
      </div>
    `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
    });
};

const createUserDotIcon = () => {
    return new L.DivIcon({
        className: 'custom-leaflet-icon user-dot-icon',
        html: `
      <div style="
        background: #007AFF;
        border-radius: 12px;
        border: 3px solid white;
        box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.3);
        width: 18px;
        height: 18px;
        margin-left: -9px;
        margin-top: -9px;
      ">
      </div>
    `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
    });
};

// Leaflet sizes itself once at mount. If the container is still settling
// (fonts loading, layout shifts, the bottom sheet animating in), the map
// can end up grey or with tiles/markers placed for the wrong viewport —
// the classic blank-Leaflet-map failure. Re-measure shortly after mount
// and on every window resize so the tiles always land where they belong.
function MapResizer() {
    const map = useMap();
    useEffect(() => {
        const t1 = setTimeout(() => map.invalidateSize(), 100);
        const t2 = setTimeout(() => map.invalidateSize(), 600);
        const onResize = () => map.invalidateSize();
        window.addEventListener('resize', onResize);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            window.removeEventListener('resize', onResize);
        };
    }, [map]);
    return null;
}

// Web version - Uses react-leaflet and OpenStreetMap tiles (FREE, NO API KEY needed)
export default function HomeMap({ activities, userLocation, onPinPress, onMapPress }: HomeMapProps) {
    const initialLat = userLocation?.latitude || 34.0522;
    const initialLng = userLocation?.longitude || -118.2437;

    return (
        <View style={StyleSheet.absoluteFill}>
            {/* Scoped to this map: 100% of the parent, never 100vh (the detail
                hero is only 320px tall and 100vh would overflow it). */}
            <style>{`
        .leaflet-container { height: 100%; width: 100%; z-index: 1; }
        .custom-leaflet-icon { background: none; border: none; }
      `}</style>

            <MapContainer
                key={`${initialLat}-${initialLng}`}
                center={[initialLat, initialLng]}
                zoom={13}
                zoomControl={false}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <MapResizer />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {activities.map((activity, idx) => {
                    // Deterministic fallback position (stable per activity id),
                    // so pins never jump around between renders.
                    const { dLat, dLng } = offsetFor(activity.id || `idx-${idx}`, 0.005);
                    const lat = activity.latitude ?? initialLat + dLat;
                    const lng = activity.longitude ?? initialLng + dLng;
                    return (
                        <Marker
                            key={activity.id || idx}
                            position={[lat, lng]}
                            icon={createEmojiIcon(activity.emoji)}
                            eventHandlers={{
                                click: () => onPinPress(activity.id),
                            }}
                        >
                        </Marker>
                    );
                })}


                {userLocation && (
                    <Marker
                        position={[userLocation.latitude, userLocation.longitude]}
                        icon={createUserDotIcon()}
                    />
                )}
            </MapContainer>
        </View>
    );
}
