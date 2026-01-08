'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
const Map = dynamic(() => import('@/components/Map'), { ssr: false });
// Using SVG icons inline


const Spinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('map');
    const [buses, setBuses] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true); // Default open on desktop

    const [newBus, setNewBus] = useState({ bus_number: '', driver_id: '', route_name: '' });
    const [newStudent, setNewStudent] = useState({ name: '', parent_id: '', bus_id: '', pickup_lat: 28.61, pickup_lng: 77.20 });

    const getToken = () => localStorage.getItem('token');
    const getHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` });

    const fetchData = async () => {
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${getToken()}` };
            const [busRes, stuRes] = await Promise.all([
                fetch('http://localhost:3001/api/buses', { headers }),
                fetch('http://localhost:3001/api/students', { headers })
            ]);
            const busData = await busRes.json();
            const stuData = await stuRes.json();
            if (busData.success) setBuses(busData.buses);
            if (stuData.success) setStudents(stuData.students);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Responsive sidebar check
        if (window.innerWidth < 768) setSidebarOpen(false);
    }, []);

    const handleAddBus = async () => {
        if (!newBus.bus_number) return;
        setLoading(true);
        await fetch('http://localhost:3001/api/buses', { method: 'POST', headers: getHeaders(), body: JSON.stringify(newBus) });
        setNewBus({ bus_number: '', driver_id: '', route_name: '' });
        fetchData();
    };

    const handleAddStudent = async () => {
        if (!newStudent.name) return;
        setLoading(true);
        await fetch('http://localhost:3001/api/students', { method: 'POST', headers: getHeaders(), body: JSON.stringify(newStudent) });
        setNewStudent({ name: '', parent_id: '', bus_id: '', pickup_lat: 28.61, pickup_lng: 77.20 });
        fetchData();
    };

    const handleDelete = async (endpoint: string, id: string) => {
        if (!confirm('Are you sure?')) return;
        setLoading(true);
        await fetch(`http://localhost:3001/api/${endpoint}/${id}`, { method: 'DELETE', headers: getHeaders() });
        fetchData();
    }

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-900 overflow-hidden">
            {/* Sidebar Overlay for Mobile */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)}></div>
            )}

            {/* Sidebar */}
            <aside className={`fixed md:relative z-30 w-64 h-full bg-white dark:bg-slate-800 shadow-xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">BusTrack Pro</h1>
                    <button className="md:hidden text-slate-500" onClick={() => setSidebarOpen(false)}>✕</button>
                </div>
                <nav className="p-4 space-y-2">
                    {[
                        { id: 'map', label: 'Live Map', icon: '🗺️' },
                        { id: 'buses', label: 'Fleet Manager', icon: '🚌' },
                        { id: 'students', label: 'Students', icon: 'aaa' } // 'aaa' is placeholder, using emoji 
                    ].map(item => (
                        <button key={item.id}
                            onClick={() => { setActiveTab(item.id); if (window.innerWidth < 768) setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all font-medium ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            <span>{item.id === 'students' ? '🎓' : item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full relative">
                <header className="h-16 bg-white dark:bg-slate-800 shadow-sm flex items-center px-4 justify-between md:justify-end z-10">
                    <button className="md:hidden p-2 text-slate-600" onClick={() => setSidebarOpen(true)}>☰</button>
                    <div className="flex items-center gap-4">
                        {loading && <div className="text-blue-600 text-sm font-bold animate-pulse">Syncing...</div>}
                        <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">A</div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-4 md:p-6">
                    {activeTab === 'map' && (
                        <div className="flex flex-col h-full gap-4">
                            {/* Filter Bar */}
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex flex-wrap gap-4 items-center">
                                <h3 className="font-bold text-slate-700 dark:text-slate-300 mr-2">Filters:</h3>
                                <select className="input-std min-w-[150px]" onChange={(e) => console.log('Filter logic to implement', e.target.value)}>
                                    <option value="all">All Statuses</option>
                                    <option value="moving">🟢 Moving</option>
                                    <option value="stopped">🔴 Stopped</option>
                                    <option value="delayed">🟡 Delayed</option>
                                </select>
                                <select className="input-std min-w-[150px]">
                                    <option value="all">All Routes</option>
                                    {/* Ideally populated from routes */}
                                </select>
                                <div className="flex-1"></div>
                                <div className="flex gap-2 text-sm">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Moving</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Stopped</span>
                                </div>
                            </div>

                            <div className="flex-1 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">
                                <Map busId="all" role="admin" />
                            </div>
                        </div>
                    )}

                    {activeTab !== 'map' && (
                        <div className="max-w-5xl mx-auto space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white capitalize">{activeTab} Management</h2>

                                {/* Add Form */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                                    {activeTab === 'buses' ? (
                                        <>
                                            <input placeholder="Bus No (DL-1P-1234)" className="input-std" value={newBus.bus_number} onChange={e => setNewBus({ ...newBus, bus_number: e.target.value })} />
                                            <input placeholder="Route Name" className="input-std" value={newBus.route_name} onChange={e => setNewBus({ ...newBus, route_name: e.target.value })} />
                                            <input placeholder="Driver ID" className="input-std" value={newBus.driver_id} onChange={e => setNewBus({ ...newBus, driver_id: e.target.value })} />
                                            <button onClick={handleAddBus} className="btn-primary flex items-center justify-center gap-2">{loading ? <Spinner /> : <span>+ Add Bus</span>}</button>
                                        </>
                                    ) : (
                                        <>
                                            <input placeholder="Student Name" className="input-std" value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} />
                                            <input placeholder="Parent ID" className="input-std" value={newStudent.parent_id} onChange={e => setNewStudent({ ...newStudent, parent_id: e.target.value })} />
                                            <input placeholder="Bus ID" className="input-std" value={newStudent.bus_id} onChange={e => setNewStudent({ ...newStudent, bus_id: e.target.value })} />
                                            <button onClick={handleAddStudent} className="btn-primary flex items-center justify-center gap-2">{loading ? <Spinner /> : <span>+ Add Student</span>}</button>
                                        </>
                                    )}
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-sm text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                                <th className="py-3 px-2">ID</th>
                                                <th className="py-3 px-2">Name / Number</th>
                                                <th className="py-3 px-2">Details</th>
                                                <th className="py-3 px-2 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(activeTab === 'buses' ? buses : students).map((item: any) => (
                                                <tr key={item.id} className="group border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                    <td className="py-3 px-2 font-mono text-xs text-slate-400">{item.id}</td>
                                                    <td className="py-3 px-2 font-medium text-slate-800 dark:text-slate-200">
                                                        {item.bus_number || item.name}
                                                    </td>
                                                    <td className="py-3 px-2 text-sm text-slate-500">
                                                        {activeTab === 'buses' ? item.route_name : `Parent: ${item.parent_id}`}
                                                    </td>
                                                    <td className="py-3 px-2 text-right">
                                                        <button onClick={() => handleDelete(activeTab, item.id)} className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors">🗑</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {((activeTab === 'buses' ? buses : students).length === 0) && (
                                        <div className="text-center py-10 text-slate-400">No data found</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <style jsx global>{`
        .input-std {
            @apply p-3 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-slate-800 dark:text-white text-sm;
        }
        .btn-primary {
            @apply bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg shadow-blue-500/30 transition-all active:scale-95;
        }
      `}</style>
        </div>
    );
}
