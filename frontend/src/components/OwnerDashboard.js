import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { io } from 'socket.io-client';
import LocationPicker from './LocationPicker';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Star, TrendingUp, Users, Download,
  Mail, Heart, Settings, LogOut, Key,
  MapPin, X,
  Navigation, Moon, Sun, FileText
} from 'lucide-react';

const OwnerDashboard = ({ onLogout, theme = 'light', onToggleTheme }) => {
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [, setError] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: '', email: '', address: '', latitude: 12.9716, longitude: 77.5946 });

  const user = JSON.parse(localStorage.getItem('user'));

  const fetchOwnerData = useCallback(async () => {
    setLoading(true);
    try {
      const storesRes = await api.get("/stores");
      const myStores = storesRes.data.filter(s => s.owner_id === user.id);
      if (myStores.length > 0) {
        setStores(myStores);
        if (!selectedStoreId) setSelectedStoreId(myStores[0].id);
      }
      const ratingsRes = await api.get(`/store-owner/${user.id}/ratings`);
      setRatings(ratingsRes.data);
    } catch (err) {
      setError("Load failed");
    } finally {
      setLoading(false);
    }
  }, [user.id, selectedStoreId]);

  useEffect(() => {
    if (user?.id) {
      fetchOwnerData();
      const socket = io('http://localhost:5000');
      socket.on('new_rating', () => fetchOwnerData());
      return () => socket.disconnect();
    }
  }, [user?.id, fetchOwnerData]);

  const handleGeocode = async () => {
    if (!storeForm.address) return;
    setIsGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(storeForm.address)}&limit=1`);
      const data = await res.json();
      if (data?.[0]) {
        setStoreForm(prev => ({ ...prev, latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }));
        alert("Pin Updated!");
      }
    } catch (err) {
      alert("Search failed");
    } finally { setIsGeocoding(false); }
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
      await api.put(`/stores/${selectedStoreId}`, storeForm);
      setShowStoreModal(false);
      fetchOwnerData();
      alert("Store Updated!");
    } catch (err) { alert("Save failed"); }
  };

  const handleUpdatePassword = async () => {
    const currentPassword = prompt('Current Password:');
    if (!currentPassword) return;
    const newPassword = prompt('New Password:');
    if (!newPassword) return;
    try {
      await api.post("/auth/update-password", { userId: user.id, currentPassword, newPassword });
      alert('✅ Updated!');
    } catch (err) { alert(`Error: ${err.response?.data?.error}`); }
  };

  const handleExportCSV = () => {
    if (ratings.length === 0) return;
    let csv = "Date,User,Rating,Comment\n";
    ratings.forEach(r => {
      csv += `${new Date(r.created_at).toLocaleDateString()},"${r.user_name}",${r.rating},"${(r.comment || "").replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ratings.csv';
    a.click();
  };

  const handleExportPDF = async () => {
    try {
      const response = await api.get(`/store-owner/${user.id}/ratings-pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ratings.pdf';
      a.click();
    } catch (err) {
      alert('Failed to export PDF');
    }
  };

  const currentStore = stores.find(s => s.id === parseInt(selectedStoreId));
  const activeRatings = ratings.filter(r => r.store_id === parseInt(selectedStoreId));
  const displayRatings = activeRatings.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'positive') return r.rating >= 4;
    if (filter === 'negative') return r.rating <= 2;
    return r.rating === 3;
  });

  if (loading && stores.length === 0) return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 animate-pulse text-slate-400 font-bold uppercase tracking-widest text-sm">Initializing Merchant Hub...</div>;

  if (stores.length === 0) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="glass-card p-12 text-center max-w-lg rounded-[2.5rem]">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Store className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-4">No Merchant Data</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">It looks like no stores are assigned to your ID ({user.id}). Please contact system admin for activation.</p>
        <button onClick={onLogout} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 tracking-widest uppercase text-xs">Logout</button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f8f9fc] dark:bg-slate-950 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-8 hidden lg:flex flex-col sticky top-0 h-screen transition-colors duration-300">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-premium transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">
            <Store className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800 italic">MerchantHub</span>
        </div>

        <nav className="space-y-2 flex-1">
          <button className="flex items-center gap-3 w-full p-4 bg-primary text-white font-bold rounded-2xl shadow-premium">
            <TrendingUp className="w-5 h-5" /> Analytics
          </button>
          <button onClick={handleUpdatePassword} className="flex items-center gap-3 w-full p-4 text-slate-500 hover:bg-slate-50 rounded-2xl transition-all">
            <Key className="w-5 h-5" /> Security
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
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-3 uppercase italic">Market Performance</h1>
            <p className="text-slate-500 font-medium">Business insights for <span className="text-primary font-bold underline underline-offset-4 decoration-primary/30">{currentStore?.name}</span></p>
          </div>

          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100 gap-2">
            {stores.length > 1 && (
              <select
                className="bg-transparent px-4 py-2 font-black text-xs uppercase tracking-widest text-slate-500 outline-none border-r border-slate-100 mr-1"
                value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)}
              >
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        {currentStore && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm col-span-1 lg:col-span-2 overflow-hidden relative group">
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Sentiment Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-slate-900">{currentStore.average_rating}</span>
                  <span className="text-slate-400 font-bold text-lg">/ 5.0</span>
                </div>
                <div className="flex gap-1 mt-6">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-5 h-5 ${i <= Math.round(currentStore.average_rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-100'}`} />)}
                </div>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                <Star className="w-64 h-64 text-slate-900 fill-slate-900 transform rotate-12" />
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl col-span-1 lg:col-span-2 text-white">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-8">Growth Trajectory</p>
              <div className="h-24 w-full">
                <ResponsiveContainer>
                  <AreaChart data={activeRatings.slice(0, 7).reverse().map((r, i) => ({ n: i, r: r.rating }))}>
                    <defs>
                      <linearGradient id="ownerRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="r" stroke="#10b981" fillOpacity={1} fill="url(#ownerRate)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between items-center mt-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Total Reviews</p>
                  <p className="text-2xl font-black">{currentStore.total_ratings}</p>
                </div>
                <button onClick={() => setShowStoreModal(true)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all border border-white/5">
                  <Settings className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ratings Control Panel */}
        <section className="space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight">Customer Feed</h3>
            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
              {['all', 'positive', 'negative'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {displayRatings.map((r, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                key={r.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 hover:shadow-premium transition-all relative flex flex-col group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center font-black text-primary border border-slate-100 text-xs">{(r.user_name || 'A').charAt(0)}</div>
                    <div>
                      <p className="font-bold text-slate-800 leading-tight">{r.user_name || 'Anonymous'}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-black">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> {r.rating}
                  </div>
                </div>

                <p className="text-slate-500 text-sm leading-relaxed font-medium italic mb-8 flex-1">"{r.comment || 'No written feedback provided.'}"</p>

                <div className="flex gap-3 pt-6 border-t border-slate-50">
                  <button
                    onClick={() => window.open(`mailto:${r.user_email}?subject=Feedback Response`)}
                    className="flex-1 py-3 bg-slate-900 border border-slate-200 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Mail className="w-3.5 h-3.5" /> Direct Reply
                  </button>
                  <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-primary transition-all">
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showStoreModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowStoreModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden">
              <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Store Config</h2>
                <button onClick={() => setShowStoreModal(false)} className="p-3 bg-white hover:bg-slate-100 rounded-2xl shadow-sm transition-all"><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              <form onSubmit={handleSaveStore} className="p-10 space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Brand Name</label>
                  <input type="text" required value={storeForm.name} onChange={e => setStoreForm({ ...storeForm, name: e.target.value })} className="w-full p-4.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-700" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Digital Coordinates (Address)</label>
                  <div className="flex gap-2">
                    <input type="text" required value={storeForm.address} onChange={e => setStoreForm({ ...storeForm, address: e.target.value })} className="flex-1 p-4.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
                    <button type="button" onClick={handleGeocode} disabled={isGeocoding} className="px-6 bg-slate-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest flex items-center gap-2"><Navigation className="w-4 h-4" /> Map</button>
                  </div>
                </div>
                <div className="h-64 rounded-3xl overflow-hidden shadow-inner border border-slate-100">
                  <LocationPicker initialPos={[storeForm.latitude, storeForm.longitude]} onLocationSelect={handleReverseGeocode} />
                </div>
                <button type="submit" className="w-full py-5 bg-primary text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-premium hover:bg-primary-dark transition-all transform active:scale-[0.98]">Push Live Updates</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OwnerDashboard;