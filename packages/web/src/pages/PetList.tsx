import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { DashboardLayout } from '@/components/Layout';
import { Card, Button, Badge, Input, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { pets, Pet } from '@/lib/api';
import { getSpeciesEmoji } from '@/lib/utils';

export function PetListPage() {
  const [petList, setPetList] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    try {
      setLoading(true);
      const data = await pets.list();
      setPetList(data.pets);
      setError(null);
    } catch {
      setError('Failed to load pets');
    } finally {
      setLoading(false);
    }
  };

  const filteredPets = petList.filter((pet) =>
    pet.name.toLowerCase().includes(search.toLowerCase()) ||
    pet.breed?.toLowerCase().includes(search.toLowerCase()) ||
    pet.petportId.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <DashboardLayout><LoadingState message="Loading your pets..." /></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout><ErrorState message={error} onRetry={loadPets} /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-display font-bold text-forest">My Pets</h1>
          <Link to="/pets/new">
            <Button>
              <Plus className="h-5 w-5" />
              Add Pet
            </Button>
          </Link>
        </div>

        {petList.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone" />
            <Input
              className="pl-10"
              placeholder="Search by name, breed, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {petList.length === 0 ? (
          <Card>
            <EmptyState
              icon={<span className="text-4xl">🐾</span>}
              title="No pets yet"
              description="Add your first pet to get started with PetPort"
              action={
                <Link to="/pets/new">
                  <Button>
                    <Plus className="h-5 w-5" />
                    Add Your First Pet
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : filteredPets.length === 0 ? (
          <Card>
            <EmptyState
              title="No pets found"
              description="Try a different search term"
            />
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPets.map((pet) => (
              <Link key={pet.id} to={`/pets/${pet.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 bg-sand rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                      {getSpeciesEmoji(pet.species)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-charcoal truncate">{pet.name}</h3>
                      <p className="text-sm text-stone">
                        {pet.breed || pet.species.charAt(0) + pet.species.slice(1).toLowerCase()}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant={pet.verificationLevel === 'BASIC' ? 'default' : 'success'}>
                          {pet.verificationLevel}
                        </Badge>
                        <span className="text-xs text-stone font-mono">{pet.petportId}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
