import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/Layout';
import { Card, Button, Input, Select, Alert } from '@/components/ui';
import { pets, CreatePetInput, ApiError } from '@/lib/api';

const SPECIES_OPTIONS = [
  { value: 'DOG', label: 'Dog' },
  { value: 'CAT', label: 'Cat' },
  { value: 'BIRD', label: 'Bird' },
  { value: 'RABBIT', label: 'Rabbit' },
  { value: 'REPTILE', label: 'Reptile' },
  { value: 'OTHER', label: 'Other' },
];

const SEX_OPTIONS = [
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
];

export function AddPetCompletePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreatePetInput>({
    name: '',
    species: 'DOG',
    breed: '',
    sex: 'UNKNOWN',
    dateOfBirth: '',
    color: '',
    microchipId: '',
  });

  const handleChange = (field: keyof CreatePetInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const pet = await pets.create({
        ...form,
        breed: form.breed || null,
        dateOfBirth: form.dateOfBirth || null,
        color: form.color || null,
        microchipId: form.microchipId || null,
      });
      navigate(`/pets/${pet.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create pet');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
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
            <h1 className="text-3xl font-display font-bold text-forest">Add a New Pet</h1>
            <p className="text-stone mt-1">Complete profile with all details</p>
          </div>
        </div>

        {/* Quick add suggestion */}
        <Alert variant="info" className="mb-6">
          <span>
            Just want to get started quickly?{' '}
            <Link to="/pets/new" className="font-medium underline">
              Use the quick form
            </Link>{' '}
            (only 2 fields!)
          </span>
        </Alert>

        <Card>
          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Pet Name *"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Buddy, Whiskers"
              required
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <Select
                label="Species *"
                value={form.species}
                onChange={(e) => handleChange('species', e.target.value)}
                options={SPECIES_OPTIONS}
              />
              <Select
                label="Sex"
                value={form.sex || 'UNKNOWN'}
                onChange={(e) => handleChange('sex', e.target.value)}
                options={SEX_OPTIONS}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Breed"
                value={form.breed || ''}
                onChange={(e) => handleChange('breed', e.target.value)}
                placeholder="e.g., Golden Retriever"
              />
              <Input
                label="Color"
                value={form.color || ''}
                onChange={(e) => handleChange('color', e.target.value)}
                placeholder="e.g., Golden, Black"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Date of Birth"
                type="date"
                value={form.dateOfBirth || ''}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
              />
              <Input
                label="Microchip ID"
                value={form.microchipId || ''}
                onChange={(e) => handleChange('microchipId', e.target.value)}
                placeholder="15-digit number"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Add Pet
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
