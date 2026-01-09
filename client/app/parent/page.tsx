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
    const [pickupAddress, setPickupAddress] = useState<string>('Loading address...');
    const [notification, setNotification] = useState<string>('');
    const [toasts, setToasts] = useState<{ id: number, msg: string, type?: 'info' | 'success' | 'warning' }[]>([]);
    const [loading, setLoading] = useState(true);
    const socketRef = useRef<Socket | null>(null);
    const prevStatusRef = useRef<string>('');

    const activeItem = dashboardData[selectedChildIndex];
    const bus = activeItem?.bus;
    const student = activeItem?.student;

    // --- Reverse Geocode Student Pickup ---
    useEffect(() => {
        if (!student) return;
        const lat = student.pickup_lat || HOME_LAT;
        const lng = student.pickup_lng || HOME_LNG;

        setPickupAddress('Fetching address...');
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
            .then(res => res.json())
            .then(data => {
                if (data && data.display_name) {
                    // Simplified address logic
                    const parts = data.display_name.split(', ');
                    setPickupAddress(parts.slice(0, 3).join(', '));
                } else {
                    setPickupAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                }
            })
            .catch(() => setPickupAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`));
    }, [student]);

    // --- Notification & ETA Logic ---
    useEffect(() => {
        if (!bus) return;
        const currentStatus = bus.current_status || 'stopped';

        // 1. Smart Notifications: Status Changes
        if (prevStatusRef.current && prevStatusRef.current !== currentStatus) {
            if (currentStatus === 'moving') {
                addToast(`🚀 Trip Started for ${bus.bus_number}`, 'success');
            } else if (currentStatus === 'stopped') {
                addToast(`🛑 Bus ${bus.bus_number} has Stopped`, 'warning');
            } else if (currentStatus === 'traffic') {
                addToast(`⚠️ Traffic Delay reported for ${bus.bus_number}`, 'warning');
            } else if (currentStatus === 'breakdown') {
                addToast(`⚠️ Vehicle Breakdown reported for ${bus.bus_number}`, 'warning');
            }

            // Resolved Check
            if (prevStatusRef.current === 'breakdown' && currentStatus !== 'breakdown') {
                addToast(`✅ Breakdown Resolved for ${bus.bus_number}`, 'success');
            }
        }
        prevStatusRef.current = currentStatus;

        // 2. Live ETA Calculation
        if (bus.location && student) {
            updateETA(bus.location, student);
        }
    }, [bus, student]); // Re-run whenever bus (incl. location/status) updates

    const addToast = (msg: string, type: 'info' | 'success' | 'warning' = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    };

    // --- Socket & Data Fetching ---
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
                        // Initial status ref set
                        if (res.data.length > 0 && res.data[0].bus) {
                            prevStatusRef.current = res.data[0].bus.current_status || 'stopped';
                        }
                    }
                })
                .catch(() => setLoading(false));

            socketRef.current.on('location_update', (updatedBus) => {
                setDashboardData(prev => {
                    return prev.map(item => {
                        if (item.bus && item.bus.id === updatedBus.id) {
                            // Merge updates carefully
                            return {
                                ...item,
                                bus: {
                                    ...item.bus,
                                    ...updatedBus,
                                    location: updatedBus.location,
                                    current_status: updatedBus.current_status
                                }
                            };
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

    // Join rooms
    useEffect(() => {
        if (socketRef.current && dashboardData.length > 0) {
            dashboardData.forEach(item => {
                if (item.bus) socketRef.current?.emit('join_bus', { busId: item.bus.id, role: 'parent' });
            });
        }
    }, [dashboardData]);

    const updateETA = (loc: any, stu: any) => {
        if (!loc || !loc.latitude || !stu) return;
        const toLat = stu.pickup_lat || HOME_LAT;
        const toLng = stu.pickup_lng || HOME_LNG;

        const dist = getDistance(loc.latitude, loc.longitude, toLat, toLng);
        const time = calculateETA(dist, 30); // Assuming 30km/h avg speed
        setEta(time + ' min');

        // Proximity Check
        if (dist < 0.5) { // < 500 meters
            setNotification('Near Pickup Point');
        } else {
            setNotification('');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'moving': return 'text-green-600 bg-green-50 border-green-100';
            case 'stopped': return 'text-red-600 bg-red-50 border-red-100';
            case 'traffic': return 'text-amber-600 bg-amber-50 border-amber-100';
            case 'breakdown': return 'text-red-700 bg-red-100 border-red-200 animate-pulse';
            default: return 'text-slate-600 bg-slate-50 border-slate-100';
        }
    };

    return (
        <div className="flex h-screen flex-col bg-slate-100 relative">
            {/* Fullscreen Map Layer */}
            <div className="absolute inset-0 z-0">
                {bus ? (
                    <Map
                        busId={bus.id}
                        role="parent"
                        destination={student && (student.pickup_lat || student.pickup_lng) ? { lat: student.pickup_lat || HOME_LAT, lng: student.pickup_lng || HOME_LNG } : undefined}
                        eta={eta}
                    />
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

                    <div className="flex flex-col mb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                                    {student ? student.name : 'Unknown Student'}
                                </h1>
                                <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                                    <span>📍</span> <span>{pickupAddress}</span>
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-2xl animate-in zoom-in duration-300 shadow-sm border border-blue-100">
                                {bus ? '🚌' : '🏠'}
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                            <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">{bus?.bus_number || '--'}</span>
                            <span className="text-blue-600 font-medium truncate max-w-[150px]">{bus?.route_name || 'No Route'}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-600 rounded-xl p-3 text-white text-center shadow-lg shadow-blue-500/30">
                            <p className="text-blue-100 text-xs font-bold uppercase mb-1">ETA</p>
                            <p className="text-2xl font-bold">{bus ? eta : '--'}</p>
                        </div>
                        <div className={`rounded-xl p-3 text-center border-2 transition-colors duration-300 ${getStatusColor(bus?.current_status || 'stopped')}`}>
                            <p className="opacity-70 text-xs font-bold uppercase mb-1">Status</p>
                            <p className={`font-bold text-sm uppercase ${notification ? 'animate-pulse' : ''}`}>
                                {notification || (bus?.current_status || 'Stopped')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast Container */}
            <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`px-4 py-3 rounded-lg shadow-xl animate-in slide-in-from-top-2 fade-in duration-300 pointer-events-auto border-l-4 ${t.type === 'success' ? 'bg-white text-green-800 border-green-500' :
                        t.type === 'warning' ? 'bg-white text-amber-800 border-amber-500' :
                            'bg-slate-800 text-white border-slate-600'
                        }`}>
                        <p className="font-bold text-sm">{t.msg}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
