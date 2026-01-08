'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getDistance, calculateETA } from '@/utils/geo';
import { io, Socket } from 'socket.io-client';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

const HOME_LAT = 28.6100;
const HOME_LNG = 77.2000;

export default function ParentDashboard() {
    const [dashboardData, setDashboardData] = useState<any[]>([]);
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
    const [eta, setEta] = useState<string>('...');
    const [notification, setNotification] = useState<string>('');
    const [toasts, setToasts] = useState<{ id: number, msg: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const socketRef = useRef<Socket | null>(null);
    const prevStatusRef = useRef<string>('');

    const activeItem = dashboardData[selectedChildIndex];
    const bus = activeItem?.bus;
    const student = activeItem?.student;

    // ... socket init ...

    // Notification Logic
    useEffect(() => {
        if (!bus) return;
        const currentStatus = bus.current_status;

        // Status Change Alert
        if (prevStatusRef.current && prevStatusRef.current !== 'moving' && currentStatus === 'moving') {
            addToast(`🚀 Trip Started for ${bus.bus_number}`);
        }
        prevStatusRef.current = currentStatus;

        // Proximity Alert (handled by updateETA but let's debounce or trigger once)
        if (notification === 'Near Pickup Point') {
            // To avoid spamming, implemented simple check or just let it show in status box
            // For toast, maybe only once? Let's skip toast for proximity to avoid spam, status box is clear.
        }
    }, [bus, notification]);

    const addToast = (msg: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    };

    useEffect(() => {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        const token = localStorage.getItem('token');

        socketRef.current = io('http://localhost:3001', {
            auth: { token }
        });

        if (u.id) {
            fetch(`http://localhost:3001/api/parent/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(res => {
                    setLoading(false);
                    if (res.success && res.data) {
                        setDashboardData(res.data);
                        if (res.data.length > 0) {
                            const first = res.data[0];
                            if (first.bus && first.bus.location) updateETA(first.bus.location, first.student);
                        }
                    }
                })
                .catch(() => setLoading(false));

            socketRef.current.on('location_update', (updatedBus) => {
                setDashboardData(prev => {
                    return prev.map(item => {
                        if (item.bus && item.bus.id === updatedBus.id) {
                            return { ...item, bus: { ...updatedBus, location: updatedBus.location } };
                        }
                        return item;
                    });
                });
            });
        }

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    // Join rooms when data changes
    useEffect(() => {
        if (socketRef.current) {
            dashboardData.forEach(item => {
                if (item.bus) socketRef.current?.emit('join_bus', { busId: item.bus.id, role: 'parent' });
            });
        }
    }, [dashboardData]);

    // Recalculate ETA when active bus update
    useEffect(() => {
        if (bus && bus.location && student) {
            updateETA(bus.location, student);
        }
    }, [bus, student]);

    const updateETA = (loc: any, stu: any) => {
        if (!loc || !loc.latitude || !stu) return;
        // Use student pickup location if available, else Home default
        const toLat = stu.pickup_lat || HOME_LAT;
        const toLng = stu.pickup_lng || HOME_LNG;

        const dist = getDistance(loc.latitude, loc.longitude, toLat, toLng);
        const time = calculateETA(dist, 30);
        setEta(time + ' min');

        if (dist < 1) {
            setNotification('Near Pickup Point');
        } else {
            setNotification('');
        }
    };

    return (
        <div className="flex h-screen flex-col bg-slate-100 relative">
            {/* Fullscreen Map Layer */}
            <div className="absolute inset-0 z-0">
                {bus ? (
                    <Map busId={bus.id} role="parent" />
                ) : (
                    <div className="h-full w-full flex items-center justify-center bg-slate-200 text-slate-500">
                        {loading ? 'Locating...' : 'No active bus for this student.'}
                    </div>
                )}
            </div>

            {/* Floating UI */}
            <div className="absolute bottom-0 left-0 right-0 md:top-4 md:left-4 md:right-auto md:bottom-auto z-10 p-4 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-md shadow-2xl rounded-2xl p-5 border border-white/50 w-full md:w-80 pointer-events-auto transition-all">

                    {/* Child Selector */}
                    {dashboardData.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 border-b border-slate-100">
                            {dashboardData.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedChildIndex(idx)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${selectedChildIndex === idx ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    {item.student.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {student ? student.name : 'Unknown Student'}
                            </h1>
                            <div className="text-xl font-bold text-slate-800">{bus?.bus_number || '--'}</div>
                            <div className="text-sm text-blue-600 font-medium">{bus?.route_name || 'No Route'}</div>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-2xl">
                            {bus ? '🚌' : '🏠'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-600 rounded-xl p-3 text-white text-center shadow-lg shadow-blue-500/30">
                            <p className="text-blue-100 text-xs font-bold uppercase mb-1">ETA</p>
                            <p className="text-2xl font-bold">{bus ? eta : '--'}</p>
                        </div>
                        <div className={`rounded-xl p-3 text-center border-2 ${notification ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-transparent'}`}>
                            <p className="text-slate-400 text-xs font-bold uppercase mb-1">Status</p>
                            <p className={`font-bold text-sm ${notification ? 'text-red-500 animate-pulse' : 'text-slate-600'}`}>
                                {notification || (bus?.current_status || 'Waiting')}
                            </p>
                        </div>
                    </div>
                    {/* Playback Controls */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        {/* Placeholder for now, later implement full slider */}
                        <button className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 font-bold text-sm transition-colors"
                            onClick={() => {
                                if (!bus) return;
                                addToast('Load History: Feature coming in next update (Backend Ready)');
                                // fetch(`http://localhost:3001/api/trips/${bus.id}/history`) ...
                            }}>
                            ↺ Replay Today's Trip
                        </button>
                    </div>
                </div>
            </div>
            {/* Toast Container */}
            <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className="bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl animate-in slide-in-from-top-2 fade-in duration-300 pointer-events-auto">
                        {t.msg}
                    </div>
                ))}
            </div>
        </div>
    );
}
