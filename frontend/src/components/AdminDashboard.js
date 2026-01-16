import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { io } from 'socket.io-client';
import GoogleLocationPicker from './GoogleLocationPicker';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Store, Star, Search, Plus, RefreshCw,
  LogOut, Shield, MapPin, Edit3,
  ArrowUpRight, X,
  Key, Moon, Sun
} from 'lucide-react';

function AdminDashboard({ onLogout, theme = 'light', onToggleTheme }) {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [stats, setStats] = useState({ total_users: 0, total_stores: 0, total_ratings: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [storeSearch] = useState('');
  const [userSort] = useState('name');
  const [userOrder] = useState('asc');
  const [storeSort] = useState('name');
  const [storeOrder] = useState('asc');

  // Modal States
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [storeForm, setStoreForm] = useState({ name: '', email: '', address: '', owner_id: '', latitude: 12.9716, longitude: 77.5946 });
  const [isGeocoding, setIsGeocoding] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, storesRes, statsRes] = await Promise.all([
        api.get(`/users?sortBy=${userSort}&order=${userOrder}&search=${userSearch}`),
        api.get(`/stores?sortBy=${storeSort}&order=${storeOrder}&search=${storeSearch}`),
        api.get('/stats')
      ]);
      setUsers(usersRes.data);
      setStores(storesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  }, [userSort, userOrder, userSearch, storeSort, storeOrder, storeSearch]);

  useEffect(() => {
    fetchData();
    const socket = io('http://localhost:5000');
    socket.on('new_rating', () => fetchData());
    return () => socket.disconnect();
  }, [fetchData]);

  const handleAddUser = async () => {
    const name = prompt('Name (5-60 chars):');
    if (!name) return;
    const email = prompt('Email:');
    if (!email) return;
    const address = prompt('Address:');
    if (!address) return;
    const role = prompt('Role (admin/user/store_owner):');
    if (!role) return;
    const password = prompt('Password (8-16 chars, Uppercase + Special):');
    if (!password) return;

    try {
      await api.post('/admin/users', { name, email, password, address, role });
      alert('✅ User added!');
      fetchData();
    } catch (err) {
      alert(`❌ Error: ${err.response?.data?.error || "Failed"}`);
    }
  };

  const handleGeocode = async () => {
    if (!storeForm.address) return;
    setIsGeocoding(true);
    try {
      // 1. Try Google Maps Geocoding first (High Accuracy)
      const googleKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      if (googleKey) {
        const googleRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(storeForm.address)}&key=${googleKey}`);
        const googleData = await googleRes.json();
        if (googleData.status === 'OK' && googleData.results[0]) {
          const { lat, lng } = googleData.results[0].geometry.location;
          setStoreForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
          return; // Success!
        }
      }

      // 2. Fallback to OpenStreetMap (Nominatim)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(storeForm.address)}&limit=1`);
      const data = await res.json();
      if (data?.[0]) {
        setStoreForm(prev => ({ ...prev, latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }));
        alert('📍 Point Found (via OpenStreetMap)!');
      } else {
        alert('Location not found. Try a more specific address.');
      }
    } catch (err) {
      console.error(err);
      alert('Geocoding failed');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleReverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      setStoreForm(prev => ({ ...prev, address: data.display_name || prev.address, latitude: lat, longitude: lng }));
    } catch (err) {
      setStoreForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
    }
  };

  const handleSaveStore = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!editingStore;
      const endpoint = isEdit ? `/stores/${editingStore.id}` : '/stores';
      await (isEdit ? api.put(endpoint, storeForm) : api.post(endpoint, storeForm));
      setShowStoreModal(false);
      fetchData();
    } catch (err) {
      alert(`Error saving store`);
    }
  };

  const openAddStoreModal = () => {
    setEditingStore(null);
    setStoreForm({ name: '', email: '', address: '', owner_id: '', latitude: 12.9716, longitude: 77.5946 });
    setShowStoreModal(true);
  };

  const openEditStoreModal = (store) => {
    setEditingStore(store);
    setStoreForm({ name: store.name, email: store.email, address: store.address, owner_id: store.owner_id, latitude: store.latitude || 12.9716, longitude: store.longitude || 77.5946 });
    setShowStoreModal(true);
  };

  const handleUpdatePassword = async () => {
    const currentPassword = prompt('Current Password:');
    if (!currentPassword) return;
    const newPassword = prompt('New Password:');
    if (!newPassword) return;
    const user = JSON.parse(localStorage.getItem('user'));
    try {
      await api.post("/auth/update-password", { userId: user.id, currentPassword, newPassword });
      alert('✅ Updated!');
    } catch (err) {
      alert(`Error: ${err.response?.data?.error}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9fc] dark:bg-slate-950 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-8 hidden lg:flex flex-col sticky top-0 h-screen transition-colors duration-300">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-premium">
            <Shield className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">AdminCenter</span>
        </div>

        <nav className="space-y-2 flex-1">
          <button className="flex items-center gap-3 w-full p-4 bg-primary/5 text-primary font-bold rounded-2xl">
            <ArrowUpRight className="w-5 h-5" /> Overview
          </button>
          <button onClick={handleUpdatePassword} className="flex items-center gap-3 w-full p-4 text-slate-500 hover:bg-slate-50 rounded-2xl">
            <Key className="w-5 h-5" /> Change Password
          </button>
        </nav>

        <div className="mt-auto space-y-4">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-3 w-full p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-100 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              <span className="font-semibold">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          )}
          <button onClick={onLogout} className="flex items-center gap-3 w-full p-4 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-all">
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 lg:p-12 max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Platform Overview</h1>
            <p className="text-slate-500 font-medium">Real-time system health and management</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchData} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleAddUser} className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-2xl font-bold shadow-premium flex items-center gap-2">
              <Plus className="w-5 h-5" /> Create User
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'Total Users', val: stats.total_users, icon: Users, color: 'bg-indigo-50 text-indigo-600' },
            { label: 'Registered Stores', val: stats.total_stores, icon: Store, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Global Ratings', val: stats.total_ratings, icon: Star, color: 'bg-amber-50 text-amber-600' }
          ].map((s, i) => (
            <motion.div key={i} whileHover={{ y: -5 }} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6">
              <div className={`w-14 h-14 ${s.color} rounded-2xl flex items-center justify-center`}>
                <s.icon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                <p className="text-3xl font-black text-slate-900">{s.val}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Analytics Section */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-10 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Leaderboard: Rating Performance
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer>
              <BarChart data={stores.slice(0, 5).map(s => ({ name: s.name, rating: s.average_rating || 0 }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="rating" radius={[10, 10, 0, 0]} barSize={50}>
                  {stores.slice(0, 5).map((e, idx) => <Cell key={idx} fill={idx === 0 ? '#6c5ce7' : '#9f98ff'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg">User Directory</h3>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
              <input
                type="text" placeholder="Search accounts..."
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                value={userSearch} onChange={e => setUserSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-xs font-black uppercase tracking-widest">
                  <th className="px-8 py-5">Full Name</th>
                  <th className="px-8 py-5">Role</th>
                  <th className="px-8 py-5">Location</th>
                  <th className="px-8 py-5">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{u.name}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${u.role === 'admin' ? 'bg-red-50 text-red-600' :
                        u.role === 'store_owner' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm text-slate-500 font-medium truncate max-w-[200px]">{u.address}</td>
                    <td className="px-8 py-6 font-bold text-slate-800">
                      {u.role === 'store_owner' ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {stores.find(s => s.owner_id === u.id)?.average_rating || 0}
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Store Management Table */}
        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <Store className="w-7 h-7 text-emerald-400" /> Managed Assets
              </h3>
              <p className="text-slate-400 text-sm mt-1">Configure and monitor global store locations</p>
            </div>
            <button onClick={openAddStoreModal} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2">
              <Plus className="w-5 h-5" /> New Registry
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stores.map(s => (
              <div key={s.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col hover:border-emerald-500/50 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{s.name}</h4>
                  <button onClick={() => openEditStoreModal(s)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-slate-400">
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
                  <MapPin className="w-4 h-4" /> <span className="truncate">{s.address}</span>
                </div>
                <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[10px] uppercase font-black text-slate-500 mb-1">Impact</p>
                      <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                        <Star className="w-4 h-4 fill-emerald-500" /> {s.average_rating || 0}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-black text-slate-500 mb-1">Volume</p>
                      <p className="font-bold text-slate-300">{s.total_ratings || 0} Reviews</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black text-slate-500 mb-1 tracking-widest">Global Pointer</p>
                    <p className="text-xs font-mono text-emerald-500/70">{s.latitude?.toFixed(2)}, {s.longitude?.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Store Modal */}
      <AnimatePresence>
        {showStoreModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowStoreModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
                  {editingStore ? <Edit3 className="w-6 h-6 text-primary" /> : <Plus className="w-6 h-6 text-emerald-500" />}
                  {editingStore ? 'Update Registry' : 'New Store Entry'}
                </h2>
                <button onClick={() => setShowStoreModal(false)} className="p-2 hover:bg-white rounded-xl shadow-sm transition-all"><X className="w-6 h-6 text-slate-400" /></button>
              </div>

              <form onSubmit={handleSaveStore} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Store Identity</label>
                    <input type="text" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20" value={storeForm.name} onChange={e => setStoreForm({ ...storeForm, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Support Email</label>
                    <input type="email" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20" value={storeForm.email} onChange={e => setStoreForm({ ...storeForm, email: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Physical Address</label>
                  <div className="flex gap-2">
                    <input type="text" required className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20" value={storeForm.address} onChange={e => setStoreForm({ ...storeForm, address: e.target.value })} placeholder="Type street and city..." />
                    <button type="button" onClick={handleGeocode} disabled={isGeocoding} className="px-6 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2">
                      <MapPin className={`w-4 h-4 ${isGeocoding ? 'animate-bounce' : ''}`} /> Resolve
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Point Authorization (Owner ID)</label>
                  <input type="number" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20" value={storeForm.owner_id} onChange={e => setStoreForm({ ...storeForm, owner_id: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Spatial Mapping</label>
                    <p className="text-xs text-slate-400">Click on map or drag pin to refine location</p>
                  </div>
                  <div className="rounded-3xl overflow-hidden border border-slate-100 shadow-inner h-[500px] relative">
                    <GoogleLocationPicker initialPos={[storeForm.latitude, storeForm.longitude]} onLocationSelect={handleReverseGeocode} />
                  </div>
                </div>

                <div className="flex gap-4 pt-4 sticky bottom-0 bg-white">
                  <button type="button" onClick={() => setShowStoreModal(false)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all">Dismiss</button>
                  <button type="submit" className="flex-[2] py-4 bg-primary text-white font-bold rounded-2xl shadow-premium hover:bg-primary-dark transition-all">Confirm Store Data</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminDashboard;