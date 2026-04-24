import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ShoppingBag, ZoomIn, ZoomOut, Save, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ImageUploader from '../components/upload/ImageUploader';

const TryOnPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const selectedItem = location.state?.selectedItem;
  
  const [userImage, setUserImage] = useState(null);
  const [userImageFile, setUserImageFile] = useState(null);
  const [scale, setScale] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // In a real app, this would be fetched from user profile if it exists
  useEffect(() => {
    if (!selectedItem) {
      toast('Please select an item from the catalog to try on', { icon: '👕' });
      navigate('/catalog');
    }
  }, [selectedItem, navigate]);

  const handleFileSelect = (file) => {
    setUserImageFile(file);
    setUserImage(URL.createObjectURL(file));
  };

  const handleSaveLook = async () => {
    if (!user) {
      toast('Please sign in to save looks', { icon: '🔒' });
      navigate('/login', { state: { from: location } });
      return;
    }

    if (!userImageFile) {
      toast.error('Please upload a photo first');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Upload user image to Supabase Storage
      const fileName = `${user.id}/${Date.now()}_${userImageFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('looks')
        .upload(fileName, userImageFile);

      if (uploadError) throw uploadError;

      // 2. Get the public URL
      const { data: urlData } = supabase.storage
        .from('looks')
        .getPublicUrl(fileName);

      const downloadUrl = urlData?.publicUrl || '';

      // 3. Save the metadata to Supabase
      const { error: insertError } = await supabase.from('saved_looks').insert([{
        user_id: user.id,
        clothing_item_id: selectedItem.id,
        clothing_name: selectedItem.name,
        clothing_image: selectedItem.image,
        user_image_url: downloadUrl,
        scale: scale,
      }]);
      
      if (insertError) throw insertError;
      
      toast.success('Look saved to your history!');
      navigate('/history');
    } catch (error) {
      console.error("Error saving look:", error);
      toast.error('Failed to save look');
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedItem) return null;

  return (
    <div className="min-h-screen bg-bg-secondary pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-secondary mb-2">Virtual Try-On</h1>
          <p className="text-text-secondary">See how {selectedItem.name} looks on you.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Panel - User Image */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-secondary">Your Photo</h3>
                {userImage && (
                  <Button variant="ghost" size="sm" onClick={() => setUserImage(null)}>
                    <RefreshCw size={16} className="mr-2" /> Change
                  </Button>
                )}
              </div>

              {!userImage ? (
                <div className="bg-bg-tertiary rounded-xl overflow-hidden h-[400px]">
                  <ImageUploader onFileSelect={handleFileSelect} />
                </div>
              ) : (
                <div className="relative aspect-[3/4] bg-bg-tertiary rounded-xl overflow-hidden shadow-inner border border-border">
                  <img src={userImage} alt="You" className="w-full h-full object-cover" />
                  
                  {/* Overlay Clothing (Simulated Try-On) */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <img 
                      src={selectedItem.image} 
                      alt="Clothing Overlay" 
                      className="object-contain mix-blend-multiply opacity-90 drop-shadow-2xl transition-transform"
                      style={{ 
                        transform: `scale(${scale}) translateY(10%)`,
                        maxHeight: '80%'
                      }}
                    />
                  </div>
                </div>
              )}

              {userImage && (
                <div className="mt-6 p-4 bg-bg-tertiary rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-secondary flex items-center gap-2"><ZoomOut size={16} /> Adjust Fit</span>
                    <span className="text-sm font-medium text-text-secondary"><ZoomIn size={16} /></span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="1.5" 
                    step="0.05" 
                    value={scale} 
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              )}
            </Card>
          </div>

          {/* Right Panel - Clothing Info */}
          <div>
            <Card className="sticky top-24">
              <div className="p-6 sm:p-8">
                <div className="aspect-square sm:aspect-video rounded-xl overflow-hidden bg-bg-tertiary mb-6 border border-border">
                  <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-contain mix-blend-multiply p-4" />
                </div>
                
                <div className="text-sm text-text-muted mb-2 font-medium tracking-wide uppercase">{selectedItem.brand}</div>
                <h2 className="text-2xl font-bold font-display text-secondary mb-2">{selectedItem.name}</h2>
                <div className="text-2xl font-bold text-primary mb-6">${selectedItem.price.toFixed(2)}</div>
                
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">Season Match</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.seasons.map(season => (
                      <Badge key={season} variant="default">{season}</Badge>
                    ))}
                  </div>
                </div>

                <p className="text-text-secondary leading-relaxed mb-8 text-sm">
                  {selectedItem.description}
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    className="flex-1" 
                    onClick={handleSaveLook}
                    disabled={!userImage || isSaving}
                    isLoading={isSaving}
                  >
                    <Save size={18} className="mr-2" /> Save This Look
                  </Button>
                  <Button variant="outline" className="flex-1 bg-white" onClick={() => navigate('/catalog')}>
                    <ShoppingBag size={18} className="mr-2" /> Browse More
                  </Button>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TryOnPage;
