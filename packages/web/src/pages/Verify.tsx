import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Search, CheckCircle, XCircle, Shield, Sparkles, ArrowRight } from 'lucide-react';
import { PublicLayout } from '@/components/Layout';
import { Card, Button, Input, Badge, LoadingState, ErrorState } from '@/components/ui';
import { publicApi, PublicPetInfo, ApiError } from '@/lib/api';
import { getSpeciesEmoji } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export function VerifyPage() {
  const { petportId: urlPetportId } = useParams<{ petportId?: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [petportId, setPetportId] = useState(urlPetportId || '');
  const [petInfo, setPetInfo] = useState<PublicPetInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  React.useEffect(() => {
    if (urlPetportId) {
      handleVerify(urlPetportId);
    }
  }, [urlPetportId]);

  const handleVerify = async (id?: string) => {
    const searchId = id || petportId.trim().toUpperCase();
    if (!searchId) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const info = await publicApi.verify(searchId);
      setPetInfo(info);
      if (!id) {
        navigate(`/verify/${searchId}`, { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code === 'NOT_FOUND' ? 'Pet not found. Please check the ID and try again.' : err.message);
      } else {
        setError('Failed to verify pet');
      }
      setPetInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify();
  };

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-forest rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-forest">Verify a Pet</h1>
          <p className="text-stone mt-2">Enter a PetPort ID to verify pet identity and vaccination status</p>
        </div>

        <Card className="mb-8">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <Input
              value={petportId}
              onChange={(e) => setPetportId(e.target.value)}
              placeholder="PP-XXXX-XXXX"
              className="flex-1 font-mono uppercase"
            />
            <Button type="submit" loading={loading}>
              <Search className="h-5 w-5" />
              Verify
            </Button>
          </form>
        </Card>

        {loading && <LoadingState message="Verifying pet..." />}

        {error && searched && !loading && (
          <Card>
            <ErrorState message={error} />
          </Card>
        )}

        {petInfo && !loading && (
          <>
            <Card className="animate-fadeIn">
              <div className="flex items-start gap-6">
                <div className="h-24 w-24 bg-sand rounded-xl flex items-center justify-center text-5xl flex-shrink-0">
                  {getSpeciesEmoji(petInfo.species)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-display font-bold text-charcoal">{petInfo.name}</h2>
                    <Badge variant={petInfo.verificationLevel === 'BASIC' ? 'default' : 'success'}>
                      {petInfo.verificationLevel}
                    </Badge>
                  </div>
                  <p className="text-stone font-mono text-sm mb-4">{petInfo.petportId}</p>
                  
                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-stone">Species</p>
                      <p className="font-medium">{petInfo.species}</p>
                    </div>
                    <div>
                      <p className="text-sm text-stone">Breed</p>
                      <p className="font-medium">{petInfo.breed || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-stone">Owner</p>
                      <p className="font-medium">{petInfo.ownerName}</p>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${petInfo.rabiesStatus.isCompliant ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex items-center gap-3">
                      {petInfo.rabiesStatus.isCompliant ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-rust" />
                      )}
                      <div>
                        <p className="font-medium">
                          {petInfo.rabiesStatus.isCompliant ? 'Rabies Vaccination Valid' : 'Rabies Vaccination Not Current'}
                        </p>
                        {petInfo.rabiesStatus.expiresAt && (
                          <p className="text-sm text-stone">
                            Expires: {new Date(petInfo.rabiesStatus.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Viral CTA - Show only to non-authenticated users */}
            {!isAuthenticated && (
              <Card className="mt-6 bg-gradient-to-br from-forest/5 to-pine/5 border-forest/20 animate-fadeIn" style={{ animationDelay: '200ms' }}>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center h-14 w-14 bg-forest/10 rounded-full mb-4">
                    <Sparkles className="h-7 w-7 text-forest" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-charcoal mb-2">
                    Get Your Pet's Digital ID
                  </h3>
                  <p className="text-stone mb-6 max-w-sm mx-auto">
                    {petInfo.name} is protected by PetPort. Create a free digital passport for your pet in 30 seconds!
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

            {/* Authenticated user - link to dashboard */}
            {isAuthenticated && (
              <div className="mt-6 text-center animate-fadeIn" style={{ animationDelay: '200ms' }}>
                <Link to="/dashboard">
                  <Button variant="outline">
                    Go to My Dashboard
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}

        {!searched && !loading && (
          <div className="text-center text-stone">
            <p>Find a PetPort ID on the pet's tag, collar, or digital passport.</p>
            <p className="mt-2">Format: PP-XXXX-XXXX</p>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
