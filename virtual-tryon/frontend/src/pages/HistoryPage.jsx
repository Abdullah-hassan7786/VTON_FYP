import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Clock, Heart, Trash2, ArrowRight, Sparkles, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SeasonBadge from '../components/analysis/SeasonBadge';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import { useAppContext } from '../context/AppContext';

const HistoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analyses'); // 'analyses', 'looks', 'wishlist'
  
  const [analyses, setAnalyses] = useState([]);
  const [looks, setLooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { state: appState, removeSavedLook } = useAppContext();

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      setIsLoading(true);
      // Avoid calling Supabase with a non-UUID user id (e.g. dev/mock id like "mock_ali_123")
      const isUuid = (id) => {
        if (!id || typeof id !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      };

      if (!isUuid(user.id)) {
        console.warn('Skipping history fetch: user.id is not a UUID:', user.id);
        setAnalyses([]);
        setLooks([]);
        setIsLoading(false);
        return;
      }
      
      try {
        // Fetch Analyses from Supabase
        const { data: analysisData, error: analysisError } = await supabase
          .from('analyses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (analysisError) throw analysisError;

        // Map Supabase snake_case fields to camelCase for UI compatibility
        const mappedAnalyses = (analysisData || []).map(row => ({
          id: row.id,
          season: row.season,
          characteristics: row.characteristics,
          colorsToSuggest: row.colors_to_suggest,
          reasonToSuggest: row.reason_to_suggest,
          colorsToAvoid: row.colors_to_avoid,
          reasonToAvoid: row.reason_to_avoid,
          content: row.content,
          croppedImageBase64: row.cropped_image_base64,
          createdAt: row.created_at,
        }));
        setAnalyses(mappedAnalyses);

        // Fetch Saved Looks from Supabase
        const { data: looksData, error: looksError } = await supabase
          .from('saved_looks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        let mappedLooks = [];
        if (looksError) {
          // Table might not exist yet, that's okay
          console.warn("Could not fetch saved looks:", looksError.message);
          mappedLooks = [];
        } else {
          mappedLooks = (looksData || []).map(row => ({
            id: row.id,
            clothingName: row.clothing_name,
            clothingImage: row.clothing_image,
            userImageUrl: row.user_image_url,
            generatedTryonUrl: row.generated_tryon_url,
            scale: row.scale,
            createdAt: row.created_at,
            source: 'saved_look',
          }));
        }

        // Fetch Try-On history (from your provided `tryon_history` table)
        const { data: tryonData, error: tryonError } = await supabase
          .from('tryon_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (tryonError) {
          console.warn('Could not fetch tryon history:', tryonError.message);
        } else {
          const mappedTryon = (tryonData || []).map(row => ({
            id: row.id,
            clothingId: row.clothing_id,
            clothingName: row.clothing_id || 'Try-on',
            clothingImage: null,
            userImageUrl: row.user_image_url,
            generatedTryonUrl: row.result_image_url,
            createdAt: row.created_at,
            source: 'tryon_history',
          }));

          // Merge saved looks with tryon history (tryon items first)
          mappedLooks = [...mappedTryon, ...mappedLooks];
        }

        setLooks(mappedLooks);

      } catch (error) {
        console.error("Error fetching history:", error);
        toast.error("Failed to load your history.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const handleDeleteAnalysis = async (id) => {
    if (window.confirm("Are you sure you want to delete this analysis?")) {
      try {
        const { error } = await supabase
          .from('analyses')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setAnalyses(analyses.filter(a => a.id !== id));
        toast.success("Analysis deleted.");
      } catch (error) {
        console.error(error);
        toast.error("Failed to delete analysis.");
      }
    }
  };

  const handleDeleteLook = async (id) => {
    if (!window.confirm("Are you sure you want to delete this look?")) return;

    const item = looks.find(l => l.id === id);
    if (!item) return;

    try {
      if (item.source === 'tryon_history') {
        const { error } = await supabase
          .from('tryon_history')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_looks')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }

      setLooks(looks.filter(l => l.id !== id));
      toast.success("Look deleted.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete look.");
    }
  };

  return (
    <div className="min-h-screen bg-bg-secondary pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-bold font-display text-secondary mb-2">My History</h1>
          <p className="text-text-secondary">View your past analyses and saved outfits.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-8 overflow-x-auto hide-scrollbar">
          <button 
            className={`px-6 py-4 font-medium whitespace-nowrap transition-colors relative ${activeTab === 'analyses' ? 'text-primary' : 'text-text-secondary hover:text-secondary'}`}
            onClick={() => setActiveTab('analyses')}
          >
            Skin Tone Analyses
            {activeTab === 'analyses' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></div>}
          </button>
          <button 
            className={`px-6 py-4 font-medium whitespace-nowrap transition-colors relative ${activeTab === 'looks' ? 'text-primary' : 'text-text-secondary hover:text-secondary'}`}
            onClick={() => setActiveTab('looks')}
          >
            Saved Looks
            {activeTab === 'looks' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></div>}
          </button>
          <button 
            className={`px-6 py-4 font-medium whitespace-nowrap transition-colors relative ${activeTab === 'wishlist' ? 'text-primary' : 'text-text-secondary hover:text-secondary'}`}
            onClick={() => setActiveTab('wishlist')}
          >
            Wishlist
            {activeTab === 'wishlist' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></div>}
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="p-6">
                  <div className="flex gap-4">
                    <SkeletonLoader variant="card" className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-xl" />
                    <div className="flex-1">
                      <SkeletonLoader variant="text" className="mb-4 w-1/3" />
                      <SkeletonLoader variant="text" className="w-full mb-2" />
                      <SkeletonLoader variant="text" className="w-2/3" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {activeTab === 'analyses' && (
                analyses.length > 0 ? (
                  analyses.map((analysis) => (
                    <Card key={analysis.id} className="p-6">
                      <div className="flex flex-col sm:flex-row gap-6">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden shrink-0 border border-border shadow-sm">
                          {analysis.croppedImageBase64 ? (
                            <img src={`data:image/jpeg;base64,${analysis.croppedImageBase64}`} alt="Analysis" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-bg-tertiary flex items-center justify-center">
                              <span className="text-4xl">🎨</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-xs text-text-muted font-medium mb-1">
                                <Clock size={12} className="inline mr-1" />
                                {new Date(analysis.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                              <h3 className="text-xl font-bold font-display text-secondary">{analysis.season}</h3>
                            </div>
                            <button 
                              onClick={() => handleDeleteAnalysis(analysis.id)}
                              className="text-text-muted hover:text-error transition-colors p-2"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-4">
                            {analysis.colorsToSuggest?.slice(0, 6).map((color, i) => (
                              <div 
                                key={i} 
                                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full shadow-sm border border-black/5"
                                style={{ backgroundColor: color.hex_code }}
                                title={color.name}
                              />
                            ))}
                            {analysis.colorsToSuggest?.length > 6 && (
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-[10px] font-medium text-text-secondary border border-border">
                                +{analysis.colorsToSuggest.length - 6}
                              </div>
                            )}
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full sm:w-auto bg-white"
                            onClick={() => navigate('/analysis', { state: { analysisData: analysis, fromHistory: true } })}
                          >
                            View Full Report <ArrowRight size={14} className="ml-2" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-16 px-4 bg-white rounded-2xl border border-border shadow-sm">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles size={32} className="text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-secondary mb-2">No analyses yet</h3>
                    <p className="text-text-secondary mb-6">Upload a photo to discover your color season.</p>
                    <Button onClick={() => navigate('/upload')}>Analyze My Skin Tone</Button>
                  </div>
                )
              )}

              {activeTab === 'looks' && (
                looks.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                    {looks.map((look) => (
                      <Card key={look.id} hover className="flex flex-col">
                        <div className="relative aspect-[3/4] bg-bg-tertiary">
                          <img 
                            src={look.generatedTryonUrl || look.userImageUrl} 
                            alt={look.clothingName} 
                            className="absolute inset-0 w-full h-full object-cover" 
                          />
                          <button 
                            onClick={() => handleDeleteLook(look.id)}
                            className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-text-secondary hover:text-error hover:bg-white transition-colors shadow-sm"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="p-3 sm:p-4 flex-1 flex flex-col">
                          <p className="text-[10px] text-text-muted mb-1">
                            {new Date(look.createdAt).toLocaleDateString()}
                          </p>
                          <h4 className="font-bold text-secondary text-sm line-clamp-2">{look.clothingName}</h4>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 px-4 bg-white rounded-2xl border border-border shadow-sm">
                    <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Heart size={32} className="text-pink-500" />
                    </div>
                    <h3 className="text-xl font-bold text-secondary mb-2">No saved looks</h3>
                    <p className="text-text-secondary mb-6">Try on some clothes from the catalog and save them here.</p>
                    <Button onClick={() => navigate('/catalog')}>Browse Catalog</Button>
                  </div>
                )
              )}

              {activeTab === 'wishlist' && (
                appState.savedLooks && appState.savedLooks.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                    {appState.savedLooks.map((item) => (
                      <Card key={item.id} hover className="flex flex-col">
                        <div className="relative aspect-[3/4] bg-bg-tertiary">
                          <img
                            src={item.clothingImage}
                            alt={item.clothingName}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removeSavedLook(item.id)}
                            className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-text-secondary hover:text-error hover:bg-white transition-colors shadow-sm"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="p-3 sm:p-4 flex-1 flex flex-col">
                          <h4 className="font-bold text-secondary text-sm line-clamp-2">{item.clothingName}</h4>
                          <p className="text-xs text-text-muted mt-2">{item.brand} • ${item.price?.toFixed?.(2)}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 px-4 bg-white rounded-2xl border border-border shadow-sm">
                    <div className="w-20 h-20 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingBag size={32} className="text-text-muted" />
                    </div>
                    <h3 className="text-xl font-bold text-secondary mb-2">Wishlist is empty</h3>
                    <p className="text-text-secondary mb-6">Heart items in the catalog to save them for later.</p>
                    <Button onClick={() => navigate('/catalog')}>Go Shopping</Button>
                  </div>
                )
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default HistoryPage;
