import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Users, Activity, Shirt, BarChart3, Search, Shield, Sparkles, Camera, Trash2, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { toast } from 'react-hot-toast';

import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

const AdminPage = () => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  const [stats, setStats] = useState({
    users: 0,
    analyses: 0,
    popularSeason: 'Loading...',
    todayUploads: 0
  });

  const [recentUsers, setRecentUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Catalog state
  const [catalogItems, setCatalogItems] = useState([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [newItem, setNewItem] = useState({ 
    name: '', brand: '', category: 'Tops', price: '', image: '', 
    seasons: '', colorFamily: 'cool', primaryColor: '#000000', 
    description: '', inStock: true 
  });
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Mock data for charts
  const seasonData = [
    { name: 'Warm Spring', count: 40 },
    { name: 'Light Summer', count: 65 },
    { name: 'Soft Autumn', count: 80 },
    { name: 'Deep Winter', count: 45 },
    { name: 'Cool Summer', count: 55 },
    { name: 'Bright Spring', count: 30 },
  ];

  const uploadData = [
    { date: 'Mon', uploads: 12 },
    { date: 'Tue', uploads: 19 },
    { date: 'Wed', uploads: 15 },
    { date: 'Thu', uploads: 22 },
    { date: 'Fri', uploads: 30 },
    { date: 'Sat', uploads: 45 },
    { date: 'Sun', uploads: 38 },
  ];

  useEffect(() => {
    const fetchAdminData = async () => {
      if (!isAdmin) return;
      setIsLoading(true);
      try {
        // Fetch users from Supabase
        const { data: users, error: usersError, count: usersCount } = await supabase
          .from('users')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(5);

        if (usersError) throw usersError;

        // Fetch analyses count
        const { count: tryonCount, error: tryonError } = await supabase
          .from('analyses')
          .select('*', { count: 'exact', head: true });
        
        // Setup stats (Using some mock data for now until we build out those tables)
        setStats({
          users: usersCount || 0,
          analyses: tryonCount || 0,
          popularSeason: 'Soft Autumn',
          todayUploads: 24
        });

        // Set recent users
        setRecentUsers(users || []);

      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminData();
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === 'catalog') {
      fetchCatalog();
    }
  }, [activeTab]);

  const fetchCatalog = async () => {
    setIsCatalogLoading(true);
    try {
      const { data, error } = await supabase.from('catalog').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCatalogItems(data || []);
    } catch (err) {
      console.error('Error fetching catalog:', err);
      toast.error('Failed to load catalog');
    } finally {
      setIsCatalogLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.category || !newItem.image) {
      toast.error('Please fill in required fields');
      return;
    }
    setIsAddingItem(true);
    
    const formattedItem = {
      ...newItem,
      price: parseFloat(newItem.price) || 0,
      seasons: newItem.seasons ? newItem.seasons.split(',').map(s => s.trim()).filter(Boolean) : []
    };

    try {
      const { data, error } = await supabase.from('catalog').insert([formattedItem]).select();
      if (error) throw error;
      setCatalogItems([data[0], ...catalogItems]);
      setNewItem({ 
        name: '', brand: '', category: 'Tops', price: '', image: '', 
        seasons: '', colorFamily: 'cool', primaryColor: '#000000', 
        description: '', inStock: true 
      });
      toast.success('Item added to catalog');
    } catch (err) {
      console.error('Error adding item:', err);
      toast.error('Failed to add item. Did you update the database schema?');
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const { error } = await supabase.from('catalog').delete().eq('id', id);
      if (error) throw error;
      setCatalogItems(catalogItems.filter(item => item.id !== id));
      toast.success('Item deleted');
    } catch (err) {
      console.error('Error deleting item:', err);
      toast.error('Failed to delete item');
    }
  };

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-bg-secondary pt-16 flex">
      
      {/* Admin Sidebar */}
      <div className="w-64 bg-secondary text-white fixed h-full z-20">
        <div className="p-6 border-b border-white/10">
          <h2 className="font-display font-bold text-xl flex items-center gap-2">
            <Shield size={20} className="text-primary" /> Admin Panel
          </h2>
        </div>
        <nav className="p-4 space-y-2">
          {[
            { id: 'overview', icon: Activity, label: 'Overview' },
            { id: 'catalog', icon: Shirt, label: 'Clothing Catalog' },
            { id: 'users', icon: Users, label: 'Users' },
            { id: 'analytics', icon: BarChart3, label: 'Analytics' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${
                activeTab === tab.id ? 'bg-primary text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64 flex-1 p-8">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold font-display text-secondary capitalize">{activeTab}</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-text-secondary bg-white px-4 py-2 rounded-lg border border-border shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success"></div> System Online
            </span>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Users', value: stats.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-100' },
                { label: 'Total Analyses', value: stats.analyses, icon: Activity, color: 'text-green-500', bg: 'bg-green-100' },
                { label: 'Top Season', value: stats.popularSeason, icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-100' },
                { label: "Today's Uploads", value: stats.todayUploads, icon: Camera, color: 'text-primary', bg: 'bg-primary/10' },
              ].map((stat, i) => (
                <Card key={i} className="p-6 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}>
                    <stat.icon size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary font-medium">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-secondary">{stat.value}</h3>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-bold text-secondary mb-6 border-b border-border pb-4">Recent Users</h3>
                {isLoading ? (
                  <div className="text-center py-4 text-text-muted">Loading users...</div>
                ) : (
                  <div className="space-y-4">
                    {recentUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 hover:bg-bg-tertiary rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-sm">
                            {u.full_name?.charAt(0) || u.email?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-secondary text-sm">{u.full_name || 'Anonymous'}</p>
                            <p className="text-xs text-text-muted">{u.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-text-secondary">{new Date(u.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                    {recentUsers.length === 0 && (
                      <div className="text-center py-4 text-text-muted">No users found.</div>
                    )}
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-bold text-secondary mb-6 border-b border-border pb-4">Activity Trend (Last 7 Days)</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={uploadData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E8F0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9B9BB4' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9B9BB4' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                      <Line type="monotone" dataKey="uploads" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-secondary mb-6 border-b border-border pb-4">Season Distribution</h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seasonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#555770' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9B9BB4' }} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                  <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {activeTab === 'catalog' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-secondary mb-4 border-b border-border pb-4 flex items-center gap-2">
                <Plus size={20} className="text-primary" /> Add New Item
              </h3>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Name *</label>
                    <input type="text" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-bg-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Brand</label>
                    <input type="text" value={newItem.brand} onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-bg-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Category *</label>
                    <select value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-bg-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                      <option value="Tops">Tops</option>
                      <option value="Bottoms">Bottoms</option>
                      <option value="Dresses">Dresses</option>
                      <option value="Outerwear">Outerwear</option>
                      <option value="Accessories">Accessories</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Price</label>
                    <input type="number" step="0.01" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-bg-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Color Family</label>
                    <select value={newItem.colorFamily} onChange={(e) => setNewItem({ ...newItem, colorFamily: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-bg-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                      <option value="cool">Cool</option>
                      <option value="warm">Warm</option>
                      <option value="neutral">Neutral</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Primary Color</label>
                    <div className="flex gap-2">
                      <input type="color" value={newItem.primaryColor} onChange={(e) => setNewItem({ ...newItem, primaryColor: e.target.value })} className="h-[50px] w-[50px] rounded-xl cursor-pointer border-0 p-0" />
                      <input type="text" value={newItem.primaryColor} onChange={(e) => setNewItem({ ...newItem, primaryColor: e.target.value })} className="flex-1 w-full p-3 rounded-xl border border-border bg-bg-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-text-secondary">Image URL *</label>
                    <input type="text" value={newItem.image} onChange={(e) => setNewItem({ ...newItem, image: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-bg-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Seasons (comma separated)</label>
                    <input type="text" value={newItem.seasons} onChange={(e) => setNewItem({ ...newItem, seasons: e.target.value })} placeholder="e.g. Soft Autumn, Deep Winter" className="w-full p-3 rounded-xl border border-border bg-bg-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                  <div className="space-y-2 md:col-span-3">
                    <label className="text-sm font-medium text-text-secondary">Description</label>
                    <textarea value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-bg-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" rows="2" />
                  </div>
                  <div className="flex items-center gap-2 md:col-span-3">
                    <input type="checkbox" id="inStock" checked={newItem.inStock} onChange={(e) => setNewItem({ ...newItem, inStock: e.target.checked })} className="w-5 h-5 rounded text-primary border-border focus:ring-primary/20" />
                    <label htmlFor="inStock" className="text-sm font-medium text-text-secondary">In Stock</label>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isAddingItem} className="px-8 h-[50px]">
                    {isAddingItem ? 'Adding...' : 'Add Item'}
                  </Button>
                </div>
              </form>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-secondary mb-6 border-b border-border pb-4 flex items-center justify-between">
                <span>Inventory ({catalogItems.length})</span>
                {isCatalogLoading && <span className="text-sm font-normal text-text-muted">Loading...</span>}
              </h3>
              
              {catalogItems.length === 0 && !isCatalogLoading ? (
                <div className="text-center py-8 text-text-muted">No items in catalog yet.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {catalogItems.map(item => (
                    <div key={item.id} className="group border border-border rounded-xl overflow-hidden bg-bg-primary relative hover:shadow-md transition-shadow">
                      <div className="aspect-[3/4] bg-bg-secondary w-full relative">
                        <img src={item.image || item.image_url} alt={item.name || item.title} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/300x400?text=Error'; }} />
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
                          title="Delete item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-text-muted uppercase tracking-wider mb-1">{item.category}</p>
                        <h4 className="font-medium text-secondary text-sm truncate">{item.name || item.title}</h4>
                        {item.price && <p className="text-sm font-bold mt-1">${item.price}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'users' && (
          <Card className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-bg-tertiary rounded-full flex items-center justify-center mb-4 text-text-muted">
              <Users size={32} />
            </div>
            <h3 className="text-xl font-bold text-secondary mb-2">User Management</h3>
            <p className="text-text-secondary max-w-md">This module is under construction. We will add forms here to manage users.</p>
          </Card>
        )}

      </div>
    </div>
  );
};

export default AdminPage;
