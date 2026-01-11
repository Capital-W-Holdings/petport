import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PawPrint, ArrowRight, ArrowLeft, X, Sparkles, QrCode, Shield, Check, Camera } from 'lucide-react';
import { Button, Input, Alert, useToast } from '@/components/ui';
import { pets, Pet, ApiError } from '@/lib/api';

// Species options with emojis
const SPECIES_OPTIONS = [
  { value: 'DOG', label: 'Dog', emoji: '🐕' },
  { value: 'CAT', label: 'Cat', emoji: '🐈' },
  { value: 'BIRD', label: 'Bird', emoji: '🐦' },
  { value: 'RABBIT', label: 'Rabbit', emoji: '🐰' },
  { value: 'REPTILE', label: 'Reptile', emoji: '🦎' },
  { value: 'OTHER', label: 'Other', emoji: '🐾' },
] as const;

type Species = typeof SPECIES_OPTIONS[number]['value'];

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

type Step = 'welcome' | 'name' | 'species' | 'photo' | 'success';

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState<Step>('welcome');
  const [petName, setPetName] = useState('');
  const [species, setSpecies] = useState<Species>('DOG');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPet, setCreatedPet] = useState<Pet | null>(null);

  // Progress percentage
  const progressMap: Record<Step, number> = {
    welcome: 0,
    name: 25,
    species: 50,
    photo: 75,
    success: 100,
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePet = async () => {
    if (!petName.trim()) {
      setError('Please enter your pet\'s name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create the pet
      const pet = await pets.create({
        name: petName.trim(),
        species,
      });

      // Upload photo if provided
      if (photoFile) {
        try {
          await pets.uploadPhoto(pet.id, photoFile);
        } catch {
          // Photo upload failed, but pet was created - continue anyway
          toast.warning('Pet created, but photo upload failed. You can add it later.');
        }
      }

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

  const handleComplete = () => {
    onComplete();
    if (createdPet) {
      navigate(`/pets/${createdPet.id}`);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  // Render step content
  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <div className="text-center animate-fadeIn">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center h-24 w-24 bg-forest/10 rounded-full mb-6">
                <PawPrint className="h-12 w-12 text-forest" />
              </div>
              <h1 className="text-3xl font-display font-bold text-charcoal mb-3">
                Welcome to PetPort! 🎉
              </h1>
              <p className="text-lg text-stone max-w-md mx-auto">
                Let's create a digital passport for your pet in just 3 quick steps.
              </p>
            </div>

            {/* Value props */}
            <div className="grid grid-cols-3 gap-6 mb-10 max-w-lg mx-auto">
              <div className="text-center">
                <div className="h-12 w-12 bg-sand rounded-xl flex items-center justify-center mx-auto mb-2">
                  <QrCode className="h-6 w-6 text-forest" />
                </div>
                <p className="text-sm text-stone">Unique QR Code</p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 bg-sand rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Shield className="h-6 w-6 text-forest" />
                </div>
                <p className="text-sm text-stone">Instant Verification</p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 bg-sand rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Sparkles className="h-6 w-6 text-forest" />
                </div>
                <p className="text-sm text-stone">Travel Ready</p>
              </div>
            </div>

            <div className="space-y-3">
              <Button size="lg" onClick={() => setStep('name')} className="min-w-[200px]">
                Let's Go!
                <ArrowRight className="h-5 w-5" />
              </Button>
              <div>
                <button 
                  onClick={handleSkip}
                  className="text-stone hover:text-charcoal text-sm"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        );

      case 'name':
        return (
          <div className="animate-fadeIn">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-charcoal mb-2">
                What's your pet's name?
              </h2>
              <p className="text-stone">This is how we'll identify your furry friend</p>
            </div>

            {error && (
              <Alert variant="error" className="mb-6">
                {error}
              </Alert>
            )}

            <div className="max-w-sm mx-auto mb-8">
              <Input
                value={petName}
                onChange={(e) => {
                  setPetName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g., Buddy, Luna, Max..."
                className="text-lg py-4 text-center"
                autoFocus
              />
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => setStep('welcome')}>
                <ArrowLeft className="h-5 w-5" />
                Back
              </Button>
              <Button 
                onClick={() => {
                  if (!petName.trim()) {
                    setError('Please enter a name');
                    return;
                  }
                  setStep('species');
                }}
                disabled={!petName.trim()}
              >
                Continue
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        );

      case 'species':
        return (
          <div className="animate-fadeIn">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-charcoal mb-2">
                What type of pet is {petName}?
              </h2>
              <p className="text-stone">Select the species that best matches</p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
              {SPECIES_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSpecies(option.value)}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                    ${species === option.value
                      ? 'border-forest bg-forest/5 ring-2 ring-forest/20'
                      : 'border-sand hover:border-forest/30 hover:bg-sand/50'
                    }
                  `}
                >
                  <span className="text-4xl">{option.emoji}</span>
                  <span className={`text-sm font-medium ${
                    species === option.value ? 'text-forest' : 'text-charcoal'
                  }`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => setStep('name')}>
                <ArrowLeft className="h-5 w-5" />
                Back
              </Button>
              <Button onClick={() => setStep('photo')}>
                Continue
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        );

      case 'photo':
        return (
          <div className="animate-fadeIn">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-charcoal mb-2">
                Add a photo of {petName}
              </h2>
              <p className="text-stone">This helps identify your pet (optional)</p>
            </div>

            {error && (
              <Alert variant="error" className="mb-6">
                {error}
              </Alert>
            )}

            <div className="max-w-sm mx-auto mb-8">
              <label className="block">
                <div className={`
                  relative h-48 w-48 mx-auto rounded-2xl border-2 border-dashed 
                  ${photoPreview ? 'border-forest' : 'border-sand hover:border-forest/50'}
                  transition-colors cursor-pointer overflow-hidden
                `}>
                  {photoPreview ? (
                    <>
                      <img 
                        src={photoPreview} 
                        alt="Pet preview" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Camera className="h-8 w-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <div className="h-16 w-16 bg-sand rounded-full flex items-center justify-center">
                        <Camera className="h-8 w-8 text-stone" />
                      </div>
                      <span className="text-sm text-stone">Tap to add photo</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => setStep('species')}>
                <ArrowLeft className="h-5 w-5" />
                Back
              </Button>
              <Button onClick={handleCreatePet} loading={loading}>
                {loading ? 'Creating...' : 'Create PetPort ID'}
                {!loading && <Sparkles className="h-5 w-5" />}
              </Button>
            </div>

            {!photoPreview && (
              <p className="text-center text-sm text-stone mt-4">
                <button 
                  onClick={handleCreatePet}
                  className="text-forest hover:underline"
                  disabled={loading}
                >
                  Skip photo for now
                </button>
              </p>
            )}
          </div>
        );

      case 'success':
        return (
          <div className="text-center animate-fadeIn">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center h-24 w-24 bg-green-100 rounded-full mb-6">
                <Check className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-display font-bold text-charcoal mb-3">
                {petName} is Protected! 🎉
              </h2>
              <p className="text-lg text-stone max-w-md mx-auto">
                Your pet now has a unique digital identity
              </p>
            </div>

            {/* PetPort ID display */}
            {createdPet && (
              <div className="bg-forest/5 rounded-2xl p-6 max-w-sm mx-auto mb-8">
                <div className="text-6xl mb-4">
                  {SPECIES_OPTIONS.find(s => s.value === species)?.emoji || '🐾'}
                </div>
                <p className="font-mono text-xl font-bold text-forest mb-2">
                  {createdPet.petportId}
                </p>
                <p className="text-sm text-stone">
                  Share this ID to verify {petName}'s identity
                </p>
              </div>
            )}

            <Button size="lg" onClick={handleComplete}>
              View {petName}'s Profile
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-cream flex flex-col">
      {/* Header with progress and skip */}
      <div className="flex items-center justify-between p-4 border-b border-sand">
        {/* Progress bar */}
        <div className="flex-1 max-w-xs">
          <div className="h-2 bg-sand rounded-full overflow-hidden">
            <div 
              className="h-full bg-forest transition-all duration-500 ease-out"
              style={{ width: `${progressMap[step]}%` }}
            />
          </div>
          <p className="text-xs text-stone mt-1">
            Step {Object.keys(progressMap).indexOf(step) + 1} of 5
          </p>
        </div>

        {/* Skip button */}
        {step !== 'success' && (
          <button
            onClick={handleSkip}
            className="p-2 hover:bg-sand rounded-lg transition-colors ml-4"
            aria-label="Skip onboarding"
          >
            <X className="h-5 w-5 text-stone" />
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <div className="w-full max-w-xl">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}

// Hook to manage onboarding state
const ONBOARDING_KEY = 'petport_onboarding_complete';

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      setShowOnboarding(true);
    }
    setChecked(true);
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  const skipOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'skipped');
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setShowOnboarding(true);
  };

  return {
    showOnboarding: checked && showOnboarding,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    isChecked: checked,
  };
}
