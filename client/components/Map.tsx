'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import BusMarker from './BusMarker';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io, Socket } from 'socket.io-client';

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icon for Bus
const createBusIcon = (status: string) => {
    let iconUrl = 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png'; // Default (Yellow/Orange)
    if (status === 'moving') iconUrl = 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png'; // Use green version ideally. For now reusing same, assume color filters or distinct icons later.
    // Let's use different markers for clarity if we can't tint. 
    // Or just use the same icon for now and trust the Popup status text.
    return new L.Icon({
        iconUrl,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
};

const busIcon = createBusIcon('stopped');

type MapProps = {
    busId: string;
    role: 'parent' | 'admin' | 'driver';
    destination?: { lat: number; lng: number };
    eta?: string;
};

// New Delhi Coordinates
const DEFAULT_CENTER_LAT = 28.6139;
const DEFAULT_CENTER_LNG = 77.2090;

const Recenter = ({ lat, lng }: { lat: number; lng: number }) => {
    const map = useMap();
    useEffect(() => {
        map.flyTo([lat, lng], map.getZoom());
    }, [lat, lng, map]);
    return null;
};

const MapResizer = () => {
    const map = useMap();
    useEffect(() => {
        const resize = () => map.invalidateSize();
        // Resize immediately
        resize();
        // And after a short delay for layout shifts
        const timer = setTimeout(resize, 100);

        window.addEventListener('resize', resize);
        return () => {
            window.removeEventListener('resize', resize);
            clearTimeout(timer);
        };
    }, [map]);
    return null;
};

const AutoBounds = ({ buses }: { buses: any[] }) => {
    const map = useMap();

    useEffect(() => {
        const validBuses = buses.filter(b => {
            if (!b.location || !b.location.latitude || !b.location.longitude) return false;
            // Filter stale > 15 mins
            const timeDiff = Date.now() - Number(b.location.timestamp || 0);
            return timeDiff <= 900000;
        });
        if (validBuses.length === 0) return;

        const bounds = L.latLngBounds(validBuses.map(b => [b.location.latitude, b.location.longitude]));

        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
    }, [buses, map]);

    return null;
};

export default function MapComponent({ busId, role, destination, eta }: MapProps) {
    const [buses, setBuses] = useState<any>({});
    const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
    const [now, setNow] = useState(Date.now()); // For staleness checks
    const [debugCount, setDebugCount] = useState(0);
    const [lastUpdateId, setLastUpdateId] = useState('');
    const socketRef = useRef<Socket | null>(null);

    const [socketStatus, setSocketStatus] = useState<string>('Disconnected');
    const [fetchStatus, setFetchStatus] = useState<string>('Idle');

    useEffect(() => {
        if (busId && busId !== 'all') {
            setSelectedBusId(busId);
        }
        const interval = setInterval(() => setNow(Date.now()), 5000);
        return () => clearInterval(interval);
    }, [busId]);

    useEffect(() => {
        // Initialize Socket
        const token = localStorage.getItem('token');
        setSocketStatus('Connecting...');

        socketRef.current = io('http://localhost:3001', {
            auth: { token }
        });

        socketRef.current.on('connect', () => {
            console.log('[Map] Socket Connected');
            setSocketStatus('Connected');

            if (role === 'admin') {
                socketRef.current?.emit('join_admin');
            } else if (busId) {
                socketRef.current?.emit('join_bus', { busId, role });
            }
        });

        socketRef.current.on('connect_error', (err) => {
            console.error('[Map] Socket Error:', err);
            setSocketStatus(`Error: ${err.message}`);
        });

        socketRef.current.on('disconnect', () => {
            setSocketStatus('Disconnected');
        });

        // Event Listeners
        if ((role === 'parent' || role === 'driver') && busId) {
            socketRef.current.on('location_update', (bus) => {
                setBuses((prev: any) => ({ ...prev, [bus.id]: bus }));
            });
        } else if (role === 'admin') {
            socketRef.current.on('global_update', (bus) => {
                console.log('[Map] RX Global Update:', bus.id);
                setBuses((prev: any) => ({ ...prev, [bus.id]: bus }));
                setDebugCount(c => c + 1);
                setLastUpdateId(bus.id);
            });
        }

        // Initial Data Fetch
        const fetchData = async () => {
            setFetchStatus('Fetching...');
            try {
                const url = role === 'admin'
                    ? `http://localhost:3001/api/buses?_t=${Date.now()}`
                    : `http://localhost:3001/api/bus/${busId}`;

                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();

                console.log('[Map] Fetch Result:', data);
                if (data.success) {
                    if (role === 'admin') {
                        const busMap: any = {};
                        if (data.buses) {
                            data.buses.forEach((b: any) => busMap[b.id] = b);
                            setBuses(busMap);
                            setFetchStatus(`Success (${data.buses.length} buses)`);
                        } else {
                            setFetchStatus('Success (Empty)');
                        }
                    } else {
                        setBuses({ [data.bus.id]: data.bus });
                        setFetchStatus('Success (Single)');
                    }
                } else {
                    setFetchStatus(`Failed: ${data.message || 'Unknown'}`);
                }
            } catch (err: any) {
                console.error('[Map] Fetch Error:', err);
                setFetchStatus(`Error: ${err.message}`);
            }
        };

        fetchData();

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [busId, role]);

    // Reverse Geocoding Logic
    useEffect(() => {
        if (!selectedBusId || !buses[selectedBusId]?.location) return;

        const { latitude, longitude } = buses[selectedBusId].location;
        const busKey = `${selectedBusId}-${latitude.toFixed(4)}-${longitude.toFixed(4)}`;

        // Check if we already have this approximate address to save API calls
        if (buses[selectedBusId].lastGeocodeKey === busKey) return;

        const fetchAddress = async () => {
            try {
                // zoom=18 requests building/street level. addressdetails=1 ensures we get the breakdown.
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
                const data = await res.json();

                if (data && data.display_name) {
                    let addr = '';
                    if (data.address) {
                        const { address } = data;
                        const landmark = address.amenity || address.shop || address.tourism || address.historic || address.leisure || address.office || address.building;
                        const road = address.road || address.pedestrian || address.street;
                        const house = address.house_number;
                        const area = address.suburb || address.neighbourhood || address.residential;
                        const city = address.city || address.town || address.village;

                        const parts = [];
                        if (landmark) parts.push(landmark);
                        if (house || road) parts.push([house, road].filter(Boolean).join(' '));
                        if (area) parts.push(area);

                        // If we have very little info, add city
                        if (parts.length < 2 && city) parts.push(city);

                        if (parts.length > 0) {
                            addr = parts.slice(0, 3).join(', ');
                        }
                    }

                    // Fallback to display_name if our manual construction failed or was too empty
                    if (!addr || addr.length < 5) {
                        const displayNameParts = data.display_name.split(', ');
                        addr = displayNameParts.slice(0, 3).join(', ');
                    }

                    setBuses((prev: any) => ({
                        ...prev,
                        [selectedBusId]: {
                            ...prev[selectedBusId],
                            address: addr,
                            lastGeocodeKey: busKey
                        }
                    }));
                }
            } catch (err) {
                console.error("Geocoding failed", err);
            }
        };

        // Debounce: Wait 2 seconds of being at similar location/update before fetching
        const timer = setTimeout(fetchAddress, 2000);
        return () => clearTimeout(timer);

    }, [selectedBusId, buses]);

    // Determine center (default to New Delhi)
    const busList = Object.values(buses) as any[];
    const firstBusLoc = busList.length > 0 ? busList[0].location : null;

    // Fallback if no specific location found on first bus
    const centerLat = firstBusLoc ? firstBusLoc.latitude : DEFAULT_CENTER_LAT;
    const centerLng = firstBusLoc ? firstBusLoc.longitude : DEFAULT_CENTER_LNG;

    return (
        <MapContainer key={`${role}-${busId || 'all'}`} center={[centerLat, centerLng]} zoom={15} style={{ height: '100%', width: '100%', minHeight: '100%' }}>
            <MapResizer />

            {/* Debug Overlay */}
            {role === 'admin' && (
                <div className="absolute bottom-4 left-20 z-[1000] bg-black/80 text-white p-2 rounded text-xs font-mono pointer-events-none">
                    <div className={socketStatus === 'Connected' ? 'text-green-400' : 'text-red-400'}>Socket: {socketStatus}</div>
                    <div>Fetch: {fetchStatus}</div>
                    <div>Updates Rx: {debugCount}</div>
                    <div>Last Bus: {lastUpdateId}</div>
                    <div>Total Buses: {busList.length}</div>
                    <div>With Loc: {busList.filter((b: any) => b.location).length}</div>
                </div>
            )}

            <LayersControl position="topleft">
                <LayersControl.BaseLayer checked name="Standard">
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                        maxZoom={19}
                    />
                </LayersControl.BaseLayer>

                <LayersControl.BaseLayer name="Satellite (Esri)">
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                        maxZoom={19}
                    />
                </LayersControl.BaseLayer>

                <LayersControl.BaseLayer name="Detailed Streets (Voyager)">
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        maxZoom={20}
                    />
                </LayersControl.BaseLayer>
            </LayersControl>

            {/* Parent Route Visualization */}
            {role === 'parent' && destination && busList.length > 0 && busList[0].location && (
                <>
                    {/* Destination Marker */}
                    <Marker position={[destination.lat, destination.lng]} icon={new L.Icon({
                        iconUrl: 'https://cdn-icons-png.flaticon.com/512/854/854878.png', // Home/Destination Icon
                        iconSize: [32, 32],
                        iconAnchor: [16, 32],
                        popupAnchor: [0, -32]
                    })}>
                        <Tooltip permanent direction="top" offset={[0, -20]} className="font-bold text-sm bg-blue-600 text-white border-0 shadow-lg px-2 py-1 rounded">
                            {eta ? `ETA: ${eta}` : '...'}
                        </Tooltip>
                    </Marker>

                    {/* Route Line */}
                    <Polyline
                        positions={[
                            [busList[0].location.latitude, busList[0].location.longitude],
                            [destination.lat, destination.lng]
                        ]}
                        pathOptions={{ color: '#2563eb', weight: 4, dashArray: '10, 10', opacity: 0.6 }}
                    />
                </>
            )}

            {/* Auto Bounds for Admin */}
            {role === 'admin' && busList.length > 0 && <AutoBounds buses={busList} />}

            {busList.map((bus: any) => {
                if (!bus.location) return null;

                // Hide buses with stale location (> 15 minutes) unless it's the specific one we are tracking as driver/parent
                // But for Admin map, we want to hide "offline" buses from cluttering the view at default coords.
                // The user said "rest of buses at default location unless logged in".
                // So if timestamp is old, don't render.
                const timeDiff = Date.now() - Number(bus.location.timestamp || 0);
                // 15 minutes = 15 * 60 * 1000 = 900000
                if (timeDiff > 900000) return null;

                return (
                    <BusMarker
                        key={bus.id}
                        bus={bus}
                        onClick={() => setSelectedBusId(bus.id)}
                    />
                )
            })}
            {role !== 'admin' && busList.length === 1 && firstBusLoc && <Recenter lat={firstBusLoc.latitude} lng={firstBusLoc.longitude} />}

            {/* Telemetry Overlay */}
            {selectedBusId && buses[selectedBusId] && (
                <div className="absolute top-4 right-4 z-[1000] bg-slate-950/80 text-white p-5 rounded-2xl shadow-2xl backdrop-blur-xl border border-slate-700/50 min-w-[240px] transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-2xl font-black text-white tracking-tight">{buses[selectedBusId].bus_number}</h3>
                        {(() => {
                            const isStale = buses[selectedBusId].location?.timestamp && (Date.now() - Number(buses[selectedBusId].location.timestamp) > 60000);
                            const status = isStale ? 'stopped' : buses[selectedBusId].current_status;
                            let circleClass = 'bg-slate-500 text-slate-500';
                            if (status === 'moving') circleClass = 'bg-emerald-500 text-emerald-500 animate-pulse';
                            if (status === 'stopped') circleClass = 'bg-rose-500 text-rose-500';
                            if (status === 'breakdown') circleClass = 'bg-red-600 text-red-600 animate-ping';

                            return (
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] uppercase font-bold ${status === 'breakdown' ? 'text-red-500' : 'text-slate-400'}`}>{status}</span>
                                    <span className={`h-3 w-3 rounded-full shadow-[0_0_10px_currentColor] ${circleClass}`}></span>
                                </div>
                            )
                        })()}
                    </div>
                    <p className="text-xs text-slate-400 mb-4 font-medium">{buses[selectedBusId].route_name}</p>

                    <div className="space-y-4">
                        <div className="flex items-end justify-between border-b border-slate-700/50 pb-3">
                            <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">Speed</span>
                            <div className="text-right">
                                <span className="text-3xl font-mono font-bold text-blue-400">
                                    {buses[selectedBusId].location?.speed ? Math.round(buses[selectedBusId].location.speed) : 0}
                                </span>
                                <span className="text-xs text-slate-500 ml-1 font-bold">km/h</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/50 p-2 rounded-lg">
                                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">LAT</span>
                                <span className="font-mono text-xs text-slate-300 tracking-tight">{buses[selectedBusId].location?.latitude?.toFixed(5) || 'N/A'}</span>
                            </div>
                            <div className="bg-slate-800/50 p-2 rounded-lg">
                                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">LNG</span>
                                <span className="font-mono text-xs text-slate-300 tracking-tight">{buses[selectedBusId].location?.longitude?.toFixed(5) || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="pt-1">
                            {(() => {
                                const isStale = buses[selectedBusId].location?.timestamp && (Date.now() - Number(buses[selectedBusId].location.timestamp) > 60000);
                                const status = isStale ? 'stopped' : (buses[selectedBusId].current_status || 'Stopped');
                                let statusClasses = 'bg-slate-500/20 text-slate-400 border-slate-500/30';
                                if (status === 'moving') statusClasses = 'bg-green-500/20 text-green-400 border-green-500/30';
                                if (status === 'stopped') statusClasses = 'bg-red-500/20 text-red-400 border-red-500/30';
                                if (status === 'breakdown') statusClasses = 'bg-red-600 text-white border-red-600 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.7)]';

                                return (
                                    <div className={`text-center py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border ${statusClasses}`}>
                                        {status === 'breakdown' ? '⚠️ BREAKDOWN' : status}
                                    </div>
                                )
                            })()}
                        </div>
                    </div>

                    {/* Address Section */}
                    {buses[selectedBusId].address && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mt-2">
                            <div className="flex items-start gap-2">
                                <span className="text-lg">📍</span>
                                <div>
                                    <span className="text-[9px] text-blue-300 uppercase font-bold tracking-wider block mb-0.5">Current Location</span>
                                    <span className="text-xs font-semibold text-blue-100 leading-tight block">
                                        {buses[selectedBusId].address}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </MapContainer>
    );
}

// Helper to debounce API calls
function useDebounce(value: any, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}
