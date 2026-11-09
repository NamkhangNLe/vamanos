import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { StyleSheet, View } from 'react-native';
import { activityCentroid, metersPerPixel, offsetFor, spreadPositions } from '../lib/geo';

interface HomeMapProps {
    activities: any[];
    userLocation?: { latitude: number, longitude: number } | null;
    onPinPress: (activityId: string) => void;
    onMapPress: () => void;
    /** Top edge of the bottom sheet as a fraction of screen height (0.80 = collapsed). */
    sheetTopFraction?: number;
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
        background: #0D7A5F;
        border-radius: 12px;
        border: 3px solid white;
        box-shadow: 0 0 0 2px rgba(13, 122, 95, 0.3);
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
// the classic blank-Leaflet-map failure. Re-measure once layout has
// actually settled (double rAF, not a guessed timer) and whenever the
// container resizes, so the tiles always land where they belong.
function MapResizer() {
    const map = useMap();
    useEffect(() => {
        let raf1 = 0;
        let raf2 = 0;
        const settle = () => {
            raf1 = requestAnimationFrame(() => {
                raf2 = requestAnimationFrame(() => map.invalidateSize());
            });
        };
        settle();
        const ro = new ResizeObserver(() => map.invalidateSize());
        ro.observe(map.getContainer());
        window.addEventListener('resize', settle);
        return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
            ro.disconnect();
            window.removeEventListener('resize', settle);
        };
    }, [map]);
    return null;
}

// Tapping empty map collapses the bottom sheet (native does this via
// MapView onPress; on web the MapContainer never wired the prop).
function MapClickHandler({ onMapPress }: { onMapPress: () => void }) {
    useMapEvents({ click: () => onMapPress() });
    return null;
}

// The map must NOT remount when the data arrives: the old
// `key={initialLat-initialLng}` remount recreated the whole Leaflet map
// the moment activities loaded, and the fit timers raced the fresh
// mount. The container mounts once; this nudges the view only if the
// computed center actually moves (e.g. geolocation arriving later).
function MapCenter({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    const prev = useRef<[number, number] | null>(null);
    useEffect(() => {
        if (prev.current && prev.current[0] === lat && prev.current[1] === lng) return;
        if (prev.current) map.setView([lat, lng], map.getZoom());
        prev.current = [lat, lng];
    }, [map, lat, lng]);
    return null;
}

// Markers are 38px. Two venues can be close enough that at the fitted zoom
// they land < 38px apart on screen (Pizzeria Delfina and Alamo Drafthouse
// are ~0.35 mi apart; at the phone fit they are ~24px apart), so one pin
// hides completely behind the other. The spread below guarantees 46px
// (38px marker + 8px gap) between every pair at the zoom the map actually
// fits to — and the fit is computed against the SPREAD bounds, so the
// markers and the view can never disagree about where the pins are.
//
// Why the spread has to be zoom-aware: Leaflet's getBoundsZoom FLOORS the
// zoom to the snap level (phone fit 12.64 -> 12, not 13). A fixed degree
// offset that separates pins at zoom 14 still overlaps them at zoom 12.
// So the separation is derived from the real fitted zoom, in metres, and
// iterated until the zoom is stable (spreading widens the bounds, which
// can drop the zoom one step, which needs a wider spread).
//
// One child owns both the fit and the markers (they were computed in two
// places on racing timers before, so the view and the pins disagreed).
// The bottom padding is derived live from the sheet's top edge
// (sheetTopFraction) and the top padding clears the header — the markers
// land in the visible band only, never behind the sheet.
const MARKER_PX = 46;

function MapContent({ activities, positions, userLocation, onPinPress, sheetTopFraction }: {
    activities: any[];
    positions: [number, number][];
    userLocation?: { latitude: number; longitude: number } | null;
    onPinPress: (activityId: string) => void;
    sheetTopFraction: number;
}) {
    const map = useMap();
    // Positions actually rendered. Start raw; the fit effect below spreads
    // them (and fits the view to the spread bounds) once layout settles.
    const [spread, setSpread] = useState<[number, number][]>(positions);
    const key = positions.map((p) => p.join(',')).join('|');

    const fitAndSpread = useCallback(() => {
        if (positions.length === 0) return;
        map.invalidateSize();
        const size = map.getSize();
        if (size.x < 50 || size.y < 50) return; // container not laid out yet
        const paddingTL = L.point(48, 110);
        const paddingBR = L.point(48, Math.round(size.y * (1 - sheetTopFraction)) + 24);
        const paddingSum = paddingTL.add(paddingBR);
        // Iterate spread -> refit until the zoom stops moving. In practice
        // this converges on the first pass: the spread adds ~2% to the
        // bounds width, which is dominated by the far-apart pins.
        let cur = positions;
        let zoom = map.getBoundsZoom(L.latLngBounds(cur), false, paddingSum);
        for (let i = 0; i < 3; i++) {
            const lat0 = L.latLngBounds(cur).getCenter().lat;
            const minMeters = MARKER_PX * metersPerPixel(zoom, lat0);
            const next = spreadPositions(cur, minMeters);
            const z2 = map.getBoundsZoom(L.latLngBounds(next), false, paddingSum);
            cur = next;
            if (z2 === zoom) break;
            zoom = z2;
        }
        map.fitBounds(L.latLngBounds(cur), {
            paddingTopLeft: paddingTL,
            paddingBottomRight: paddingBR,
            maxZoom: 14,
        });
        setSpread(cur);
    }, [map, key, sheetTopFraction]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (positions.length === 0) return;
        let raf1 = 0;
        let raf2 = 0;
        raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(fitAndSpread);
        });
        // Late re-fit: catches layout that settles after the first paint
        // (fonts, the tab bar, the sheet animating in).
        const late = setTimeout(fitAndSpread, 1500);
        const ro = new ResizeObserver(() => fitAndSpread());
        ro.observe(map.getContainer());
        return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
            clearTimeout(late);
            ro.disconnect();
        };
    }, [map, fitAndSpread]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {activities.map((activity, idx) => {
                const pos = spread[idx] ?? positions[idx];
                if (!pos) return null;
                return (
                    <Marker
                        key={activity.id || idx}
                        position={[pos[0], pos[1]]}
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
        </>
    );
}

// Web version - Uses react-leaflet and OpenStreetMap tiles (FREE, NO API KEY needed)
export default function HomeMap({ activities, userLocation, onPinPress, onMapPress, sheetTopFraction = 0.8 }: HomeMapProps) {
    // Default center: the user's location when known, else the centroid of
    // the activities that carry real coordinates, else downtown SF. The
    // centroid is computed from the data, not hardcoded to any
    // neighborhood, so it stays right as activities change.
    const centroid = activityCentroid(activities);
    const initialLat = userLocation?.latitude ?? centroid?.latitude ?? 37.7749;
    const initialLng = userLocation?.longitude ?? centroid?.longitude ?? -122.4194;

    // Marker positions, same logic as the render below (explicit coords when
    // present, else a deterministic offset from the center), so the fitter
    // covers exactly the pins on screen.
    const markerPositions: [number, number][] = activities.map((activity, idx) => {
        const { dLat, dLng } = offsetFor(activity.id || `idx-${idx}`, 0.005);
        return [
            activity.latitude ?? initialLat + dLat,
            activity.longitude ?? initialLng + dLng,
        ];
    });

    return (
        <View style={StyleSheet.absoluteFill}>
            {/* Scoped to this map: 100% of the parent, never 100vh (the detail
                hero is only 320px tall and 100vh would overflow it). */}
            <style>{`
        .leaflet-container { height: 100%; width: 100%; z-index: 1; }
        .custom-leaflet-icon { background: none; border: none; }
      `}</style>

            <MapContainer
                center={[initialLat, initialLng]}
                zoom={13}
                zoomSnap={0.5}
                zoomControl={false}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <MapResizer />
                <MapCenter lat={initialLat} lng={initialLng} />
                <MapClickHandler onMapPress={onMapPress} />
                <MapContent
                    activities={activities}
                    positions={markerPositions}
                    userLocation={userLocation}
                    onPinPress={onPinPress}
                    sheetTopFraction={sheetTopFraction}
                />
            </MapContainer>
        </View>
    );
}
