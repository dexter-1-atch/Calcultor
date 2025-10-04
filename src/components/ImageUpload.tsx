import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ImageIcon, X } from 'lucide-react';

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
        <div className="relative">
          <img 
            src={URL.createObjectURL(selectedImage)} 
            alt="Selected" 
            className="w-20 h-20 object-cover rounded-lg border"
          />
          <Button
            size="sm"
            variant="destructive"
            onClick={onRemoveImage}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleButtonClick}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default ImageUpload;