'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// Lazy load Map to avoid SSR issues
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function DriverDashboard() {
    const router = useRouter();
    const [active, setActive] = useState(false);
    const [status, setStatus] = useState('stationary'); // 'stationary', 'moving', 'breakdown', 'emergency'
    const [connected, setConnected] = useState(false);
    const [myBus, setMyBus] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [view, setView] = useState<'controls' | 'checklist' | 'map' | 'history'>('controls');
    const [smartPrompt, setSmartPrompt] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);

    const socketRef = useRef<Socket | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const offlineQueueRef = useRef<any[]>([]);

    const lastPosRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

    useEffect(() => {
        // Load offline queue
        const q = localStorage.getItem('offline_queue');
        if (q) offlineQueueRef.current = JSON.parse(q);

        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (!token || !userStr) {
            router.push('/');
            return;
        }

        const u = JSON.parse(userStr);

        socketRef.current = io('http://localhost:3001', {
            auth: { token }
        });
        socketRef.current.on('connect', () => {
            setConnected(true);
            flushQueue();
        });
        socketRef.current.on('disconnect', () => setConnected(false));

        // Fetch assigned bus
        fetch('http://localhost:3001/api/buses', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.buses) {
                    const b = data.buses.find((bus: any) => bus.driver_id === u.id);
                    if (b) {
                        setMyBus(b);

                        // Check for stale 'moving' state (broken session)
                        const isStale = b.location?.timestamp && (Date.now() - Number(b.location.timestamp) > 10 * 60 * 1000); // 10 mins

                        if (b.current_status === 'moving' && isStale) {
                            console.log('Detected stale moving state, resetting to stationary');
                            setStatus('stationary');
                            setActive(false);
                            // We'll emit the correction once socket connects below
                        } else {
                            if (b.current_status) setStatus(b.current_status);
                            if (b.current_status === 'moving') setActive(true);
                        }

                        // Initialize lastPosRef from server data if available to prevent 0,0 jump
                        if (b.location) {
                            lastPosRef.current = {
                                lat: b.location.latitude,
                                lng: b.location.longitude,
                                time: Date.now()
                            };
                        }

                        socketRef.current?.emit('join_bus', { busId: b.id, role: 'driver' });

                        // If we detected stale state, correct the server now that we are about to join
                        if (b.current_status === 'moving' && isStale && socketRef.current) {
                            socketRef.current.emit('driver_update_location', {
                                busId: b.id,
                                lat: b.location?.latitude || 31.2982,
                                lng: b.location?.longitude || 75.5626,
                                status: 'stopped'
                            });
                        }

                        // Send initial location ping so map shows something
                        if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(pos => {
                                const { latitude, longitude } = pos.coords;
                                lastPosRef.current = { lat: latitude, lng: longitude, time: Date.now() };
                                socketRef.current?.emit('driver_update_location', {
                                    busId: b.id,
                                    lat: latitude,
                                    lng: longitude,
                                    status: b.current_status || 'stationary'
                                });
                            });
                        }

                        // Fetch students for this bus
                        fetch(`http://localhost:3001/api/buses/${b.id}/students`, { headers: { 'Authorization': `Bearer ${token}` } })
                            .then(res => res.json())
                            .then(sData => {
                                if (sData.success) setStudents(sData.students);
                            });

                        // Fetch History
                        fetch(`http://localhost:3001/api/trips/${b.id}/history`, { headers: { 'Authorization': `Bearer ${token}` } })
                            .then(res => res.json())
                            .then(hData => {
                                if (hData.success) setLogs(hData.logs);
                            });
                    }
                }
            });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, [router]);

    // Flush offline queue when connected
    const flushQueue = () => {
        if (offlineQueueRef.current.length === 0) return;

        const queue = [...offlineQueueRef.current];
        offlineQueueRef.current = [];
        localStorage.removeItem('offline_queue');

        queue.forEach(item => {
            if (socketRef.current) {
                if (item.type === 'attendance') socketRef.current.emit('driver_mark_attendance', item.payload);
                if (item.type === 'location') socketRef.current.emit('driver_update_location', item.payload);
            }
        });
    };

    const addToQueue = (type: 'attendance' | 'location', payload: any) => {
        offlineQueueRef.current.push({ type, payload });
        localStorage.setItem('offline_queue', JSON.stringify(offlineQueueRef.current));
    };

    const markStudent = (studentId: string, newStatus: string) => {
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, today_status: newStatus } : s));
        const payload = { studentId, status: newStatus, busId: myBus?.id };

        if (!connected) { addToQueue('attendance', payload); return; }

        if (socketRef.current && myBus) {
            socketRef.current.emit('driver_mark_attendance', payload);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        router.push('/');
    };

    const setBreakdown = () => {
        const newStatus = status === 'breakdown' ? 'stationary' : 'breakdown';
        setStatus(newStatus);
        setActive(false); // Stop trip logic if breakdown

        const lat = lastPosRef.current?.lat || myBus?.location?.latitude || 31.2982;
        const lng = lastPosRef.current?.lng || myBus?.location?.longitude || 75.5626;

        if (socketRef.current && myBus) {
            socketRef.current.emit('driver_update_location', {
                busId: myBus.id,
                lat,
                lng,
                status: newStatus
            });
        }
    };

    const toggleTrip = () => {
        if (active) {
            // STOPPING TRIP
            setActive(false);
            setStatus('stationary');
            setSmartPrompt(null);

            const lat = lastPosRef.current?.lat || myBus?.location?.latitude || 31.2982;
            const lng = lastPosRef.current?.lng || myBus?.location?.longitude || 75.5626;

            const payload = { busId: myBus.id, lat, lng, status: 'stopped' };
            if (connected && socketRef.current) socketRef.current.emit('driver_update_location', payload);
            else addToQueue('location', payload);

            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        } else {
            setActive(true);
            setStatus('moving');
            setSmartPrompt(null);
            // Reset last position to avoid speed jumps from stale/server data
            lastPosRef.current = null;
            startTracking();
        }
    };

    const simulationRef = useRef<NodeJS.Timeout | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);

    const toggleSimulation = () => {
        if (isSimulating) {
            // Stop Simulation
            if (simulationRef.current) clearInterval(simulationRef.current);
            setIsSimulating(false);
            setActive(false);
            setStatus('stationary');
            // Send stop update to server to clean up state
            if (socketRef.current) {
                socketRef.current.emit('driver_update_location', {
                    busId: myBus.id,
                    lat: debugInfo?.lat || 28.6139,
                    lng: debugInfo?.lng || 77.2090,
                    status: 'stopped',
                    speed: 0
                });
            }
            alert('Simulation Stopped.');
        } else {
            // Start Simulation
            setIsSimulating(true);
            setActive(true);
            setStatus('moving');

            // New Delhi Coordinates for Demo
            let simLat = 28.6139;
            let simLng = 77.2090;
            let angle = 0;

            // Remove geolocation override to enforce New Delhi for demo
            /* if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                    simLat = pos.coords.latitude;
                    simLng = pos.coords.longitude;
                }, () => { }, { timeout: 1000 });
            } */

            simulationRef.current = setInterval(() => {
                angle += 0.05;
                // Move in a circle
                const radius = 0.002; // approx 200m radius
                const newLat = simLat + radius * Math.cos(angle);
                const newLng = simLng + radius * Math.sin(angle);

                // Random speed between 30-50 km/h
                const simSpeed = 30 + Math.random() * 20;

                const payload = {
                    busId: myBus.id,
                    lat: newLat,
                    lng: newLng,
                    speed: simSpeed,
                    status: 'moving'
                };

                if (socketRef.current) socketRef.current.emit('driver_update_location', payload);

                // Update local debug view
                setDebugInfo({
                    lat: newLat,
                    lng: newLng,
                    acc: 5,
                    spd: simSpeed.toFixed(1),
                    isSim: true,
                    time: new Date().toLocaleTimeString()
                });

            }, 2000); // Update every 2 seconds

            alert('Simulation Started: Bus will move automatically.');
        }
    };


    const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    const deg2rad = (deg: number) => deg * (Math.PI / 180);

    const startTracking = () => {
        if (!navigator.geolocation || !myBus) return;
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                let speed = position.coords.speed; // Speed in m/s

                const now = position.timestamp || Date.now();

                // Fallback Manual Speed Calculation
                if ((speed === null || speed === 0) && lastPosRef.current) {
                    const distKm = getDistanceFromLatLonInKm(lastPosRef.current.lat, lastPosRef.current.lng, latitude, longitude);
                    const timeDiffHours = (now - lastPosRef.current.time) / (1000 * 3600);

                    if (timeDiffHours > 0 && distKm > 0) {
                        const calculatedSpeedKmh = distKm / timeDiffHours;
                        // Filter noise: if speed is absurdly high (> 120km/h) or very low (< 0.5km/h), ignore
                        if (calculatedSpeedKmh > 0.5 && calculatedSpeedKmh < 120) {
                            speed = calculatedSpeedKmh / 3.6; // Convert back to m/s for consistency below
                        }
                    }
                }

                lastPosRef.current = { lat: latitude, lng: longitude, time: now };

                // Update Debug Info
                setDebugInfo({
                    lat: latitude,
                    lng: longitude,
                    acc: position.coords.accuracy,
                    spd: speed ? (speed * 3.6).toFixed(1) : 0,
                    time: new Date().toLocaleTimeString()
                });

                // Smart Prompt
                if (!active && speed && speed > 2.5) setSmartPrompt('Movement detected. Start Trip?');

                const payload = {
                    busId: myBus.id,
                    lat: latitude,
                    lng: longitude,
                    speed: speed ? (speed * 3.6) : 0, // Convert m/s to km/h
                    status: status === 'breakdown' ? 'breakdown' : 'moving'
                };

                if (connected && socketRef.current) {
                    socketRef.current.emit('driver_update_location', payload);
                } else if (!connected && active) {
                    addToQueue('location', payload);
                }
            },
            (error) => console.error(error),
            { enableHighAccuracy: true }
        );
    };

    if (!myBus) return (
        <div className="flex h-screen items-center justify-center bg-slate-900 text-white flex-col gap-4">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <p className="opacity-70">Loading Driver Portal...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden">
            {/* Header */}
            <header className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-10">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold text-white">{myBus.bus_number}</h1>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {connected ? 'ONLINE' : 'OFFLINE'}
                        </span>
                    </div>
                    <div className="text-xs text-slate-400">{myBus.route_name}</div>
                </div>
                <button onClick={handleLogout} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
                    Log Out
                </button>
            </header>

            {/* Smart Prompt */}
            {smartPrompt && !active && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg border border-blue-400 animate-bounce flex items-center gap-4 cursor-pointer" onClick={() => { toggleTrip(); setSmartPrompt(null); }}>
                    <span className="text-xl">🚀</span>
                    <span className="font-bold">{smartPrompt}</span>
                </div>
            )}

            {/* Break Down Banner */}
            {status === 'breakdown' && (
                <div className="bg-red-600 text-white p-2 text-center font-bold uppercase animate-pulse z-10">
                    ⚠️ Vehicle Breakdown Reported ⚠️
                </div>
            )}

            {/* Debug Info Panel */}
            {active && debugInfo && (
                <div className="bg-slate-900/90 backdrop-blur text-[10px] text-emerald-400 p-2 border-b border-slate-800 flex flex-wrap justify-center gap-x-4 gap-y-1 shadow-sm">
                    <span className="font-mono">📍 {debugInfo.lat.toFixed(5)}, {debugInfo.lng.toFixed(5)}</span>
                    <span className="font-mono">📡 ±{debugInfo.acc?.toFixed(0)}m</span>
                    <span className="font-mono font-bold">🚀 {debugInfo.spd} km/h {debugInfo.isSim ? '(SIM)' : ''}</span>
                    <span className="font-mono opacity-75">⏰ {debugInfo.time}</span>
                </div>
            )}

            <main className="flex-1 flex flex-col relative z-0 overflow-hidden bg-slate-950">
                {view === 'controls' && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">

                        <button
                            onClick={toggleTrip}
                            className={`
                        relative w-64 h-64 rounded-full flex flex-col items-center justify-center transition-all duration-300
                        shadow-[0_0_60px_rgba(0,0,0,0.5)] border-8
                        ${active
                                    ? 'bg-red-600 border-red-500 shadow-red-600/30'
                                    : 'bg-emerald-600 border-emerald-500 shadow-emerald-600/30'
                                }
                    `}
                        >
                            <span className="text-5xl mb-2">{active ? '🛑' : '🚀'}</span>
                            <span className="text-xl font-black uppercase tracking-wider">{active ? 'STOP TRIP' : 'START TRIP'}</span>
                        </button>


                        <button
                            onClick={setBreakdown}
                            className={`w-full max-w-xs py-4 rounded-xl font-bold uppercase tracking-wider border-2 transition-all ${status === 'breakdown' ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-orange-500/10 border-orange-500 text-orange-500 hover:bg-orange-500/20'}`}>
                            {status === 'breakdown' ? 'Resolve Issue' : '⚠️ Report Breakdown'}
                        </button>

                        <button
                            onClick={toggleSimulation}
                            className={`text-xs underline mt-4 opacity-70 hover:opacity-100 ${isSimulating ? 'text-red-500 font-bold' : 'text-blue-500'}`}>
                            {isSimulating ? '⏹ Stop Simulation' : '▶ Start Cruise Mode (Demo)'}
                        </button>
                    </div>
                )}

                {view === 'checklist' && (
                    <div className="flex-1 overflow-auto p-4 space-y-3 pb-20">
                        <h2 className="text-slate-400 uppercase text-xs font-bold tracking-widest mb-2">Student Checklist ({students.length})</h2>
                        {students.map(student => (
                            <div key={student.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold">{student.name}</h3>
                                    <p className="text-slate-500 text-xs mt-1">Stop: {student.pickup_lat?.toFixed(4)}, {student.pickup_lng?.toFixed(4)}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => markStudent(student.id, 'picked')} className={`w-10 h-10 rounded-full flex items-center justify-center border ${student.today_status === 'picked' ? 'bg-green-500 border-green-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>✅</button>
                                    <button onClick={() => markStudent(student.id, 'absent')} className={`w-10 h-10 rounded-full flex items-center justify-center border ${student.today_status === 'absent' ? 'bg-red-500 border-red-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>❌</button>
                                    {student.pickup_lat && (
                                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${student.pickup_lat},${student.pickup_lng}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 border border-blue-500 text-white">📍</a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {view === 'map' && (
                    <div className="absolute inset-0 w-full h-full bg-slate-800">
                        {/* Leaflet Map */}
                        <Map busId={myBus.id} role="driver" />
                    </div>
                )}

                {view === 'history' && (
                    <div className="flex-1 overflow-auto p-4 space-y-3">
                        <h2 className="text-slate-400 uppercase text-xs font-bold tracking-widest mb-2">Recent Logs</h2>
                        {logs.length === 0 && <p className="text-slate-500 text-center py-10">No recent history.</p>}
                        {logs.map((log, i) => (
                            <div key={i} className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex justify-between items-center text-sm">
                                <div>
                                    <div className="text-slate-300 font-bold">{new Date(parseInt(log.timestamp)).toLocaleTimeString()}</div>
                                    <div className="text-slate-500 text-xs">{new Date(parseInt(log.timestamp)).toLocaleDateString()}</div>
                                </div>
                                <div className="font-mono text-xs text-slate-400">
                                    {log.latitude?.toFixed(4)}, {log.longitude?.toFixed(4)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Tab Bar */}
            <nav className="bg-slate-900 border-t border-slate-800 flex justify-around p-2 pb-6 z-20">
                <button onClick={() => setView('controls')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${view === 'controls' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500'}`}>
                    <span className="text-xl">🎮</span>
                    <span className="text-[10px] font-bold uppercase">Controls</span>
                </button>
                <button onClick={() => setView('checklist')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${view === 'checklist' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500'}`}>
                    <span className="text-xl">📋</span>
                    <span className="text-[10px] font-bold uppercase">List</span>
                </button>
                <button onClick={() => setView('map')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${view === 'map' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500'}`}>
                    <span className="text-xl">🗺️</span>
                    <span className="text-[10px] font-bold uppercase">Map</span>
                </button>
                <button onClick={() => setView('history')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${view === 'history' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500'}`}>
                    <span className="text-xl">📜</span>
                    <span className="text-[10px] font-bold uppercase">History</span>
                </button>
            </nav>
        </div>
    );
}
