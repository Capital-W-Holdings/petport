import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/Layout';
import { Card, Button, Input, Select, Alert, LoadingState, ErrorState } from '@/components/ui';
import { pets, Pet, ApiError } from '@/lib/api';

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

export function EditPetPage() {
  const { petId } = useParams<{ petId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    species: 'DOG',
    breed: '',
    sex: 'UNKNOWN',
    dateOfBirth: '',
    color: '',
    microchipId: '',
  });

  useEffect(() => {
    if (petId) loadPet();
  }, [petId]);

  const loadPet = async () => {
    if (!petId) return;
    try {
      setLoading(true);
      const pet = await pets.get(petId);
      setForm({
        name: pet.name,
        species: pet.species,
        breed: pet.breed || '',
        sex: pet.sex,
        dateOfBirth: pet.dateOfBirth || '',
        color: pet.color || '',
        microchipId: pet.microchipId || '',
      });
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load pet');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId) return;
    
    setSaveError(null);
    setSaving(true);

    try {
      await pets.update(petId, {
        name: form.name,
        species: form.species as Pet['species'],
        breed: form.breed || null,
        sex: form.sex as Pet['sex'],
        dateOfBirth: form.dateOfBirth || null,
        color: form.color || null,
        microchipId: form.microchipId || null,
      });
      navigate(`/pets/${petId}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveError(err.message);
      } else {
        setSaveError('Failed to update pet');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <DashboardLayout><LoadingState message="Loading pet..." /></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout><ErrorState message={error} onRetry={loadPet} /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-sand rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-3xl font-display font-bold text-forest">Edit Pet</h1>
        </div>

        <Card>
          {saveError && (
            <Alert variant="error" className="mb-6">
              {saveError}
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
                value={form.sex}
                onChange={(e) => handleChange('sex', e.target.value)}
                options={SEX_OPTIONS}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Breed"
                value={form.breed}
                onChange={(e) => handleChange('breed', e.target.value)}
                placeholder="e.g., Golden Retriever"
              />
              <Input
                label="Color"
                value={form.color}
                onChange={(e) => handleChange('color', e.target.value)}
                placeholder="e.g., Golden, Black"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Date of Birth"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
              />
              <Input
                label="Microchip ID"
                value={form.microchipId}
                onChange={(e) => handleChange('microchipId', e.target.value)}
                placeholder="15-digit number"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
