import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, Share2, ArrowRight, Sparkles } from 'lucide-react';
import { PublicLayout } from '@/components/Layout';
import { Card, Button, Badge, LoadingState, useToast } from '@/components/ui';
import { publicApi, PublicPetInfo, ApiError } from '@/lib/api';
import { getSpeciesEmoji, formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export function PublicProfilePage() {
  const { petportId } = useParams<{ petportId: string }>();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [petInfo, setPetInfo] = useState<PublicPetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (petportId) {
      loadPetInfo();
    }
  }, [petportId]);

  const loadPetInfo = async () => {
    if (!petportId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await publicApi.verify(petportId);
      setPetInfo(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Pet not found');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!petInfo) return;
    
    const shareData = {
      title: `${petInfo.name}'s PetPort Profile`,
      text: `Check out ${petInfo.name}'s digital pet passport! 🐾`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied!');
      }
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <LoadingState message="Loading pet profile..." />
      </PublicLayout>
    );
  }

  if (error || !petInfo) {
    return (
      <PublicLayout>
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="h-20 w-20 bg-sand rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🐾</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-charcoal mb-2">
            Pet Not Found
          </h1>
          <p className="text-stone mb-6">
            {error || 'This pet profile does not exist or has been removed.'}
          </p>
          <Link to="/">
            <Button variant="outline">Go to Homepage</Button>
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto">
        {/* Hero Card */}
        <Card className="mb-6 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-br from-forest to-pine p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Badge className="bg-white/20 text-white border-0">
                <Shield className="h-3 w-3 mr-1" />
                Verified Pet
              </Badge>
              <button
                onClick={handleShare}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Share profile"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
            
            {/* Pet Avatar and Name */}
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 bg-white/20 rounded-2xl flex items-center justify-center text-5xl">
                {getSpeciesEmoji(petInfo.species)}
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold">{petInfo.name}</h1>
                <p className="text-white/80">
                  {petInfo.breed || petInfo.species.charAt(0) + petInfo.species.slice(1).toLowerCase()}
                </p>
                <p className="font-mono text-sm text-white/60 mt-1">
                  {petInfo.petportId}
                </p>
              </div>
            </div>
          </div>

          {/* Pet Details */}
          <div className="p-6">
            {/* Owner */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 bg-sand rounded-full flex items-center justify-center">
                <span className="text-lg">👤</span>
              </div>
              <div>
                <p className="text-sm text-stone">Owner</p>
                <p className="font-medium text-charcoal">{petInfo.ownerName}</p>
              </div>
            </div>

            {/* Rabies Status */}
            <div className={`
              p-4 rounded-xl mb-6
              ${petInfo.rabiesStatus.isCompliant ? 'bg-green-50' : 'bg-red-50'}
            `}>
              <div className="flex items-center gap-3">
                {petInfo.rabiesStatus.isCompliant ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <XCircle className="h-8 w-8 text-rust" />
                )}
                <div>
                  <p className="font-semibold text-lg">
                    {petInfo.rabiesStatus.isCompliant 
                      ? '✅ Travel Ready' 
                      : '⚠️ Not Travel Ready'}
                  </p>
                  <p className="text-sm text-stone">
                    {petInfo.rabiesStatus.isCompliant 
                      ? 'Rabies vaccination is current' 
                      : 'Rabies vaccination expired or missing'}
                  </p>
                  {petInfo.rabiesStatus.expiresAt && (
                    <p className="text-sm text-stone mt-1">
                      Expires: {formatDate(petInfo.rabiesStatus.expiresAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Level */}
            <div className="flex items-center justify-between p-4 bg-sand/50 rounded-xl">
              <div>
                <p className="text-sm text-stone">Verification Level</p>
                <p className="font-medium text-charcoal">{petInfo.verificationLevel}</p>
              </div>
              <Badge variant={petInfo.verificationLevel === 'BASIC' ? 'default' : 'success'}>
                {petInfo.verificationLevel}
              </Badge>
            </div>
          </div>
        </Card>

        {/* CTA Card - Show for non-authenticated users */}
        {!isAuthenticated && (
          <Card className="bg-gradient-to-br from-forest/5 to-pine/5 border-forest/20">
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center h-14 w-14 bg-forest/10 rounded-full mb-4">
                <Sparkles className="h-7 w-7 text-forest" />
              </div>
              <h2 className="text-xl font-display font-bold text-charcoal mb-2">
                Get Your Pet's Digital ID
              </h2>
              <p className="text-stone mb-6 max-w-sm mx-auto">
                {petInfo.name} is protected by PetPort. Create a free digital passport for your pet in under a minute!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/register">
                  <Button size="lg">
                    Create Free Account
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Authenticated user */}
        {isAuthenticated && (
          <div className="text-center">
            <Link to="/dashboard">
              <Button variant="outline">
                Go to My Dashboard
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center mt-8 text-sm text-stone">
          <p>
            This is a verified PetPort profile. 
            <Link to="/verify" className="text-forest hover:underline ml-1">
              Learn more about verification
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
