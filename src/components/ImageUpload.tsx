import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, X } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage?: File | null;
  onRemoveImage: () => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImageSelect, 
  selectedImage, 
  onRemoveImage 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelect(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {selectedImage ? (
        <div className="relative group">
          <img 
            src={URL.createObjectURL(selectedImage)} 
            alt="Selected" 
            className="w-24 h-24 object-cover rounded-2xl border-2 border-primary/30 shadow-lg hover-scale smooth-transition"
          />
          <Button
            size="sm"
            variant="destructive"
            onClick={onRemoveImage}
            className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0 shadow-lg hover-scale opacity-0 group-hover:opacity-100 smooth-transition"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleButtonClick}
          className="h-12 w-12 p-0 hover-scale rounded-full hover:bg-primary/10 transition-all"
          title="Upload Image"
        >
          <ImagePlus className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};

export default ImageUpload;