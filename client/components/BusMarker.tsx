'use client';

import { useEffect, useState, useRef } from 'react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';

type BusMarkerProps = {
    bus: any;
    onClick: () => void;
};

// Easing function for smooth animation
const easeLinear = (t: number) => t;

export default function BusMarker({ bus, onClick }: BusMarkerProps) {
    // Current visual position (state for rendering)
    const [renderPos, setRenderPos] = useState<[number, number] | null>(null);
    const [rotation, setRotation] = useState(0);

    // Refs to track state without closure staleness
    const visualPosRef = useRef<[number, number] | null>(null);
    const targetPosRef = useRef<[number, number] | null>(null);
    const startPosRef = useRef<[number, number] | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const requestRef = useRef<number | null>(null);
    const prevStatusRef = useRef<string>(bus.current_status || 'stopped');

    // Initialize position on first load
    useEffect(() => {
        if (bus.location && !visualPosRef.current) {
            const pos: [number, number] = [Number(bus.location.latitude), Number(bus.location.longitude)];
            visualPosRef.current = pos;
            targetPosRef.current = pos;
            setRenderPos(pos);
        }
    }, [bus]); // Only runs if bus object reference changes or on mount

    // Handle Location Updates
    useEffect(() => {
        if (!bus.location) {
            console.log(`[BusMarker] ${bus.id} - No location data`);
            return;
        }

        const newTarget: [number, number] = [Number(bus.location.latitude), Number(bus.location.longitude)];
        console.log(`[BusMarker] ${bus.id} - Update:`, newTarget, 'Current Visual:', visualPosRef.current);

        if (isNaN(newTarget[0]) || isNaN(newTarget[1])) return;

        // If we don't have a visual position yet, set it immediately
        if (!visualPosRef.current) {
            console.log(`[BusMarker] ${bus.id} - Initializing visual position`, newTarget);
            visualPosRef.current = newTarget;
            targetPosRef.current = newTarget;
            setRenderPos(newTarget);
            return;
        }

        // Check for Status Change Snap (Stopped -> Moving) implies a new trip leg or GPS recovery
        const currentStatus = bus.current_status || 'stopped';
        const statusChangedToMoving = prevStatusRef.current !== 'moving' && currentStatus === 'moving';
        prevStatusRef.current = currentStatus;

        // Snap if distance is too large (> 100 meters roughly? 0.001 deg) OR status just changed to moving
        const dist = Math.sqrt(
            Math.pow(newTarget[0] - visualPosRef.current[0], 2) +
            Math.pow(newTarget[1] - visualPosRef.current[1], 2)
        );

        if (dist > 0.001 || statusChangedToMoving) {
            if (requestRef.current) cancelAnimationFrame(requestRef.current); // STOP any running animation
            visualPosRef.current = newTarget;
            targetPosRef.current = newTarget;
            setRenderPos(newTarget);
            startPosRef.current = newTarget;
            return;
        }

        // If location hasn't changed effectively, do nothing
        if (targetPosRef.current &&
            targetPosRef.current[0] === newTarget[0] &&
            targetPosRef.current[1] === newTarget[1]) {
            return;
        }

        // START ANIMATION
        // Start from wherever we are visually right now
        startPosRef.current = visualPosRef.current;
        targetPosRef.current = newTarget;
        startTimeRef.current = performance.now();

        // Calculate bearing immediately based on the path we are about to take
        const bearing = calculateBearing(
            startPosRef.current[0], startPosRef.current[1],
            newTarget[0], newTarget[1]
        );
        setRotation(bearing);

        // Cancel existing loop if any
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = requestAnimationFrame(animate);

    }, [bus.location]); // Trigger when server sends new location

    const animate = (time: number) => {
        if (!startTimeRef.current || !startPosRef.current || !targetPosRef.current) return;

        const duration = 2000; // Duration of interpolation
        const timeElapsed = time - startTimeRef.current;
        const progress = Math.min(timeElapsed / duration, 1);
        const ease = easeLinear(progress);

        const lat = startPosRef.current[0] + (targetPosRef.current[0] - startPosRef.current[0]) * ease;
        const lng = startPosRef.current[1] + (targetPosRef.current[1] - startPosRef.current[1]) * ease;

        const newPos: [number, number] = [lat, lng];

        // Update Ref and State
        visualPosRef.current = newPos;
        setRenderPos(newPos);

        if (progress < 1) {
            requestRef.current = requestAnimationFrame(animate);
        } else {
            // Snap to exact target at end to prevent floating point drift
            visualPosRef.current = targetPosRef.current;
            setRenderPos(targetPosRef.current);
        }
    };

    // Utils
    const calculateBearing = (startLat: number, startLng: number, destLat: number, destLng: number) => {
        const startLatRad = toRadians(startLat);
        const startLngRad = toRadians(startLng);
        const destLatRad = toRadians(destLat);
        const destLngRad = toRadians(destLng);

        const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
        const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
            Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);

        let brng = Math.atan2(y, x);
        brng = toDegrees(brng);
        return (brng + 360) % 360;
    };

    const toRadians = (deg: number) => deg * (Math.PI / 180);
    const toDegrees = (rad: number) => rad * (180 / Math.PI);

    const createRotatedIcon = (status: string, rotationDeg: number, busNumber: string) => {
        const iconUrl = 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png';
        return L.divIcon({
            className: 'custom-bus-marker',
            html: `
                <div style="position: relative; width: 40px; height: 40px;">
                    <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); background: white; border: 1px solid #333; padding: 1px 4px; border-radius: 4px; font-size: 10px; font-weight: bold; white-space: nowrap; z-index: 100; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">
                        ${busNumber}
                    </div>
                    <div style="transform: rotate(${rotationDeg}deg); width: 100%; height: 100%; transition: transform 0.3s;">
                        <img src="${iconUrl}" style="width: 100%; height: 100%;" />
                    </div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });
    };

    if (!renderPos) {
        console.log(`[BusMarker] ${bus.id} - Not rendering because renderPos is null`);
        return null;
    }

    return (
        <Marker
            position={renderPos}
            icon={createRotatedIcon(bus.current_status || 'stopped', rotation, bus.bus_number || bus.name)}
            eventHandlers={{ click: onClick }}
        >
            {bus.current_status === 'breakdown' && (
                <Tooltip permanent direction="top" offset={[0, -45]} opacity={1} className="custom-tooltip-error">
                    <div className="bg-red-600 text-white px-2 py-1 rounded font-bold text-xs uppercase shadow-lg animate-pulse whitespace-nowrap">
                        ⚠️ Breakdown
                    </div>
                </Tooltip>
            )}
            <Popup>
                <div className="text-center min-w-[150px]">
                    <h3 className="font-bold text-lg">{bus.bus_number || bus.name}</h3>
                    <p className="text-sm font-medium text-blue-600 mb-2">{bus.route_name}</p>

                    <div className="grid grid-cols-2 gap-2 text-xs text-left bg-slate-100 p-2 rounded mb-2">
                        <div className="font-bold text-slate-500">Speed:</div>
                        <div className="font-mono text-slate-800">{Math.round(bus.location?.speed || 0)} km/h</div>
                    </div>

                    <div className={`text-xs uppercase font-bold mt-1 px-2 py-1 rounded text-white ${bus.current_status === 'moving' ? 'bg-green-500' : (bus.current_status === 'breakdown' ? 'bg-red-600 animate-pulse' : 'bg-red-500')}`}>
                        {bus.current_status || 'Stopped'}
                    </div>
                </div>
            </Popup>
        </Marker>
    );
}
