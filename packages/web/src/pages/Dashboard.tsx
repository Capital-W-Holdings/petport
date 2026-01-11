import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint, Plus, Syringe, FileText, AlertTriangle, Download, Loader2, QrCode } from 'lucide-react';
import { DashboardLayout } from '@/components/Layout';
import { Card, Button, Badge, LoadingState, ErrorState, Alert, useToast } from '@/components/ui';
import { OnboardingWizard, useOnboarding } from '@/components/OnboardingWizard';
import { NotificationCenter } from '@/components/NotificationCenter';
import { useAuth } from '@/hooks/useAuth';
import { pets, auth, PetWithSummary } from '@/lib/api';
import { getSpeciesEmoji } from '@/lib/utils';

export function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { showOnboarding, completeOnboarding, skipOnboarding, isChecked } = useOnboarding();
  const [petList, setPetList] = useState<PetWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    try {
      setLoading(true);
      // Use summary endpoint - single API call instead of N+1
      const data = await pets.summary();
      setPetList(data.pets);
      setError(null);
    } catch {
      setError('Failed to load pets');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await auth.downloadExport();
      toast.success('Data exported successfully');
    } catch {
      toast.error('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Calculate stats
  const totalVaccinations = petList.reduce((sum, pet) => sum + pet.vaccinationCount, 0);
  const totalHealthRecords = petList.reduce((sum, pet) => sum + pet.healthRecordCount, 0);
  const alertCount = petList.filter(
    (pet) => !pet.rabiesCompliance.isCompliant
  ).length;

  // Find upcoming expirations (within 30 days)
  const upcomingExpirations = petList
    .filter((pet) => {
      const days = pet.rabiesCompliance.daysUntilExpiry;
      return pet.rabiesCompliance.isCompliant && days !== null && days > 0 && days <= 30;
    })
    .map((pet) => ({
      pet,
      daysLeft: pet.rabiesCompliance.daysUntilExpiry!,
    }));

  // Handle onboarding completion - reload pets
  const handleOnboardingComplete = () => {
    completeOnboarding();
    loadPets();
  };

  // Show onboarding wizard for first-time users with no pets
  if (isChecked && showOnboarding && !loading && petList.length === 0) {
    return (
      <OnboardingWizard 
        onComplete={handleOnboardingComplete}
        onSkip={skipOnboarding}
      />
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading your dashboard..." />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState message={error} onRetry={loadPets} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-forest">
              Welcome back, {user?.name.split(' ')[0]}!
            </h1>
            <p className="text-stone mt-1">Here's an overview of your pets</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationCenter pets={petList} />
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              Export Data
            </Button>
            <Link to="/pets/new">
              <Button>
                <Plus className="h-5 w-5" />
                Add Pet
              </Button>
            </Link>
          </div>
        </div>

        {/* Alerts */}
        {upcomingExpirations.length > 0 && (
          <Alert variant="warning">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <strong>Vaccination Reminder:</strong>{' '}
              {upcomingExpirations.map((item, i) => (
                <span key={item.pet.id}>
                  {item.pet.name}'s rabies vaccination expires in {item.daysLeft} days
                  {i < upcomingExpirations.length - 1 ? '; ' : ''}
                </span>
              ))}
            </div>
          </Alert>
        )}

        {alertCount > 0 && (
          <Alert variant="error">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <strong>Action Required:</strong> {alertCount} pet{alertCount > 1 ? 's' : ''} with expired or missing rabies vaccination
            </div>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Pets', value: petList.length, icon: PawPrint, color: 'bg-forest' },
            { label: 'Vaccinations', value: totalVaccinations, icon: Syringe, color: 'bg-pine' },
            { label: 'Health Records', value: totalHealthRecords, icon: FileText, color: 'bg-terracotta' },
            { label: 'Alerts', value: alertCount, icon: AlertTriangle, color: alertCount > 0 ? 'bg-rust' : 'bg-stone' },
          ].map((stat, i) => (
            <Card key={i} padding="sm" className="flex items-center gap-4">
              <div className={`${stat.color} h-12 w-12 rounded-lg flex items-center justify-center`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-charcoal">{stat.value}</p>
                <p className="text-sm text-stone">{stat.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Pets */}
        <div>
          <h2 className="text-xl font-display font-semibold text-charcoal mb-4">Your Pets</h2>
          {petList.length === 0 ? (
            <Card className="py-12">
              <div className="text-center max-w-md mx-auto">
                {/* Hero image/icon */}
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center h-24 w-24 bg-forest/10 rounded-full mb-4">
                    <PawPrint className="h-12 w-12 text-forest" />
                  </div>
                </div>
                
                {/* Welcome message */}
                <h2 className="text-2xl font-display font-bold text-charcoal mb-2">
                  Welcome to PetPort! 🎉
                </h2>
                <p className="text-stone mb-6">
                  Create your pet's digital passport in just 30 seconds. 
                  Track vaccinations, share health records, and get a unique QR code for instant verification.
                </p>
                
                {/* Primary CTA */}
                <Link to="/pets/new">
                  <Button size="lg" className="mb-4">
                    <Plus className="h-5 w-5" />
                    Add Your First Pet
                  </Button>
                </Link>
                
                {/* Value props */}
                <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-sand">
                  <div className="text-center">
                    <div className="text-2xl mb-1">🆔</div>
                    <p className="text-xs text-stone">Unique Digital ID</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">💉</div>
                    <p className="text-xs text-stone">Vaccination Tracking</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">✈️</div>
                    <p className="text-xs text-stone">Travel Ready Status</p>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {petList.map((pet) => (
                <Card key={pet.id} className="hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    {/* Pet Photo/Avatar */}
                    <Link to={`/pets/${pet.id}`} className="flex-shrink-0">
                      {pet.photoUrl ? (
                        <img
                          src={pet.photoUrl}
                          alt={pet.name}
                          className="h-16 w-16 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 bg-sand rounded-xl flex items-center justify-center text-3xl">
                          {getSpeciesEmoji(pet.species)}
                        </div>
                      )}
                    </Link>
                    
                    {/* Pet Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/pets/${pet.id}`} className="min-w-0">
                          <h3 className="font-semibold text-charcoal truncate hover:text-forest transition-colors">
                            {pet.name}
                          </h3>
                          <p className="text-sm text-stone">
                            {pet.breed || pet.species.charAt(0) + pet.species.slice(1).toLowerCase()}
                          </p>
                        </Link>
                        
                        {/* QR Quick Access Button */}
                        <Link 
                          to={`/pets/${pet.id}?showQR=true`}
                          className="p-2 hover:bg-forest/10 rounded-lg transition-colors flex-shrink-0"
                          title="View QR Code"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <QrCode className="h-5 w-5 text-forest" />
                        </Link>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant={pet.verificationLevel === 'BASIC' ? 'default' : 'success'}>
                          {pet.verificationLevel}
                        </Badge>
                        <Badge variant={pet.rabiesCompliance.isCompliant ? 'success' : 'error'}>
                          {pet.rabiesCompliance.isCompliant ? 'Travel Ready' : 'Not Compliant'}
                        </Badge>
                      </div>
                      <p className="text-xs text-stone font-mono mt-1">{pet.petportId}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
