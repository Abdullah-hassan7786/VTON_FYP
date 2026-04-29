import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  ShoppingBag,
  Save,
  RefreshCw,
  Sparkles,
  Download,
  ImageIcon,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Wand2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ImageUploader from '../components/upload/ImageUploader';
import { generateTryOnImage } from '../services/geminiTryOn';

// ── Status constants ────────────────────────────────────────────────
const STATUS = {
  IDLE: 'idle',
  GENERATING: 'generating',
  SUCCESS: 'success',
  ERROR: 'error',
};

// ── Animated loading steps ───────────────────────────────────────────
const LOADING_STEPS = [
  'Analyzing your photo…',
  'Understanding clothing style…',
  'Generating your look with AI…',
  'Applying realistic fit…',
  'Finalising your try-on…',
];

const TryOnPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const selectedItem = location.state?.selectedItem;

  // ── State ──────────────────────────────────────────────────────────
  const [userImageFile, setUserImageFile] = useState(null);
  const [userImagePreview, setUserImagePreview] = useState(null);

  const [status, setStatus] = useState(STATUS.IDLE);
  const [resultImage, setResultImage] = useState(null); // { base64, mimeType }
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Loading step animation
  const [loadingStep, setLoadingStep] = useState(0);
  const stepTimerRef = useRef(null);

  // ── Guards ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedItem) {
      toast('Please select an item from the catalog first', { icon: '👕' });
      navigate('/catalog');
    }
  }, [selectedItem, navigate]);

  // Cycle through loading steps while generating
  useEffect(() => {
    if (status === STATUS.GENERATING) {
      setLoadingStep(0);
      stepTimerRef.current = setInterval(() => {
        setLoadingStep((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1));
      }, 2200);
    } else {
      clearInterval(stepTimerRef.current);
    }
    return () => clearInterval(stepTimerRef.current);
  }, [status]);

  if (!selectedItem) return null;

  // ── Handlers ──────────────────────────────────────────────────────

  const handleFileSelect = (file) => {
    setUserImageFile(file);
    setUserImagePreview(URL.createObjectURL(file));
    // Reset previous result
    setResultImage(null);
    setStatus(STATUS.IDLE);
    setErrorMsg('');
  };

  const handleReset = () => {
    setUserImageFile(null);
    setUserImagePreview(null);
    setResultImage(null);
    setStatus(STATUS.IDLE);
    setErrorMsg('');
  };

  const handleGenerate = async () => {
    if (!userImageFile) {
      toast.error('Please upload your photo first');
      return;
    }

    setStatus(STATUS.GENERATING);
    setResultImage(null);
    setErrorMsg('');

    try {
      const result = await generateTryOnImage(userImageFile, selectedItem);
      setResultImage(result);
      setStatus(STATUS.SUCCESS);
      toast.success('Your AI try-on is ready! 🎉');
    } catch (err) {
      console.error('Try-on generation failed:', err);
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setStatus(STATUS.ERROR);
      toast.error('Generation failed. See the error for details.');
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = `data:${resultImage.mimeType};base64,${resultImage.base64}`;
    link.download = `rizz-up-tryon-${selectedItem.id}-${Date.now()}.png`;
    link.click();
  };

  const handleSaveLook = async () => {
    if (!user) {
      toast('Please sign in to save looks', { icon: '🔒' });
      navigate('/login', { state: { from: location } });
      return;
    }
    if (!resultImage) {
      toast.error('Generate your try-on image first');
      return;
    }

    setIsSaving(true);
    try {
      // Convert base64 result to a Blob and upload to Supabase Storage
      const byteCharacters = atob(resultImage.base64);
      const byteNumbers = Array.from(byteCharacters, (c) => c.charCodeAt(0));
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: resultImage.mimeType });

      const fileName = `${user.id}/tryon_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('looks')
        .upload(fileName, blob, { contentType: resultImage.mimeType });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('looks').getPublicUrl(fileName);
      const downloadUrl = urlData?.publicUrl || '';

      const { error: insertError } = await supabase.from('saved_looks').insert([
        {
          user_id: user.id,
          clothing_item_id: selectedItem.id,
          clothing_name: selectedItem.name,
          clothing_image: selectedItem.image,
          user_image_url: downloadUrl,
          generated_tryon_url: downloadUrl,
        },
      ]);

      if (insertError) throw insertError;

      toast.success('Look saved to your history!');
      navigate('/history');
    } catch (error) {
      console.error('Error saving look:', error);
      let errorDetail = "Failed to save look";
      
      if (error.message?.includes('bucket')) {
        errorDetail = "Storage bucket 'looks' not found or is not public.";
      } else if (error.message?.includes('policy') || error.code === '42501') {
        errorDetail = "Permission denied. Check your Supabase RLS policies.";
      } else if (error.code === 'PGRST204') {
        errorDetail = "Database table 'saved_looks' not found.";
      } else {
        // Show raw error if it's something else
        errorDetail = `Save failed: ${error.message || 'Unknown error'}`;
      }
      
      toast.error(errorDetail, { duration: 5000 });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────
  const canGenerate = !!userImageFile && status !== STATUS.GENERATING;
  const isGenerating = status === STATUS.GENERATING;
  const hasResult = status === STATUS.SUCCESS && resultImage;
  const hasError = status === STATUS.ERROR;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-secondary pt-16 pb-4 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="mb-10 flex items-start gap-4">
          <button
            onClick={() => navigate('/catalog')}
            className="mt-0.5 p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-secondary"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold font-display text-secondary mb-0.5 flex items-center gap-2">
              <Wand2 className="text-primary" size={24} />
              AI Virtual Try-On
            </h1>
            <p className="text-sm text-text-secondary">
              Wearing <span className="font-semibold text-secondary">{selectedItem.name}</span>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ══════════════════════════════════════════════
              LEFT – Upload + Generate
          ══════════════════════════════════════════════ */}
          <div className="lg:col-span-1 space-y-4">

            {/* Clothing Item Card */}
            <Card className="p-4">
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Selected Item</h3>
              <div className="flex gap-4 items-start">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-bg-tertiary border border-border flex-shrink-0">
                  <img
                    src={selectedItem.image}
                    alt={selectedItem.name}
                    className="w-full h-full object-contain p-1 mix-blend-multiply"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-text-muted font-medium uppercase tracking-wide mb-1">{selectedItem.brand}</div>
                  <div className="font-bold text-secondary text-sm leading-tight">{selectedItem.name}</div>
                  <div className="text-primary font-bold mt-1">${selectedItem.price.toFixed(2)}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(selectedItem.tags || []).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary border border-border text-text-secondary"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Upload Card */}
            <Card className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Your Photo</h3>
                {userImagePreview && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 text-[10px] text-text-secondary hover:text-secondary transition-colors"
                  >
                    <RefreshCw size={11} /> Change
                  </button>
                )}
              </div>

              {!userImagePreview ? (
                <div className="rounded-xl overflow-hidden h-[180px] bg-bg-tertiary">
                  <ImageUploader onFileSelect={handleFileSelect} />
                </div>
              ) : (
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-border bg-bg-tertiary">
                  <img src={userImagePreview} alt="Your photo" className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 right-2">
                    <span className="text-xs bg-black/60 text-white px-2 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle size={11} /> Ready
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`
                w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2
                transition-all duration-300 shadow-md
                ${canGenerate
                  ? 'bg-gradient-to-r from-primary to-purple-600 text-white hover:shadow-primary/40 hover:scale-[1.01] active:scale-[0.99]'
                  : 'bg-bg-tertiary text-text-muted cursor-not-allowed border border-border'
                }
              `}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate Try-On
                </>
              )}
            </button>

            {/* Upload hint */}
            {!userImageFile && (
              <p className="text-xs text-text-muted text-center -mt-2">
                ↑ Upload your photo above to enable generation
              </p>
            )}
          </div>

          {/* ══════════════════════════════════════════════
              RIGHT – Result Panel
          ══════════════════════════════════════════════ */}
          <div className="lg:col-span-2">
            <Card className="h-full min-h-[480px] flex flex-col p-4 sm:p-5">

              {/* ── IDLE state ── */}
              {status === STATUS.IDLE && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 flex items-center justify-center mb-6">
                    <ImageIcon size={40} className="text-primary/60" />
                  </div>
                  <h3 className="text-xl font-bold text-secondary mb-3">Your AI Try-On Will Appear Here</h3>
                  <p className="text-text-secondary max-w-sm text-sm leading-relaxed">
                    Upload your photo on the left, then click{' '}
                    <span className="font-semibold text-primary">Generate Try-On with AI</span>. Gemini will create
                    a brand-new image of you wearing the selected outfit.
                  </p>
                  <div className="mt-8 grid grid-cols-3 gap-4 text-center max-w-sm">
                    {['Upload Photo', 'Click Generate', 'Get Your Look'].map((step, i) => (
                      <div key={step} className="space-y-2">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mx-auto text-sm">
                          {i + 1}
                        </div>
                        <p className="text-xs text-text-secondary font-medium">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── GENERATING state ── */}
              {status === STATUS.GENERATING && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  {/* Animated rings */}
                  <div className="relative w-32 h-32 mb-8">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-4 border-primary/40 animate-pulse" />
                    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
                      <Sparkles className="text-white animate-spin" size={28} style={{ animationDuration: '3s' }} />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-secondary mb-3">Gemini AI is Working Its Magic…</h3>
                  <p className="text-primary font-medium text-sm mb-6 h-6 transition-all duration-500">
                    {LOADING_STEPS[loadingStep]}
                  </p>

                  {/* Step progress dots */}
                  <div className="flex gap-2 justify-center">
                    {LOADING_STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          i <= loadingStep ? 'bg-primary w-6' : 'bg-border w-3'
                        }`}
                      />
                    ))}
                  </div>

                  <p className="text-xs text-text-muted mt-6">
                    This usually takes 15–30 seconds
                  </p>
                </div>
              )}

              {/* ── SUCCESS state ── */}
              {hasResult && (
                <div className="flex-1 flex flex-col p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="text-green-500" size={20} />
                      <h3 className="font-bold text-secondary">AI Generated Try-On</h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleGenerate}
                        title="Regenerate"
                        className="p-2 rounded-xl hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-secondary border border-border"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        onClick={handleDownload}
                        title="Download"
                        className="p-2 rounded-xl hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-secondary border border-border"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Generated Image */}
                  <div className="flex-1 flex justify-center min-h-0">
                    <div className="rounded-xl overflow-hidden bg-bg-tertiary border border-border relative max-w-sm w-full h-full max-h-[350px]">
                      <img
                        src={`data:${resultImage.mimeType};base64,${resultImage.base64}`}
                        alt="AI Try-On Result"
                        className="w-full h-full object-contain"
                      />
                      {/* Watermark badge */}
                      <div className="absolute top-2 left-2">
                        <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
                          <Sparkles size={9} /> AI Result
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleSaveLook}
                      disabled={isSaving}
                      isLoading={isSaving}
                    >
                      <Save size={15} className="mr-2" /> Save
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={handleDownload}>
                      <Download size={15} className="mr-2" /> Download
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate('/catalog')}>
                      <ShoppingBag size={15} className="mr-2" /> Shop
                    </Button>
                  </div>

                  {/* Season tags */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                    <span className="text-xs text-text-muted font-medium">Season Match:</span>
                    {selectedItem.seasons.map((s) => (
                      <Badge key={s} variant="default">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* ── ERROR state ── */}
              {hasError && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-red-50 border border-red-200 flex items-center justify-center mb-6">
                    <AlertCircle size={36} className="text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-secondary mb-3">Generation Failed</h3>
                  <p className="text-text-secondary text-sm max-w-md leading-relaxed mb-2">{errorMsg}</p>
                  <p className="text-xs text-text-muted mb-8">
                    Make sure your <code className="bg-bg-tertiary px-1 rounded">VITE_GEMINI_API_KEY</code> is valid and the Gemini API is enabled.
                  </p>
                  <Button onClick={handleGenerate}>
                    <RefreshCw size={16} className="mr-2" />
                    Try Again
                  </Button>
                </div>
              )}

            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TryOnPage;
