// src/components/ShareButton.tsx
'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface ShareButtonProps {
  predictionId: string;
  question: string;
}

export function ShareButton({ predictionId, question }: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/prediction/${predictionId}`;
  const shareText = `Check out this prediction: ${question}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
      setShowMenu(false);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const shareOnTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    setShowMenu(false);
  };

  const shareOnWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
    window.open(whatsappUrl, '_blank');
    setShowMenu(false);
  };

  const shareNative = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'TruthVote Prediction',
          text: shareText,
          url: shareUrl
        });
        setShowMenu(false);
      } catch (error) {
        // User cancelled or error occurred
      }
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
      >
        📤 Share
      </Button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full mt-2 right-0 z-50 bg-card border border-border rounded-lg shadow-lg p-2 min-w-[200px]">
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={shareNative}
                className="w-full text-left px-4 py-2 rounded hover:bg-muted transition-colors flex items-center gap-2"
              >
                📱 Share
              </button>
            )}
            <button
              onClick={shareOnTwitter}
              className="w-full text-left px-4 py-2 rounded hover:bg-muted transition-colors flex items-center gap-2"
            >
              𝕏 Share on X/Twitter
            </button>
            <button
              onClick={shareOnWhatsApp}
              className="w-full text-left px-4 py-2 rounded hover:bg-muted transition-colors flex items-center gap-2"
            >
              💚 Share on WhatsApp
            </button>
            <button
              onClick={copyLink}
              className="w-full text-left px-4 py-2 rounded hover:bg-muted transition-colors flex items-center gap-2"
            >
              🔗 Copy Link
            </button>
          </div>
        </>
      )}
    </div>
  );
}
