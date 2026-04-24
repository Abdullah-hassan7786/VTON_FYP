import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';
import Button from '../ui/Button';

const ImageUploader = ({ onFileSelect, isLoading }) => {
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles?.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 10485760, // 10MB
    multiple: false,
    disabled: isLoading
  });

  return (
    <div 
      {...getRootProps()} 
      className={`
        border-2 border-dashed rounded-2xl p-8 h-[300px] flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer
        ${isDragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border bg-bg-secondary hover:border-primary/50'}
        ${isDragReject ? 'border-error bg-error/5' : ''}
        ${isLoading ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <input {...getInputProps()} />
      
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors duration-200 ${isDragActive ? 'bg-primary text-white' : 'bg-white text-primary shadow-sm'}`}>
        <UploadCloud size={32} />
      </div>
      
      <h3 className="text-xl font-bold text-secondary mb-2">
        {isDragActive ? 'Drop your photo here' : 'Drag & drop your photo here'}
      </h3>
      
      <p className="text-text-secondary text-sm mb-6 max-w-xs mx-auto">
        Supports JPG, PNG, WEBP up to 10MB
      </p>
      
      <div className="flex items-center gap-4 w-full max-w-xs mx-auto mb-6">
        <div className="h-px bg-border flex-1"></div>
        <span className="text-text-muted text-sm font-medium">OR</span>
        <div className="h-px bg-border flex-1"></div>
      </div>
      
      <Button 
        type="button" 
        variant="outline" 
        className="pointer-events-none bg-white"
      >
        <ImageIcon size={18} className="mr-2" />
        Browse Files
      </Button>
    </div>
  );
};

export default ImageUploader;
