// src/components/ShareButton.tsx
'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface ShareButtonProps {
  pollId?: string;
  predictionId?: string;
  pollQuestion?: string;
  question?: string;
  variant?: 'button' | 'icon';
}

export function ShareButton({ pollId, predictionId, pollQuestion, question, variant = 'button' }: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const id = pollId || predictionId || '';
  const text = pollQuestion || question || '';
  
  // Detect mobile on mount
  useState(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  });
  
  // Create URL-friendly slug from question
  const createSlug = (question: string): string => {
    return question
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 60);
  };
  
  const slug = createSlug(text);
  // Share URL - goes through Firebase Hosting rewrite to sharePreview function
  // This ensures social media crawlers get proper meta tags
  const shareUrl = `https://truthvote.io/share?id=${id}`;
  const shareText = text; // Just the question - meta tags will show options

  // Track share in Firebase
  const trackShare = async (method: string) => {
    try {
      const functions = getFunctions();
      const trackShareFn = httpsCallable(functions, 'trackShare');
      await trackShareFn({ predictionId: id, shareMethod: method });
    } catch (error) {
      console.error('Failed to track share:', error);
      // Don't show error to user - tracking is silent
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
      await trackShare('copy');
      setShowMenu(false);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const shareOnTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    trackShare('twitter');
    setShowMenu(false);
  };

  const shareOnWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
    window.open(whatsappUrl, '_blank');
    trackShare('whatsapp');
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
        await trackShare('native');
        setShowMenu(false);
      } catch (error) {
        // User cancelled or error occurred
      }
    }
  };

  return (
    <>
      {variant === 'icon' ? (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // On mobile, use native share immediately
            if (isMobile && typeof navigator !== 'undefined' && 'share' in navigator) {
              shareNative();
            } else {
              setShowMenu(!showMenu);
            }
          }}
          className="p-1 rounded-md hover:bg-muted/50 transition-colors"
          aria-label="Share prediction"
        >
          {/* Facebook-style upload/share arrow */}
          <svg
            className="w-4 h-4 text-muted-foreground/60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 6.75L12 3m0 0l3.75 3.75M12 3v13.5M3 12v6.75a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18.75V12"
            />
          </svg>
        </button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (isMobile && typeof navigator !== 'undefined' && 'share' in navigator) {
              shareNative();
            } else {
              setShowMenu(!showMenu);
            }
          }}
        >
          📤 Share
        </Button>
      )}

      {showMenu && !isMobile && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[9998] bg-black/20" 
            onClick={() => setShowMenu(false)}
          />
          
          {/* Modal - centered on screen */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] bg-card border border-border rounded-xl shadow-2xl p-3 min-w-[280px] max-w-[90vw]">
            <div className="text-sm font-semibold mb-3 px-2 text-foreground">Share this prediction</div>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={shareNative}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted transition-colors flex items-center gap-3 text-foreground"
              >
                <span className="text-lg">📱</span>
                <span>Share</span>
              </button>
            )}
            <button
              onClick={shareOnTwitter}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted transition-colors flex items-center gap-3 text-foreground"
            >
              <span className="text-lg">𝕏</span>
              <span>Share on X/Twitter</span>
            </button>
            <button
              onClick={shareOnWhatsApp}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted transition-colors flex items-center gap-3 text-foreground"
            >
              <span className="text-lg">💚</span>
              <span>Share on WhatsApp</span>
            </button>
            <button
              onClick={copyLink}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted transition-colors flex items-center gap-3 text-foreground"
            >
              <span className="text-lg">🔗</span>
              <span>Copy Link</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}
