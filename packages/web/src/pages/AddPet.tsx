import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, QrCode, Share2, Edit, Check, Copy } from 'lucide-react';
import { DashboardLayout } from '@/components/Layout';
import { Card, Button, Input, Alert, LoadingState, useToast } from '@/components/ui';
import { pets, Pet, ApiError } from '@/lib/api';

// Species options with emojis for visual selection
const SPECIES_OPTIONS = [
  { value: 'DOG', label: 'Dog', emoji: '🐕' },
  { value: 'CAT', label: 'Cat', emoji: '🐈' },
  { value: 'BIRD', label: 'Bird', emoji: '🐦' },
  { value: 'RABBIT', label: 'Rabbit', emoji: '🐰' },
  { value: 'REPTILE', label: 'Reptile', emoji: '🦎' },
  { value: 'OTHER', label: 'Other', emoji: '🐾' },
] as const;

type Species = typeof SPECIES_OPTIONS[number]['value'];

interface QuickAddForm {
  name: string;
  species: Species;
}

export function AddPetPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPet, setCreatedPet] = useState<Pet | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [form, setForm] = useState<QuickAddForm>({
    name: '',
    species: 'DOG',
  });

  const handleSpeciesSelect = (species: Species) => {
    setForm(prev => ({ ...prev, species }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      setError('Please enter your pet\'s name');
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
      const pet = await pets.create({
        name: form.name.trim(),
        species: form.species,
      });
      setCreatedPet(pet);
      setStep('success');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create pet. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = async () => {
    if (!createdPet) return;
    
    try {
      await navigator.clipboard.writeText(createdPet.petportId);
      setCopied(true);
      toast.success('PetPort ID copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleShare = async () => {
    if (!createdPet) return;
    
    const shareData = {
      title: `${createdPet.name}'s PetPort ID`,
      text: `Check out ${createdPet.name}'s digital pet passport! ID: ${createdPet.petportId}`,
      url: `${window.location.origin}/verify/${createdPet.petportId}`,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy link
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      // User cancelled share - that's fine
      if ((err as Error).name !== 'AbortError') {
        toast.error('Failed to share');
      }
    }
  };

  // Success step - show PetPort ID and next actions
  if (step === 'success' && createdPet) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto text-center">
          {/* Celebration header */}
          <div className="mb-8 animate-slideUp">
            <div className="inline-flex items-center justify-center h-20 w-20 bg-green-100 rounded-full mb-4">
              <Sparkles className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-display font-bold text-forest mb-2">
              {createdPet.name} is Protected! 🎉
            </h1>
            <p className="text-stone">
              Your pet now has a unique digital identity
            </p>
          </div>

          {/* PetPort ID Card */}
          <Card className="mb-6 animate-slideUp" style={{ animationDelay: '100ms' }}>
            <div className="flex flex-col items-center gap-4">
              {/* Species emoji avatar */}
              <div className="h-24 w-24 bg-sand rounded-2xl flex items-center justify-center text-5xl">
                {SPECIES_OPTIONS.find(s => s.value === createdPet.species)?.emoji || '🐾'}
              </div>
              
              {/* Pet name */}
              <h2 className="text-2xl font-bold text-charcoal">{createdPet.name}</h2>
              
              {/* PetPort ID with copy button */}
              <div className="flex items-center gap-2 bg-forest/5 px-4 py-3 rounded-xl">
                <span className="font-mono text-lg font-semibold text-forest">
                  {createdPet.petportId}
                </span>
                <button
                  onClick={handleCopyId}
                  className="p-2 hover:bg-forest/10 rounded-lg transition-colors"
                  aria-label="Copy PetPort ID"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5 text-forest" />
                  )}
                </button>
              </div>
              
              <p className="text-sm text-stone">
                This unique ID can be used to verify {createdPet.name}'s identity
              </p>
            </div>
          </Card>

          {/* Action buttons */}
          <div className="space-y-3 animate-slideUp" style={{ animationDelay: '200ms' }}>
            {/* Primary: View QR & Share */}
            <Button fullWidth size="lg" onClick={handleShare}>
              <Share2 className="h-5 w-5" />
              Share PetPort ID
            </Button>
            
            {/* Secondary: View full profile */}
            <Link to={`/pets/${createdPet.id}`} className="block">
              <Button fullWidth variant="outline" size="lg">
                <QrCode className="h-5 w-5" />
                View QR Code & Passport
              </Button>
            </Link>
            
            {/* Tertiary: Complete profile */}
            <Link to={`/pets/${createdPet.id}/edit`} className="block">
              <Button fullWidth variant="ghost">
                <Edit className="h-5 w-5" />
                Add More Details (optional)
              </Button>
            </Link>
          </div>

          {/* Add another pet link */}
          <button
            onClick={() => {
              setStep('form');
              setCreatedPet(null);
              setForm({ name: '', species: 'DOG' });
            }}
            className="mt-6 text-forest font-medium hover:underline"
          >
            + Add Another Pet
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Form step - Quick add
  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-sand rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-display font-bold text-forest">Add a Pet</h1>
            <p className="text-stone mt-1">Just 2 quick questions to get started</p>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Creating your pet's digital identity..." />
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Error display */}
            {error && (
              <Alert variant="error" className="mb-6">
                {error}
              </Alert>
            )}

            {/* Pet name input - large, friendly */}
            <Card className="mb-6">
              <label className="block text-lg font-semibold text-charcoal mb-3">
                What's your pet's name?
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Buddy, Luna, Max..."
                className="text-lg py-4"
                autoFocus
                autoComplete="off"
              />
            </Card>

            {/* Species selection - visual grid */}
            <Card className="mb-8">
              <label className="block text-lg font-semibold text-charcoal mb-4">
                What type of pet is {form.name || 'your pet'}?
              </label>
              <div className="grid grid-cols-3 gap-3">
                {SPECIES_OPTIONS.map((species) => (
                  <button
                    key={species.value}
                    type="button"
                    onClick={() => handleSpeciesSelect(species.value)}
                    className={`
                      flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                      ${form.species === species.value
                        ? 'border-forest bg-forest/5 ring-2 ring-forest/20'
                        : 'border-sand hover:border-forest/30 hover:bg-sand/50'
                      }
                    `}
                  >
                    <span className="text-4xl">{species.emoji}</span>
                    <span className={`text-sm font-medium ${
                      form.species === species.value ? 'text-forest' : 'text-charcoal'
                    }`}>
                      {species.label}
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Submit button */}
            <Button 
              type="submit" 
              fullWidth 
              size="lg"
              disabled={!form.name.trim()}
            >
              Create PetPort ID
              <ArrowRight className="h-5 w-5" />
            </Button>

            {/* Optional: Full form link */}
            <p className="text-center text-sm text-stone mt-4">
              Want to add more details now?{' '}
              <Link to="/pets/new/complete" className="text-forest font-medium hover:underline">
                Use complete form
              </Link>
            </p>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
