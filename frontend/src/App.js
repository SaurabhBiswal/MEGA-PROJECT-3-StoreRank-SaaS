import React, { useState, useEffect } from "react";
import "./App.css";
import AdminDashboard from './components/AdminDashboard';
import OwnerDashboard from './components/OwnerDashboard';
import UserDashboard from './components/UserDashboard';
import api from "./api"; // Import new API utility

import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, MapPin, ArrowRight, UserPlus, LogIn, Store } from 'lucide-react';

function LoginForm({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    address: "",
    role: "user"
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!isLogin) {
      if (formData.name.length < 5 || formData.name.length > 60) {
        newErrors.name = "Name must be 5-60 characters";
      }
      if (formData.address.length > 400) {
        newErrors.address = "Address too long (max 400 chars)";
      }
    }
    if (!formData.email.includes("@")) {
      newErrors.email = "Valid email required";
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,16}$/;
    if (!passwordRegex.test(formData.password)) {
      newErrors.password = "8-16 chars, 1 uppercase, 1 special character";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const endpoint = isLogin ? "login" : "register";
      const response = await api.post(`/${endpoint}`, formData);
      const data = response.data;

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("lastLogin", new Date().toISOString());

      onLogin(data.user);
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Connection failed";
      setErrors({ server: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] dark:bg-slate-950 flex items-center justify-center p-4 selection:bg-primary/20 relative overflow-hidden transition-colors duration-300">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent-info/10 rounded-full blur-[120px] animate-pulse-slow" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="glass-card rounded-[2.5rem] p-10 border border-white/50 relative z-10 shadow-premium">
          <div className="flex flex-col items-center mb-10">
            <motion.div
              whileHover={{ rotate: 0, scale: 1.05 }}
              initial={{ rotate: 3 }}
              className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mb-6 shadow-premium cursor-pointer transition-all duration-500"
            >
              <Store className="text-white w-10 h-10" />
            </motion.div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-slate-500 mt-3 text-center text-sm leading-relaxed">
              {isLogin
                ? "Experience the next level of store management"
                : "Join the most premium rating ecosystem today"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-5 overflow-hidden"
                >
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Full Name (Min 5 chars)"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-700 placeholder:text-slate-400"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    {errors.name && <p className="text-[10px] text-red-500 mt-1 ml-3 font-medium uppercase tracking-wider">{errors.name}</p>}
                  </div>

                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Your Address"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-700 placeholder:text-slate-400"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                    {['user', 'store_owner'].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setFormData({ ...formData, role })}
                        className={`py-2.5 text-xs font-bold rounded-xl transition-all uppercase tracking-widest ${formData.role === role
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        {role === 'user' ? 'Customer' : 'Owner'}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-700 placeholder:text-slate-400"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              {errors.email && <p className="text-[10px] text-red-500 mt-1 ml-3 font-medium uppercase tracking-wider">{errors.email}</p>}
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
              <input
                type="password"
                placeholder="Secure Password"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-700 placeholder:text-slate-400"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              {errors.password && <p className="text-[10px] text-red-500 mt-1 ml-3 font-medium uppercase tracking-wider">{errors.password}</p>}
            </div>

            {errors.server && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-[11px] font-medium flex items-center gap-3"
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                {errors.server}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-dark text-white py-4.5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-premium active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group h-14"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="uppercase tracking-widest text-sm">{isLogin ? "Sign In" : "Get Started"}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100/50">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-slate-500 hover:text-primary transition-colors text-sm flex items-center justify-center gap-2 w-full group py-2"
            >
              {isLogin ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Don't have an account? <span className="font-bold border-b-2 border-transparent group-hover:border-primary transition-all">Join the Elite</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Already a member? <span className="font-bold border-b-2 border-transparent group-hover:border-primary transition-all">Sign In</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const dashboardProps = {
    onLogout: handleLogout,
    theme,
    onToggleTheme: toggleTheme,
  };

  switch (user.role) {
    case "admin":
      return <AdminDashboard {...dashboardProps} />;
    case "store_owner":
      return <OwnerDashboard {...dashboardProps} />;
    default:
      return <UserDashboard {...dashboardProps} />;
  }
}

export default App;