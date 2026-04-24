import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Download, Share2, Save, ShoppingBag, ArrowLeft, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

import AnalysisCard from '../components/analysis/AnalysisCard';
import ColorPalette from '../components/analysis/ColorPalette';
import Button from '../components/ui/Button';

const AnalysisPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const analysisData = location.state?.analysisData;
  const isNew = location.state?.isNew;

  useEffect(() => {
    if (isNew && analysisData) {
      // Trigger confetti on new analysis
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // Pick colors based on season if possible, else default
        const colors = analysisData.colorsToSuggest?.map(c => c.hex_code) || ['#FF6B35', '#F7C59F'];

        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }, colors }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }, colors }));
      }, 250);

      // Auto-save if logged in
      if (user && !hasSaved) {
        handleSaveAnalysis(true);
      }
    }
  }, [isNew, analysisData, user]);

  if (!analysisData) {
    return <Navigate to="/upload" replace />;
  }

  const handleSaveAnalysis = async (auto = false) => {
    if (!user) {
      if (!auto) {
        toast('Please sign in to save your analysis', { icon: '🔒' });
        navigate('/login', { state: { from: location } });
      }
      return;
    }

    if (hasSaved) return;

    setIsSaving(true);
    try {
      // Save analysis to Supabase
      const { error } = await supabase.from('analyses').insert([{
        user_id: user.id,
        season: analysisData.season,
        characteristics: analysisData.characteristics,
        colors_to_suggest: analysisData.colorsToSuggest,
        reason_to_suggest: analysisData.reasonToSuggest,
        colors_to_avoid: analysisData.colorsToAvoid,
        reason_to_avoid: analysisData.reasonToAvoid,
        content: analysisData.content,
        cropped_image_base64: analysisData.croppedImageBase64,
      }]);
      
      if (error) throw error;
      
      setHasSaved(true);
      if (!auto) toast.success('Analysis saved to your history!');
    } catch (error) {
      console.error("Error saving analysis:", error);
      if (!auto) toast.error('Failed to save analysis');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = () => {
    // In a real app, you might create a unique public link
    navigator.clipboard.writeText(window.location.origin);
    toast.success('Link copied to clipboard!');
  };

  const handleDownloadPdf = () => {
    toast('PDF Generation coming soon!', { icon: '📄' });
  };

  return (
    <div className="min-h-screen bg-bg-secondary pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-6 flex items-center justify-between">
          <button 
            onClick={() => navigate(isNew ? '/dashboard' : -1)}
            className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors font-medium"
          >
            <ArrowLeft size={18} /> {isNew ? 'Back to Dashboard' : 'Back'}
          </button>
          
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 size={16} className="mr-2" /> Share
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownloadPdf}>
              <Download size={16} className="mr-2" /> PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column - User Stats */}
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <AnalysisCard analysisData={analysisData} />
            </div>
          </div>

          {/* Right Column - Colors */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
              
              <div className="mb-10 text-center sm:text-left">
                <h2 className="text-3xl font-bold font-display text-secondary mb-2">Your Color Guide</h2>
                <p className="text-text-secondary">Here are the exact shades that will make you look vibrant and healthy.</p>
              </div>

              <ColorPalette 
                title="Colors to Embrace" 
                colors={analysisData.colorsToSuggest || []}
                reason={analysisData.reasonToSuggest}
                type="suggest"
              />

              <div className="h-px w-full bg-border my-10"></div>

              <ColorPalette 
                title="Colors to Avoid" 
                colors={analysisData.colorsToAvoid || []}
                reason={analysisData.reasonToAvoid}
                type="avoid"
              />

            </div>

            {/* Bottom Action Bar */}
            <div className="bg-white rounded-2xl border border-border p-6 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div>
                <h4 className="font-bold text-secondary mb-1">Build Your Wardrobe</h4>
                <p className="text-sm text-text-secondary">Start finding pieces in your season.</p>
              </div>
              
              <div className="flex w-full sm:w-auto gap-3">
                <Button 
                  variant={hasSaved ? "outline" : "secondary"}
                  onClick={() => handleSaveAnalysis(false)}
                  disabled={hasSaved || isSaving}
                  isLoading={isSaving}
                  className="flex-1 sm:flex-none"
                >
                  {hasSaved ? (
                    <><CheckCircle2 size={18} className="mr-2 text-success" /> Saved</>
                  ) : (
                    <><Save size={18} className="mr-2" /> Save Results</>
                  )}
                </Button>
                
                <Button 
                  className="flex-1 sm:flex-none shadow-lg shadow-primary/20"
                  onClick={() => navigate('/catalog', { state: { season: analysisData.season } })}
                >
                  <ShoppingBag size={18} className="mr-2" /> Shop My Colors
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;
