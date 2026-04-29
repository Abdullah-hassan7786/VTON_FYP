import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

const CameraCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const startCamera = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    setCameraReady(false);
    
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      // Request camera with flexible constraints
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      // Set stream to video element with proper setup
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(err => {
            console.error("Video play error:", err);
            setError("Could not start camera display. Please try again.");
          });
        };
      }
      
      toast.success('Camera ready! 📷');
    } catch (err) {
      console.error("Camera access error:", err);
      
      // Provide specific error messages
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        setError("📷 Camera access denied. Please enable camera permissions in your browser settings and try again.");
      } else if (err.name === 'NotFoundError') {
        setError("❌ No camera found on your device.");
      } else if (err.name === 'NotReadableError' || err.name === 'AbortError') {
        setError("⚠️ Camera is being used by another app. Please close other apps and try again.");
      } else if (err.name === 'SecurityError') {
        setError("🔒 Camera access is blocked. Make sure you're using HTTPS.");
      } else {
        setError(`Camera error: ${err.message || 'Unknown error'}`);
      }
      
      setStream(null);
      toast.error("Camera access failed");
    } finally {
      setIsLoading(false);
    }
  }, []);


  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
      setCameraReady(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  // Auto-start camera when component mounts
  useEffect(() => {
    startCamera();
    return () => {
      // Cleanup: stop all tracks
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Empty dependency array - only run once on mount

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Camera not ready');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Verify video is ready
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Video stream not ready. Please wait a moment.');
      return;
    }
    
    try {
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast.error('Unable to access canvas');
        return;
      }

      // Mirror image for selfie (flip horizontally)
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to JPEG with high quality
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(dataUrl);
      stopCamera();
      toast.success('📸 Photo captured! Review and confirm.');
    } catch (err) {
      console.error('Capture error:', err);
      toast.error('Failed to capture photo');
    }
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(async () => {
    if (!capturedImage) {
      toast.error('No photo to confirm');
      return;
    }

    try {
      setIsLoading(true);
      
      // Convert data URL to File object
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { 
        type: 'image/jpeg' 
      });
      
      // Validate file
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File is too large (max 10MB)');
        return;
      }

      onCapture(file);
      toast.success('✅ Photo uploaded successfully!');
      
      if (onClose) {
        setTimeout(() => onClose(), 500);
      }
    } catch (err) {
      console.error('Photo confirmation error:', err);
      toast.error('Failed to process photo');
    } finally {
      setIsLoading(false);
    }
  }, [capturedImage, onCapture, onClose]);

  // Error UI
  if (error) {
    return (
      <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle size={36} className="mx-auto mb-3 text-red-500" />
        <p className="text-red-700 mb-2 font-medium text-sm">{error}</p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Button onClick={startCamera} variant="primary" size="sm">
            <Camera className="mr-2" size={16} />
            Try Again
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="outline" size="sm">
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Camera Preview Container */}
      <div className="relative w-full bg-black rounded-lg overflow-hidden shadow-lg" style={{ aspectRatio: '16/9' }}>
        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-400 border-t-primary mx-auto mb-2"></div>
              <p className="text-white text-xs font-medium">Processing...</p>
            </div>
          </div>
        )}

        {/* Initial State - Start Camera */}
        {!stream && !capturedImage && !isLoading && (
          <div className="w-full h-full flex items-center justify-center bg-gray-900 flex-col gap-4">
            <Camera size={48} className="text-gray-400" />
            <Button onClick={startCamera} className="rounded-full">
              <Camera className="mr-2" size={20} />
              Start Camera
            </Button>
          </div>
        )}

        {/* Live Video Stream */}
        {stream && !capturedImage && (
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{
              transform: 'scaleX(-1)', // Mirror effect for selfie
              backgroundColor: '#000'
            }}
            onLoadedMetadata={() => {
              setCameraReady(true);
              console.log('Camera ready');
            }}
            onError={(e) => {
              console.error('Video error:', e);
              setError('Failed to load video stream. Please try again.');
            }}
          />
        )}

        {/* Captured Image Preview */}
        {capturedImage && (
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Hidden Canvas for Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Capture Button - Circular overlay at bottom */}
        {stream && !capturedImage && cameraReady && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <button
              onClick={capturePhoto}
              disabled={isLoading}
              className="w-20 h-20 rounded-full bg-primary hover:bg-primary-dark text-white flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-4 border-white"
              title="Capture photo"
            >
              <Camera size={32} strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* Permission Hint */}
        {isLoading && (
          <div className="absolute top-4 left-4 right-4">
            <div className="bg-blue-500/90 text-white px-3 py-2 rounded-lg text-xs text-center font-medium backdrop-blur">
              📷 Allow camera access when prompted
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center flex-wrap w-full">
        {capturedImage && (
          <>
            <Button 
              onClick={retakePhoto}
              variant="outline"
              size="md"
              disabled={isLoading}
            >
              <RefreshCw className="mr-2" size={18} />
              Retake Photo
            </Button>
            <Button 
              onClick={confirmPhoto}
              variant="primary"
              size="md"
              disabled={isLoading}
              isLoading={isLoading}
            >
              <Check className="mr-2" size={18} />
              Use This Photo
            </Button>
          </>
        )}
        
        {stream && !capturedImage && (
          <Button 
            onClick={() => {
              stopCamera();
              if (onClose) onClose();
            }}
            variant="outline"
            size="md"
          >
            <X className="mr-2" size={18} />
            Cancel
          </Button>
        )}

        {error && !stream && !capturedImage && (
          <Button 
            onClick={() => {
              if (onClose) onClose();
            }}
            variant="outline"
            size="md"
          >
            <X className="mr-2" size={18} />
            Close
          </Button>
        )}
      </div>

      {/* Tips Section */}
      {stream && !capturedImage && (
        <div className="text-center text-xs text-text-secondary mt-2 max-w-xs">
          <p>💡 <strong>Tip:</strong> Good lighting and a clear face centered in the frame works best</p>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;
