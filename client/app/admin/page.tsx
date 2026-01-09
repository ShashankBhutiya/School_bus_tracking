'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

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
    const [drivers, setDrivers] = useState<any[]>([]);
    const [parents, setParents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Forms
    const [newBus, setNewBus] = useState({ bus_number: '', driver_id: '', route_name: '' });
    const [newStudent, setNewStudent] = useState({ name: '', parent_id: '', bus_id: '', pickup_lat: 28.61, pickup_lng: 77.20 });
    const [newDriver, setNewDriver] = useState({ name: '', email: '', phone: '', password: '' });

    // Edit State
    const [editingItem, setEditingItem] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const getToken = () => localStorage.getItem('token');
    const getHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` });

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = getToken();
            if (!token) {
                window.location.href = '/login';
                return;
            }
            const headers = { 'Authorization': `Bearer ${token}` };
            const [busRes, stuRes, driverRes, parentRes] = await Promise.all([
                fetch('http://localhost:3001/api/buses', { headers }),
                fetch('http://localhost:3001/api/students', { headers }),
                fetch('http://localhost:3001/api/drivers', { headers }),
                fetch('http://localhost:3001/api/parents', { headers })
            ]);

            const busData = await busRes.json();
            const stuData = await stuRes.json();
            const driverData = await driverRes.json();
            const parentData = await parentRes.json();

            if (busData.success) setBuses(busData.buses);
            if (stuData.success) setStudents(stuData.students);
            if (driverData.success) setDrivers(driverData.drivers);
            if (parentData.success) setParents(parentData.parents);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        if (window.innerWidth < 768) setSidebarOpen(false);
    }, []);

    // --- Handlers ---

    const handleAddBus = async () => {
        if (!newBus.bus_number || !newBus.driver_id) return alert('Details required');
        setLoading(true);
        await fetch('http://localhost:3001/api/buses', { method: 'POST', headers: getHeaders(), body: JSON.stringify(newBus) });
        setNewBus({ bus_number: '', driver_id: '', route_name: '' });
        fetchData();
    };

    const handleAddStudent = async () => {
        if (!newStudent.name) return alert('Name required');
        setLoading(true);
        await fetch('http://localhost:3001/api/students', { method: 'POST', headers: getHeaders(), body: JSON.stringify(newStudent) });
        setNewStudent({ name: '', parent_id: '', bus_id: '', pickup_lat: 28.61, pickup_lng: 77.20 });
        fetchData();
    };

    const handleAddDriver = async () => {
        if (!newDriver.email || !newDriver.password) return alert('Email/Pass required');
        setLoading(true);
        await fetch('http://localhost:3001/api/drivers', { method: 'POST', headers: getHeaders(), body: JSON.stringify(newDriver) });
        setNewDriver({ name: '', email: '', phone: '', password: '' });
        fetchData();
    };

    const handleDelete = async (endpoint: string, id: string) => {
        if (!confirm('Are you sure?')) return;
        setLoading(true);
        await fetch(`http://localhost:3001/api/${endpoint}/${id}`, { method: 'DELETE', headers: getHeaders() });
        fetchData();
    };

    const openEditModal = (item: any) => {
        setEditingItem({ ...item });
        setIsEditModalOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingItem) return;
        setLoading(true);
        let endpoint = '';
        if (activeTab === 'buses') endpoint = 'buses';
        if (activeTab === 'students') endpoint = 'students';
        if (activeTab === 'drivers') endpoint = 'drivers';

        await fetch(`http://localhost:3001/api/${endpoint}/${editingItem.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(editingItem)
        });
        setIsEditModalOpen(false);
        setEditingItem(null);
        fetchData();
    };

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-900 overflow-hidden">
            {/* Sidebar Overlay */}
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
                        { id: 'students', label: 'Students', icon: '🎓' },
                        { id: 'drivers', label: 'Drivers', icon: '👮' }
                    ].map(item => (
                        <button key={item.id}
                            onClick={() => { setActiveTab(item.id); if (window.innerWidth < 768) setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all font-medium ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            <span>{item.icon}</span>
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
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm flex flex-wrap gap-4 items-center">
                                <h3 className="font-bold text-slate-700 dark:text-slate-300 mr-2">Filters:</h3>
                                <div className="flex gap-2 text-sm ml-auto">
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

                                {/* Add Forms */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                                    {activeTab === 'buses' && (
                                        <>
                                            <input placeholder="Bus No" className="input-std" value={newBus.bus_number} onChange={e => setNewBus({ ...newBus, bus_number: e.target.value })} />
                                            <input placeholder="Route" className="input-std" value={newBus.route_name} onChange={e => setNewBus({ ...newBus, route_name: e.target.value })} />
                                            <select className="input-std" value={newBus.driver_id} onChange={e => setNewBus({ ...newBus, driver_id: e.target.value })}>
                                                <option value="">Select Driver</option>
                                                {drivers.length > 0 ? (
                                                    drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                                                ) : (
                                                    <option disabled>No drivers found</option>
                                                )}
                                            </select>
                                            <button onClick={handleAddBus} className="btn-primary flex items-center justify-center gap-2">{loading ? <Spinner /> : <span>+ Add Bus</span>}</button>
                                        </>
                                    )}

                                    {activeTab === 'drivers' && (
                                        <>
                                            <input placeholder="Name" className="input-std" value={newDriver.name} onChange={e => setNewDriver({ ...newDriver, name: e.target.value })} />
                                            <input placeholder="Email" className="input-std" value={newDriver.email} onChange={e => setNewDriver({ ...newDriver, email: e.target.value })} />
                                            <input placeholder="Phone" className="input-std" value={newDriver.phone} onChange={e => setNewDriver({ ...newDriver, phone: e.target.value })} />
                                            <input placeholder="Password" type="password" className="input-std" value={newDriver.password} onChange={e => setNewDriver({ ...newDriver, password: e.target.value })} />
                                            <div className="md:col-span-4 flex justify-end mt-2">
                                                <button onClick={handleAddDriver} className="btn-primary flex items-center justify-center gap-2 px-8">{loading ? <Spinner /> : <span>+ Add Driver</span>}</button>
                                            </div>
                                        </>
                                    )}

                                    {activeTab === 'students' && (
                                        <>
                                            <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-5 gap-4">
                                                <input placeholder="Name" className="input-std" value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} />
                                                <select className="input-std" value={newStudent.parent_id} onChange={e => setNewStudent({ ...newStudent, parent_id: e.target.value })}>
                                                    <option value="">Select Parent</option>
                                                    {parents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                                <select className="input-std" value={newStudent.bus_id} onChange={e => setNewStudent({ ...newStudent, bus_id: e.target.value })}>
                                                    <option value="">Select Bus</option>
                                                    {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number}</option>)}
                                                </select>
                                                <input type="number" placeholder="Lat" className="input-std" value={newStudent.pickup_lat} onChange={e => setNewStudent({ ...newStudent, pickup_lat: parseFloat(e.target.value) })} />
                                                <input type="number" placeholder="Lng" className="input-std" value={newStudent.pickup_lng} onChange={e => setNewStudent({ ...newStudent, pickup_lng: parseFloat(e.target.value) })} />
                                            </div>
                                            <div className="md:col-span-4 flex justify-end">
                                                <button onClick={handleAddStudent} className="btn-primary flex items-center justify-center gap-2 px-8">{loading ? <Spinner /> : <span>+ Add Student</span>}</button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* List */}
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
                                            {(() => {
                                                let data = [];
                                                if (activeTab === 'buses') data = buses;
                                                if (activeTab === 'students') data = students;
                                                if (activeTab === 'drivers') data = drivers;

                                                return data.map((item: any) => (
                                                    <tr key={item.id} className="group border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                        <td className="py-3 px-2 font-mono text-xs text-slate-400">{item.id.slice(0, 8)}...</td>
                                                        <td className="py-3 px-2 font-medium text-slate-800 dark:text-slate-200">
                                                            {item.bus_number || item.name}
                                                        </td>
                                                        <td className="py-3 px-2 text-sm text-slate-500">
                                                            {activeTab === 'buses' && <span>Route: {item.route_name} | Driver: {drivers.find(d => d.id === item.driver_id)?.name || 'N/A'}</span>}
                                                            {activeTab === 'students' && <span>Parent: {parents.find(p => p.id === item.parent_id)?.name || 'N/A'} | Bus: {buses.find(b => b.id === item.bus_id)?.bus_number || 'N/A'}</span>}
                                                            {activeTab === 'drivers' && <span>{item.email} | {item.phone}</span>}
                                                        </td>
                                                        <td className="py-3 px-2 text-right flex justify-end gap-2">
                                                            <button onClick={() => openEditModal(item)} className="text-blue-400 hover:text-blue-600 p-2">✎</button>
                                                            <button onClick={() => handleDelete(activeTab, item.id)} className="text-red-400 hover:text-red-600 p-2">🗑</button>
                                                        </td>
                                                    </tr>
                                                ));
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Edit Modal */}
                {isEditModalOpen && editingItem && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl scale-100 transition-all">
                            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">Edit {activeTab.slice(0, -1)}</h2>

                            <div className="space-y-4">
                                {activeTab === 'buses' && (
                                    <>
                                        <div>
                                            <label className="text-sm font-semibold text-slate-500">Bus Number</label>
                                            <input className="input-std w-full mt-1" value={editingItem.bus_number} onChange={e => setEditingItem({ ...editingItem, bus_number: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-slate-500">Route</label>
                                            <input className="input-std w-full mt-1" value={editingItem.route_name} onChange={e => setEditingItem({ ...editingItem, route_name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-slate-500">Driver</label>
                                            <select className="input-std w-full mt-1" value={editingItem.driver_id} onChange={e => setEditingItem({ ...editingItem, driver_id: e.target.value })}>
                                                <option value="">Select Driver</option>
                                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}

                                {activeTab === 'students' && (
                                    <>
                                        <div>
                                            <label className="text-sm font-semibold text-slate-500">Name</label>
                                            <input className="input-std w-full mt-1" value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-semibold text-slate-500">Parent</label>
                                                <select className="input-std w-full mt-1" value={editingItem.parent_id} onChange={e => setEditingItem({ ...editingItem, parent_id: e.target.value })}>
                                                    <option value="">Select Parent</option>
                                                    {parents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-sm font-semibold text-slate-500">Bus</label>
                                                <select className="input-std w-full mt-1" value={editingItem.bus_id} onChange={e => setEditingItem({ ...editingItem, bus_id: e.target.value })}>
                                                    <option value="">Select Bus</option>
                                                    {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-semibold text-slate-500">Lat</label>
                                                <input type="number" className="input-std w-full mt-1" value={editingItem.pickup_lat} onChange={e => setEditingItem({ ...editingItem, pickup_lat: parseFloat(e.target.value) })} />
                                            </div>
                                            <div>
                                                <label className="text-sm font-semibold text-slate-500">Lng</label>
                                                <input type="number" className="input-std w-full mt-1" value={editingItem.pickup_lng} onChange={e => setEditingItem({ ...editingItem, pickup_lng: parseFloat(e.target.value) })} />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {activeTab === 'drivers' && (
                                    <>
                                        <div>
                                            <label className="text-sm font-semibold text-slate-500">Name</label>
                                            <input className="input-std w-full mt-1" value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-slate-500">Email</label>
                                            <input className="input-std w-full mt-1" value={editingItem.email} onChange={e => setEditingItem({ ...editingItem, email: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-slate-500">Phone</label>
                                            <input className="input-std w-full mt-1" value={editingItem.phone} onChange={e => setEditingItem({ ...editingItem, phone: e.target.value })} />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition-colors">Cancel</button>
                                <button onClick={handleUpdate} className="btn-primary">Save Changes</button>
                            </div>
                        </div>
                    </div>
                )}
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
