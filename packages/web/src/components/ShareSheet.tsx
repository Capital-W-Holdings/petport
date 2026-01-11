import React, { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Mail, Twitter, Facebook, Link2, Download, Loader2 } from 'lucide-react';
import { Button, Modal, useToast } from '@/components/ui';
import { Pet, pets } from '@/lib/api';

interface ShareSheetProps {
  pet: Pet;
  qrDataUrl?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareSheet({ pet, qrDataUrl, isOpen, onClose }: ShareSheetProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const verifyUrl = `${window.location.origin}/verify/${pet.petportId}`;
  const shareText = `Check out ${pet.name}'s digital pet passport! 🐾 Verify their identity and vaccination status instantly.`;
  const shareTitle = `${pet.name}'s PetPort ID`;

  // Check if native share is available
  const canNativeShare = typeof navigator.share === 'function';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(pet.petportId);
      toast.success('PetPort ID copied!');
    } catch {
      toast.error('Failed to copy ID');
    }
  };

  const handleNativeShare = async () => {
    const shareData: ShareData = {
      title: shareTitle,
      text: shareText,
      url: verifyUrl,
    };

    try {
      // Try to share with files if QR code is available
      if (qrDataUrl && navigator.canShare) {
        const response = await fetch(qrDataUrl);
        const blob = await response.blob();
        const file = new File([blob], `${pet.petportId}-qr.png`, { type: 'image/png' });
        
        const dataWithFiles = { ...shareData, files: [file] };
        if (navigator.canShare(dataWithFiles)) {
          await navigator.share(dataWithFiles);
          return;
        }
      }

      // Fallback to text-only share
      await navigator.share(shareData);
    } catch (err) {
      // User cancelled share - that's fine
      if ((err as Error).name !== 'AbortError') {
        toast.error('Failed to share');
      }
    }
  };

  const handleDownloadQR = async () => {
    setDownloading(true);
    try {
      await pets.downloadQRPng(pet.id, pet.petportId);
      toast.success('QR code downloaded!');
    } catch {
      toast.error('Failed to download QR code');
    } finally {
      setDownloading(false);
    }
  };

  const handleSocialShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(verifyUrl);
    const encodedText = encodeURIComponent(shareText);
    
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodedText}%0A%0A${encodedUrl}`;
        break;
      case 'sms':
        // SMS format varies by platform
        shareUrl = `sms:?body=${encodedText}%20${encodedUrl}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share ${pet.name}'s Profile`}>
      <div className="space-y-6">
        {/* Quick share buttons */}
        {canNativeShare && (
          <div>
            <Button fullWidth size="lg" onClick={handleNativeShare}>
              <Share2 className="h-5 w-5" />
              Share
            </Button>
          </div>
        )}

        {/* PetPort ID display */}
        <div className="bg-forest/5 rounded-xl p-4">
          <p className="text-sm text-stone mb-1">PetPort ID</p>
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-bold text-forest">
              {pet.petportId}
            </span>
            <button 
              onClick={handleCopyId}
              className="p-2 hover:bg-forest/10 rounded-lg transition-colors"
            >
              <Copy className="h-4 w-4 text-forest" />
            </button>
          </div>
        </div>

        {/* Copy link button */}
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-between p-4 bg-sand/50 hover:bg-sand rounded-xl transition-colors"
        >
          <div className="flex items-center gap-3">
            {copied ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <Link2 className="h-5 w-5 text-charcoal" />
            )}
            <span className="font-medium">
              {copied ? 'Copied!' : 'Copy verification link'}
            </span>
          </div>
          <span className="text-sm text-stone truncate max-w-[150px]">
            {verifyUrl.replace('https://', '')}
          </span>
        </button>

        {/* Download QR */}
        <button
          onClick={handleDownloadQR}
          disabled={downloading}
          className="w-full flex items-center gap-3 p-4 bg-sand/50 hover:bg-sand rounded-xl transition-colors disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="h-5 w-5 animate-spin text-charcoal" />
          ) : (
            <Download className="h-5 w-5 text-charcoal" />
          )}
          <span className="font-medium">Download QR Code</span>
        </button>

        {/* Social share grid */}
        <div>
          <p className="text-sm text-stone mb-3">Share via</p>
          <div className="grid grid-cols-5 gap-3">
            <SocialButton 
              icon={<MessageCircle className="h-5 w-5" />} 
              label="WhatsApp"
              color="bg-green-500"
              onClick={() => handleSocialShare('whatsapp')}
            />
            <SocialButton 
              icon={<Twitter className="h-5 w-5" />} 
              label="Twitter"
              color="bg-sky-500"
              onClick={() => handleSocialShare('twitter')}
            />
            <SocialButton 
              icon={<Facebook className="h-5 w-5" />} 
              label="Facebook"
              color="bg-blue-600"
              onClick={() => handleSocialShare('facebook')}
            />
            <SocialButton 
              icon={<Mail className="h-5 w-5" />} 
              label="Email"
              color="bg-gray-600"
              onClick={() => handleSocialShare('email')}
            />
            <SocialButton 
              icon={<MessageCircle className="h-5 w-5" />} 
              label="SMS"
              color="bg-green-600"
              onClick={() => handleSocialShare('sms')}
            />
          </div>
        </div>

        {/* QR Preview (if available) */}
        {qrDataUrl && (
          <div className="text-center">
            <p className="text-sm text-stone mb-3">QR Code Preview</p>
            <div className="inline-block bg-white p-3 rounded-xl shadow-sm">
              <img 
                src={qrDataUrl} 
                alt="QR Code" 
                className="w-32 h-32"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Social button component
function SocialButton({ 
  icon, 
  label, 
  color, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 group"
      title={label}
    >
      <div className={`
        ${color} text-white p-3 rounded-full 
        group-hover:scale-110 transition-transform
      `}>
        {icon}
      </div>
      <span className="text-xs text-stone">{label}</span>
    </button>
  );
}

// Quick share hook for use elsewhere
export function useQuickShare(pet: Pet) {
  const { toast } = useToast();

  const verifyUrl = `${window.location.origin}/verify/${pet.petportId}`;
  const shareText = `Check out ${pet.name}'s digital pet passport! 🐾`;
  const shareTitle = `${pet.name}'s PetPort ID`;

  const share = async () => {
    const shareData: ShareData = {
      title: shareTitle,
      text: shareText,
      url: verifyUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy link
        await navigator.clipboard.writeText(verifyUrl);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        // Fallback to copy
        try {
          await navigator.clipboard.writeText(verifyUrl);
          toast.success('Link copied to clipboard!');
        } catch {
          toast.error('Failed to share');
        }
      }
    }
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(pet.petportId);
      toast.success('PetPort ID copied!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      toast.success('Link copied!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return { share, copyId, copyLink, verifyUrl };
}
