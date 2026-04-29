import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Download, Share2, Save, ShoppingBag, ArrowLeft, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import AnalysisCard from '../components/analysis/AnalysisCard';
import ColorPalette from '../components/analysis/ColorPalette';
import Button from '../components/ui/Button';

const AnalysisPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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

  const handleDownloadPdf = async () => {
    if (!analysisData) return;

    const element = document.getElementById('analysis-pdf-content');
    if (!element) {
      toast.error('Unable to generate PDF.');
      return;
    }

    setIsDownloadingPdf(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`rizz-up-analysis-${analysisData.season || 'result'}-${Date.now()}.pdf`);
      toast.success('Your PDF is downloading now!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="bg-bg-secondary pt-4 pb-4 min-h-screen overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button 
            onClick={() => navigate(isNew ? '/dashboard' : -1)}
            className="flex items-center gap-1 text-text-secondary hover:text-primary transition-colors font-medium text-sm"
          >
            <ArrowLeft size={16} /> {isNew ? 'Back' : 'Back'}
          </button>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 size={16} className="mr-2" /> Share
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownloadPdf} isLoading={isDownloadingPdf}>
              <Download size={16} className="mr-2" /> PDF
            </Button>
          </div>
        </div>

        <div id="analysis-pdf-content" className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left Column - User Stats */}
          <div className="lg:col-span-5">
            <div className="sticky top-20">
              <AnalysisCard analysisData={analysisData} />
            </div>
          </div>

          {/* Right Column - Colors */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-border p-4 sm:p-5 shadow-sm">
              
              <div className="mb-4 text-center sm:text-left">
                <h2 className="text-2xl font-bold font-display text-secondary mb-1">Your Color Guide</h2>
                <p className="text-sm text-text-secondary">Shades that make you look vibrant and healthy.</p>
              </div>

              <ColorPalette 
                title="Colors to Embrace" 
                colors={analysisData.colorsToSuggest || []}
                reason={analysisData.reasonToSuggest}
                type="suggest"
              />

              <div className="h-px w-full bg-border my-4"></div>

              <ColorPalette 
                title="Colors to Avoid" 
                colors={analysisData.colorsToAvoid || []}
                reason={analysisData.reasonToAvoid}
                type="avoid"
              />

            </div>

            {/* Bottom Action Bar */}
            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
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
