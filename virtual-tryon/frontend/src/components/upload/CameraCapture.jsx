import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, Check, X } from 'lucide-react';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

const CameraCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const startCamera = async () => {
    setError(null);
    setIsLoading(true);
    try {
      // Request camera with simpler constraints to prevent OverconstrainedError
      const constraints = {
        video: { 
          facingMode: 'user'
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setIsLoading(false);
      
      // Set stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Ensure video plays
        videoRef.current.play().catch(err => {
          console.error("Error playing video:", err);
          setError("Could not start camera playback. Please try again.");
        });
      }
    } catch (err) {
      setIsLoading(false);
      console.error("Error accessing camera:", err);
      
      // Provide specific error messages
      if (err.name === 'NotAllowedError') {
        setError("Camera access denied. Please allow camera permissions and try again.");
      } else if (err.name === 'NotFoundError') {
        setError("No camera found on your device.");
      } else if (err.name === 'NotReadableError') {
        setError("Camera is being used by another application. Please close it and try again.");
      } else {
        setError(`Camera error: ${err.message}`);
      }
      toast.error("Failed to access camera");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Auto-start camera when component mounts
  useEffect(() => {
    startCamera();
  }, []);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Ensure video is ready
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        toast.error("Video not ready. Please wait a moment.");
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      // Mirror image for selfie
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(dataUrl);
      stopCamera();
      toast.success("Photo captured!");
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmPhoto = async () => {
    if (capturedImage) {
      try {
        // Convert data URL to File object
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        const file = new File([blob], `camera_${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
        toast.success("Photo uploaded!");
        if (onClose) {
          onClose();
        }
      } catch (err) {
        console.error("Error processing photo:", err);
        toast.error("Failed to process photo");
      }
    }
  };

  if (error) {
    return (
      <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200">
        <X size={32} className="mx-auto mb-3 text-red-500" />
        <p className="text-red-700 mb-4 font-medium">{error}</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={startCamera} variant="primary">
            <Camera className="mr-2" size={18} />
            Try Again
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="relative w-full max-w-lg bg-black rounded-lg overflow-hidden shadow-lg">
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-white text-sm">Starting camera...</p>
            </div>
          </div>
        )}

        {/* Start camera button */}
        {!stream && !capturedImage && !isLoading && (
          <div className="aspect-video flex items-center justify-center bg-gray-900">
            <Button onClick={startCamera} size="lg" className="rounded-full">
              <Camera className="mr-2" size={20} />
              Start Camera
            </Button>
          </div>
        )}

        {/* Video stream - only show when stream is active */}
        {stream && !capturedImage && (
          <video 
            ref={videoRef}
            autoPlay={true}
            playsInline={true}
            muted={true}
            style={{
              width: '100%',
              height: 'auto',
              aspectRatio: '16/9',
              transform: 'scaleX(-1)', // Mirror effect for selfie
              backgroundColor: '#000'
            }}
            onLoadedMetadata={() => {
              console.log("Video loaded");
            }}
            onError={(e) => {
              console.error("Video error:", e);
              setError("Failed to load video stream");
            }}
          />
        )}

        {/* Captured image preview */}
        {capturedImage && (
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="w-full h-auto block"
            style={{ aspectRatio: '16/9', objectFit: 'cover' }}
          />
        )}
        
        <canvas ref={canvasRef} className="hidden" />

        {/* Capture button overlay */}
        {stream && !capturedImage && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full bg-primary hover:bg-primary-dark text-white flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
              title="Capture photo"
            >
              <Camera size={32} />
            </button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center flex-wrap">
        {capturedImage && (
          <>
            <Button 
              onClick={retakePhoto}
              variant="outline"
              size="md"
            >
              <RefreshCw className="mr-2" size={18} />
              Retake
            </Button>
            <Button 
              onClick={confirmPhoto}
              variant="primary"
              size="md"
            >
              <Check className="mr-2" size={18} />
              Use Photo
            </Button>
          </>
        )}
        {(stream || isLoading) && (
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
      </div>
    </div>
  );
};

export default CameraCapture;
