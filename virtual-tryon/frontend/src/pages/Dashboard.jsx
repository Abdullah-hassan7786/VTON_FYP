import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Camera, Search, Heart, Clock, ArrowRight, Activity, User, Sparkles } from 'lucide-react';
import Card from '../components/ui/Card';
import SeasonBadge from '../components/analysis/SeasonBadge';
import SkeletonLoader from '../components/ui/SkeletonLoader';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentAnalysis, setRecentAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentData = async () => {
      if (!user) return;
      try {
        // Updated to use Supabase instead of Firebase
        // Note: You will need to create an 'analyses' table in Supabase.
        const { data, error } = await supabase
          .from('analyses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (data && data.length > 0) {
          setRecentAnalysis(data[0]);
        }
      } catch (error) {
        console.error("Error fetching recent analysis:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentData();
  }, [user]);

  const quickActions = [
    {
      title: 'Analyze Photo',
      desc: 'Discover your perfect colors',
      icon: <Camera size={24} className="text-primary" />,
      bg: 'bg-primary/10',
      path: '/upload'
    },
    {
      title: 'Browse Catalog',
      desc: 'Find clothes that match you',
      icon: <Search size={24} className="text-blue-500" />,
      bg: 'bg-blue-100',
      path: '/catalog'
    },
    {
      title: 'Virtual Try-On',
      desc: 'See how outfits look on you',
      icon: <Heart size={24} className="text-pink-500" />,
      bg: 'bg-pink-100',
      path: '/try-on'
    },
    {
      title: 'My History',
      desc: 'View saved looks & analyses',
      icon: <Clock size={24} className="text-purple-500" />,
      bg: 'bg-purple-100',
      path: '/history'
    }
  ];

  return (
    <div className="min-h-screen bg-bg-secondary pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Welcome Banner */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold font-display text-secondary mb-2">
            Good morning, {(user?.user_metadata?.display_name || 'User').split(' ')[0]} 👋
          </h1>
          <p className="text-text-secondary text-lg">Ready to discover your perfect palette?</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions Grid */}
            <div>
              <h2 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                <Activity size={20} className="text-primary" /> Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickActions.map((action, idx) => (
                  <Card key={idx} hover className="cursor-pointer group" onClick={() => navigate(action.path)}>
                    <div className="p-6 flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${action.bg} group-hover:scale-110 transition-transform`}>
                        {action.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-secondary mb-1 flex items-center justify-between">
                          {action.title}
                          <ArrowRight size={16} className="text-text-muted group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0" />
                        </h3>
                        <p className="text-sm text-text-secondary">{action.desc}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recent Analysis Preview */}
            <div>
              <h2 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                <Clock size={20} className="text-primary" /> Latest Analysis
              </h2>
              
              {loading ? (
                <Card className="p-6">
                  <div className="flex gap-6 items-center">
                    <SkeletonLoader variant="circle" className="w-20 h-20" />
                    <div className="flex-1">
                      <SkeletonLoader variant="text" className="mb-2" />
                      <SkeletonLoader variant="text" className="w-1/2" />
                    </div>
                  </div>
                </Card>
              ) : recentAnalysis ? (
                <Card className="overflow-hidden border-primary/20 shadow-md shadow-primary/5">
                  <div className="p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-10"></div>
                    
                    {recentAnalysis.croppedImageBase64 ? (
                       <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md shrink-0">
                         <img src={`data:image/jpeg;base64,${recentAnalysis.croppedImageBase64}`} alt="Face" className="w-full h-full object-cover" />
                       </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-bg-tertiary flex items-center justify-center border-4 border-white shadow-md shrink-0">
                        <Camera size={32} className="text-text-muted" />
                      </div>
                    )}
                    
                    <div className="flex-1 text-center sm:text-left w-full">
                      <p className="text-xs text-text-muted font-medium mb-1 uppercase tracking-wider">Your Season</p>
                      <h3 className="text-2xl font-bold font-display text-secondary mb-2">{recentAnalysis.season}</h3>
                      <SeasonBadge season={recentAnalysis.season} className="mb-4" />
                      
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
                        {recentAnalysis.colorsToSuggest?.slice(0, 5).map((color, i) => (
                          <div 
                            key={i} 
                            className="w-8 h-8 rounded-full border border-black/10 shadow-sm"
                            style={{ backgroundColor: color.hex_code }}
                            title={color.name}
                          />
                        ))}
                      </div>
                      
                      <button 
                        onClick={() => navigate('/analysis', { state: { analysisData: recentAnalysis, fromHistory: true } })}
                        className="text-sm font-medium text-primary hover:text-primary-dark transition-colors flex items-center justify-center sm:justify-start gap-1 w-full sm:w-auto"
                      >
                        View Full Analysis <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="bg-gradient-to-br from-primary to-orange-400 border-none shadow-xl shadow-primary/20 text-white">
                  <div className="p-8 text-center sm:text-left flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                    
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shrink-0 shadow-inner">
                      <Sparkles size={32} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold font-display mb-2">Find Your Colors</h3>
                      <p className="text-white/80 mb-4 max-w-md">You haven't done an analysis yet. Upload a photo to discover your perfect color season.</p>
                      <button 
                        onClick={() => navigate('/upload')}
                        className="bg-white text-primary px-6 py-2 rounded-full font-medium hover:bg-bg-tertiary transition-colors shadow-lg"
                      >
                        Start Analysis
                      </button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
          
          {/* Right Sidebar - Stats & Activity */}
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-sm font-bold text-secondary uppercase tracking-wider mb-4 border-b border-border pb-2">Your Style Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary flex items-center gap-2"><Camera size={16} /> Analyses</span>
                    <span className="font-bold text-secondary">{recentAnalysis ? '1' : '0'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary flex items-center gap-2"><Heart size={16} /> Saved Items</span>
                    <span className="font-bold text-secondary">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary flex items-center gap-2"><Search size={16} /> Try-Ons</span>
                    <span className="font-bold text-secondary">0</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-sm font-bold text-secondary uppercase tracking-wider mb-4 border-b border-border pb-2">Recent Activity</h3>
                <div className="space-y-4">
                  {recentAnalysis ? (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-secondary">Completed Style Analysis</p>
                        <p className="text-xs text-text-muted mt-1">
                          {new Date(recentAnalysis.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ) : (
                     <p className="text-sm text-text-muted italic">No recent activity.</p>
                  )}
                  <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                        <User size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-secondary">Joined Rizz-Up</p>
                        <p className="text-xs text-text-muted mt-1">
                           {new Date(user?.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
