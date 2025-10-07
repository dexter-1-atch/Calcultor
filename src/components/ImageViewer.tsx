import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageViewerProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, isOpen, onClose }) => {
  if (!imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 animate-scale-in">
        <Button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 rounded-full h-10 w-10 p-0 bg-white/10 hover:bg-white/20 text-white hover-scale smooth-transition"
          variant="ghost"
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="flex items-center justify-center min-h-[400px] max-h-[80vh] animate-fade-in">
          <img 
            src={imageUrl} 
            alt="Full size" 
            className="max-w-full max-h-[80vh] object-contain animate-scale-in"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;
