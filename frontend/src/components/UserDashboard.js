import React, { useState, useEffect, useCallback } from 'react';
import StoreMap from './StoreMap';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Star, MapPin, Navigation, LogOut, Key,
  Filter, SortAsc, Store as StoreIcon,
  MessageSquare, Locate, X, ArrowRight, Moon, Sun
} from 'lucide-react';

const UserDashboard = ({ onLogout, theme = 'light', onToggleTheme }) => {
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState('');
  const [userRatings, setUserRatings] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [geolocationError, setGeolocationError] = useState('');
  const [activeStore, setActiveStore] = useState(null);

  const user = JSON.parse(localStorage.getItem('user'));

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      const userId = user?.id || -1;
      const apiSortBy = sortBy === 'nearest' ? 'name' : sortBy;
      const response = await api.get(`/stores?sortBy=${apiSortBy}&order=${sortOrder}&userId=${userId}`);
      setStores(response.data);
    } catch (error) {
      console.error("Fetch stores error:", error);
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, user?.id]);

  const fetchUserRatings = useCallback(async () => {
    try {
      const response = await api.get(`/user-ratings/${user.id}`);
      const data = response.data;
      const ratingsMap = {};
      const commentsMap = {};
      data.forEach(r => {
        ratingsMap[r.store_id] = r.rating;
        if (r.comment) commentsMap[r.store_id] = r.comment;
      });
      setUserRatings(ratingsMap);
      setCommentInputs(commentsMap);
    } catch (error) {
      console.error("Fetch ratings error:", error);
    }
  }, [user.id]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => setGeolocationError("Enable GPS for distance data")
      );
    }
    fetchStores();
    if (user?.id) fetchUserRatings();
  }, [fetchStores, fetchUserRatings]);

  const handleRateStore = async (storeId) => {
    if (!user) return;
    const rating = userRatings[storeId];
    const comment = commentInputs[storeId] || "";

    if (!rating) return alert("Select a star rating first");

    try {
      await api.post("/ratings", {
        user_id: user.id,
        store_id: storeId,
        rating: rating,
        comment: comment
      });
      alert("✅ Review submitted!");
      fetchStores();
    } catch (error) {
      alert("Failed to submit rating");
    }
  };

  const handleUpdatePassword = async () => {
    const currentPassword = prompt('Current Password:');
    if (!currentPassword) return;
    const newPassword = prompt('New Password:');
    if (!newPassword) return;
    try {
      await api.post("/auth/update-password", { userId: user.id, currentPassword, newPassword });
      alert('✅ Password updated!');
    } catch (error) {
      alert(`❌ Error: ${error.response?.data?.error || "Failed"}`);
    }
  };

  const processedStores = stores.map(store => ({
    ...store,
    distance: userLocation ? calculateDistance(userLocation.latitude, userLocation.longitude, store.latitude, store.longitude) : null
  }));

  const visibleStores = processedStores.filter(store =>
    store.name.toLowerCase().includes(search.toLowerCase()) ||
    store.address.toLowerCase().includes(search.toLowerCase())
  );

  if (sortBy === 'nearest' && userLocation) {
    visibleStores.sort((a, b) => (a.distance || 999) - (b.distance || 999));
  }

  const StarRating = ({ rating, editable, onRate }) => {
    const [hover, setHover] = useState(0);
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            disabled={!editable}
            onClick={() => onRate(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform active:scale-90"
          >
            <Star
              className={`w-6 h-6 ${star <= (hover || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`}
              strokeWidth={star <= (hover || rating) ? 0 : 2}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9fc] dark:bg-slate-950 transition-colors duration-300">
      {/* Premium Sidebar */}
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-8 hidden lg:flex flex-col sticky top-0 h-screen transition-colors duration-300">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-premium">
            <StoreIcon className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">StoreRank</span>
        </div>

        <nav className="space-y-2 flex-1">
          <button className="flex items-center gap-3 w-full p-4 bg-primary/5 text-primary font-bold rounded-2xl transition-all">
            <Filter className="w-5 h-5" /> All Stores
          </button>
          <button onClick={handleUpdatePassword} className="flex items-center gap-3 w-full p-4 text-slate-500 hover:bg-slate-50 rounded-2xl transition-all">
            <Key className="w-5 h-5" /> Security
          </button>
        </nav>

        <div className="mt-auto pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-3 w-full p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-100 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              <span className="font-semibold">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          )}
          <div className="flex items-center gap-3 mb-6 p-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-primary">
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role}</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-3 w-full p-4 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-all">
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-12 max-w-7xl mx-auto">
        {/* Sticky Utility Header */}
        <header className="flex flex-col md:flex-row gap-6 items-center justify-between mb-12 bg-white/50 dark:bg-slate-900/70 backdrop-blur-xl p-6 rounded-[2rem] border border-white/50 dark:border-slate-800 sticky top-4 z-40 shadow-premium transition-colors duration-300">
          <div className="relative flex-1 w-full max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
            <input
              type="text"
              placeholder="Search stores or cities..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-4 items-center">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent px-4 py-2 text-sm font-bold text-slate-600 outline-none"
              >
                <option value="name">Name</option>
                <option value="rating">Rating</option>
                <option value="nearest">Distance</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-primary"
              >
                <SortAsc className={`w-5 h-5 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        {/* Geolocation Notice */}
        {geolocationError && (
          <div className="mb-8 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center gap-3 text-orange-700 text-sm font-medium animate-pulse">
            <Navigation className="w-5 h-5" />
            {geolocationError}
          </div>
        )}

        {/* Stores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          <AnimatePresence>
            {loading ? (
              [1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-96 bg-slate-100 rounded-[2rem] animate-pulse" />
              ))
            ) : (
              visibleStores.map((store, idx) => (
                <motion.div
                  key={store.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-white rounded-[2rem] border border-slate-100 overflow-hidden hover:shadow-premium transition-all duration-500 relative flex flex-col h-full"
                >
                  <div className="h-40 bg-gradient-to-br from-primary/10 to-accent-info/10 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 filter grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100">
                      <StoreIcon className="w-full h-full p-8 text-primary/20" />
                    </div>
                    {store.distance && (
                      <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl text-[11px] font-bold text-primary shadow-sm">
                        <Locate className="w-3 h-3" /> {store.distance} km
                      </div>
                    )}
                  </div>

                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-slate-800">{store.name}</h3>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 rounded-lg">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-bold text-yellow-700">{store.average_rating}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-slate-400 text-sm mb-6">
                      <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                      <p className="line-clamp-2">{store.address}</p>
                    </div>

                    <div className="mt-auto space-y-6">
                      <div className="pt-6 border-t border-slate-50">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3">Your Experience</p>
                        <StarRating
                          rating={userRatings[store.id] || store.my_rating || 0}
                          editable={true}
                          onRate={(r) => setUserRatings({ ...userRatings, [store.id]: r })}
                        />
                      </div>

                      <div className="relative">
                        <textarea
                          placeholder="What did you love about this place?"
                          className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm text-slate-600 focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px] resize-none"
                          value={commentInputs[store.id] || ""}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [store.id]: e.target.value })}
                        />
                        <MessageSquare className="absolute right-4 bottom-4 w-4 h-4 text-slate-200" />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleRateStore(store.id)}
                          className="flex-1 bg-primary text-white font-bold py-3.5 rounded-2xl shadow-premium hover:bg-primary-dark transition-all flex items-center justify-center gap-2 group/btn"
                        >
                          Submit <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                        {store.latitude && (
                          <button
                            onClick={() => { setActiveStore(store); setShowMapModal(true); }}
                            className="p-3.5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
                          >
                            <Navigation className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {!loading && visibleStores.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">No stores found</h3>
            <p className="text-slate-400 mt-2 mb-8">Try adjusting your search or filters</p>
            <button onClick={() => setSearch('')} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all">
              Clear All Filters
            </button>
          </motion.div>
        )}
      </main>

      {/* Map Modal */}
      <AnimatePresence>
        {showMapModal && activeStore && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMapModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-4xl h-[80vh] rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{activeStore.name}</h2>
                  <p className="text-slate-400 text-sm mt-1 flex items-center gap-1.5 font-medium"><MapPin className="w-4 h-4" /> {activeStore.address}</p>
                </div>
                <button onClick={() => setShowMapModal(false)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <div className="flex-1 relative">
                <StoreMap stores={[activeStore]} activeStore={activeStore} onMarkerClick={(store) => setActiveStore(store)} />
              </div>
              {activeStore.distance && (
                <div className="p-6 bg-slate-50 text-center text-sm font-bold text-primary flex items-center justify-center gap-2">
                  <Navigation className="w-4 h-4" /> This store is {activeStore.distance} km away from your location
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserDashboard;