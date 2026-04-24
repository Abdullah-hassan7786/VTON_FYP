import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cropImage, analyzeImage } from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, CheckCircle2, Sparkles, Camera } from 'lucide-react';

import ImageUploader from '../components/upload/ImageUploader';
import ImagePreview from '../components/upload/ImagePreview';
import CameraCapture from '../components/upload/CameraCapture';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(''); // 'cropping', 'analyzing', 'done'
  
  const navigate = useNavigate();

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setFileUrl(URL.createObjectURL(selectedFile));
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileUrl(null);
  };

  const handleCameraCapture = (capturedFile) => {
    handleFileSelect(capturedFile);
    setIsCameraOpen(false);
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisStep('cropping');
    
    try {
      // 1. Crop Image (Face Detection)
      const cropResult = await cropImage(file);
      const croppedBase64 = cropResult.base64Image;
      
      setAnalysisStep('analyzing');
      
      // 2. Analyze Image
      const analysisData = await analyzeImage(croppedBase64);
      
      // Merge the cropped image into the result so we can display it
      const finalResult = {
        ...analysisData,
        croppedImageBase64: croppedBase64
      };

      setAnalysisStep('done');
      toast.success('Analysis complete!');
      
      // Short delay for the 'done' state to be visible
      setTimeout(() => {
        // Navigate to results page with data
        navigate('/analysis', { state: { analysisData: finalResult, isNew: true } });
      }, 800);

    } catch (error) {
      console.error("Analysis Error:", error);
      toast.error(error.response?.data?.detail || "Failed to analyze image. Please try another photo with a clear face.");
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  return (
    <div className="min-h-screen bg-bg-secondary pt-24 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold font-display text-secondary mb-2">Analyze Your Skin Tone</h1>
          <p className="text-text-secondary">Upload a photo to discover your color season and get personalized recommendations.</p>
        </div>

        {/* Progress Bar Header */}
        <div className="mb-8">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-bold text-primary uppercase tracking-wider">Step 1 of 3</span>
            <span className="text-sm font-medium text-text-muted">Upload Photo</span>
          </div>
          <div className="h-2 w-full bg-bg-tertiary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full w-1/3"></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 sm:p-8">
          
          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div 
                key="uploader"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <ImageUploader onFileSelect={handleFileSelect} isLoading={isAnalyzing} />
                
                <div className="flex items-center gap-4 w-full">
                  <div className="h-px bg-border flex-1"></div>
                  <span className="text-text-muted text-sm font-medium uppercase tracking-wider">Or</span>
                  <div className="h-px bg-border flex-1"></div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full h-14 bg-bg-secondary hover:bg-bg-tertiary text-secondary font-bold"
                  onClick={() => setIsCameraOpen(true)}
                >
                  <Camera className="mr-2" size={20} />
                  Take a Photo
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <ImagePreview file={file} fileUrl={fileUrl} onRemove={handleRemoveFile} />
                
                {/* Guidelines */}
                <div className="grid sm:grid-cols-3 gap-4">
                   <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                     <div className="w-10 h-10 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">☀️</div>
                     <h4 className="text-sm font-bold text-blue-900 mb-1">Good Lighting</h4>
                     <p className="text-xs text-blue-700/80">Natural daylight is best</p>
                   </div>
                   <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                     <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">👤</div>
                     <h4 className="text-sm font-bold text-green-900 mb-1">Face Forward</h4>
                     <p className="text-xs text-green-700/80">Look directly at camera</p>
                   </div>
                   <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
                     <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">🖼️</div>
                     <h4 className="text-sm font-bold text-purple-900 mb-1">Plain Bg</h4>
                     <p className="text-xs text-purple-700/80">Avoid complex backgrounds</p>
                   </div>
                </div>

                <div className="pt-4 border-t border-border">
                  {isAnalyzing ? (
                    <div className="w-full bg-bg-tertiary rounded-xl p-6 text-center">
                       <div className="mb-4 flex justify-center">
                         {analysisStep === 'done' ? (
                           <CheckCircle2 size={40} className="text-success" />
                         ) : (
                           <UploadCloud size={40} className="text-primary animate-bounce" />
                         )}
                       </div>
                       <h3 className="font-bold text-secondary mb-2">
                         {analysisStep === 'cropping' && "Detecting your face..."}
                         {analysisStep === 'analyzing' && "Analyzing skin tone and features..."}
                         {analysisStep === 'done' && "Analysis complete!"}
                       </h3>
                       <div className="w-full max-w-xs mx-auto h-2 bg-border rounded-full overflow-hidden mt-4">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-500" 
                            style={{ 
                              width: analysisStep === 'cropping' ? '33%' : 
                                     analysisStep === 'analyzing' ? '66%' : '100%' 
                            }}
                          ></div>
                       </div>
                    </div>
                  ) : (
                    <Button 
                      size="lg" 
                      className="w-full h-14 text-lg shadow-lg shadow-primary/20"
                      onClick={handleAnalyze}
                    >
                      <Sparkles className="mr-2" size={20} />
                      Analyze My Skin Tone
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      <Modal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} title="Take a Photo" maxWidth="max-w-lg">
        <CameraCapture onCapture={handleCameraCapture} />
      </Modal>
    </div>
  );
};

export default UploadPage;
