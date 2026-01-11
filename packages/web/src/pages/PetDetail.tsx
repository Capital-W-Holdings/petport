import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Syringe, FileText, Plus, Trash2, CheckCircle, XCircle, QrCode, Download, Camera, Edit, Loader2, Share2, Copy, Check } from 'lucide-react';
import { DashboardLayout } from '@/components/Layout';
import { Card, Button, Badge, Modal, Input, Select, Alert, LoadingState, ErrorState, useToast } from '@/components/ui';
import { ProfileProgress } from '@/components/ProfileProgress';
import { pets, Pet, Vaccination, HealthRecord, RabiesCompliance, QRCodeData, ApiError } from '@/lib/api';
import { getSpeciesEmoji } from '@/lib/utils';

export function PetDetailPage() {
  const { petId } = useParams<{ petId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pet, setPet] = useState<Pet | null>(null);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [rabiesCompliance, setRabiesCompliance] = useState<RabiesCompliance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVaxModal, setShowVaxModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Auto-open QR modal if showQR query param is present
  useEffect(() => {
    if (searchParams.get('showQR') === 'true' && !loading && pet) {
      setShowQRModal(true);
      // Remove the query param to prevent re-opening on refresh
      searchParams.delete('showQR');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, loading, pet, setSearchParams]);

  useEffect(() => {
    if (petId) loadPetData();
  }, [petId]);

  const loadPetData = async () => {
    if (!petId) return;
    try {
      setLoading(true);
      const [petData, vaxData, healthData, complianceData] = await Promise.all([
        pets.get(petId),
        pets.getVaccinations(petId),
        pets.getHealth(petId),
        pets.getRabiesCompliance(petId),
      ]);
      setPet(petData);
      setVaccinations(vaxData.vaccinations);
      setHealthRecords(healthData.records);
      setRabiesCompliance(complianceData);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load pet data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!petId || !confirm('Are you sure you want to delete this pet?')) return;
    try {
      await pets.delete(petId);
      toast.success('Pet deleted successfully');
      navigate('/pets');
    } catch {
      toast.error('Failed to delete pet');
    }
  };

  const handleDownloadPassport = async () => {
    if (!pet) return;
    try {
      await pets.downloadPassport(pet.id, pet.petportId);
    } catch {
      toast.error('Failed to download passport');
    }
  };

  if (loading) {
    return <DashboardLayout><LoadingState message="Loading pet details..." /></DashboardLayout>;
  }

  if (error || !pet) {
    return <DashboardLayout><ErrorState message={error || 'Pet not found'} onRetry={loadPetData} /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-sand rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-display font-bold text-forest">{pet.name}</h1>
            <p className="text-stone font-mono">{pet.petportId}</p>
          </div>
          <Link to={`/pets/${pet.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4" /> Edit
            </Button>
          </Link>
          <Button variant="ghost" onClick={handleDelete} className="text-rust hover:bg-red-50">
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>

        {/* Pet Profile with Photo */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Photo & Actions Card */}
          <Card>
            <PhotoUpload pet={pet} onPhotoChange={loadPetData} />
            <div className="mt-4 space-y-2">
              <Button fullWidth variant="outline" onClick={() => setShowQRModal(true)}>
                <QrCode className="h-4 w-4" /> View QR Code
              </Button>
              <Button fullWidth variant="outline" onClick={handleDownloadPassport}>
                <Download className="h-4 w-4" /> Download Passport
              </Button>
            </div>
          </Card>

          {/* Pet Info */}
          <Card className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Pet Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                ['Species', pet.species],
                ['Breed', pet.breed || '-'],
                ['Sex', pet.sex],
                ['Color', pet.color || '-'],
                ['Date of Birth', pet.dateOfBirth || '-'],
                ['Weight', pet.weight ? `${pet.weight} lbs` : '-'],
                ['Microchip ID', pet.microchipId || '-'],
                ['Verification', pet.verificationLevel],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <p className="text-sm text-stone">{label}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Profile Completion */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Profile Completion</h2>
          <ProfileProgress 
            pet={pet} 
            vaccinations={vaccinations} 
            healthRecords={healthRecords} 
          />
        </Card>

        {/* Rabies Status */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Rabies Compliance Status</h2>
          {rabiesCompliance && (
            <div className="flex items-center gap-6">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
                rabiesCompliance.isCompliant ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {rabiesCompliance.isCompliant ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <XCircle className="h-8 w-8 text-rust" />
                )}
              </div>
              <div>
                <p className="font-medium text-lg">
                  {rabiesCompliance.isCompliant ? 'Travel Ready' : 'Not Compliant'}
                </p>
                <p className="text-stone">{rabiesCompliance.message}</p>
                {rabiesCompliance.daysUntilExpiry !== null && rabiesCompliance.daysUntilExpiry <= 30 && (
                  <Badge variant="warning" className="mt-2">
                    Expires in {rabiesCompliance.daysUntilExpiry} days
                  </Badge>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Vaccinations */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Syringe className="h-5 w-5 text-forest" />
              Vaccinations ({vaccinations.length})
            </h2>
            <Button size="sm" onClick={() => setShowVaxModal(true)}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          {vaccinations.length === 0 ? (
            <p className="text-stone text-center py-8">No vaccinations recorded yet</p>
          ) : (
            <div className="space-y-3">
              {vaccinations.map((vax) => (
                <div key={vax.id} className="flex items-center justify-between p-3 bg-sand/30 rounded-lg">
                  <div>
                    <p className="font-medium">{vax.name}</p>
                    <p className="text-sm text-stone">{vax.type} • {new Date(vax.administeredAt).toLocaleDateString()}</p>
                  </div>
                  {vax.expiresAt && (
                    <Badge variant={new Date(vax.expiresAt) > new Date() ? 'success' : 'error'}>
                      Exp: {new Date(vax.expiresAt).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Health Records */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-terracotta" />
              Health Records ({healthRecords.length})
            </h2>
            <Button size="sm" onClick={() => setShowHealthModal(true)}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          {healthRecords.length === 0 ? (
            <p className="text-stone text-center py-8">No health records yet</p>
          ) : (
            <div className="space-y-3">
              {healthRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-sand/30 rounded-lg">
                  <div>
                    <p className="font-medium">{record.title}</p>
                    <p className="text-sm text-stone">{record.type} • {new Date(record.date).toLocaleDateString()}</p>
                  </div>
                  {record.clinicName && <span className="text-sm text-stone">{record.clinicName}</span>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      <AddVaccinationModal
        isOpen={showVaxModal}
        onClose={() => setShowVaxModal(false)}
        petId={petId!}
        onSuccess={() => { setShowVaxModal(false); loadPetData(); }}
      />
      <AddHealthRecordModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        petId={petId!}
        onSuccess={() => { setShowHealthModal(false); loadPetData(); }}
      />
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        pet={pet}
      />
    </DashboardLayout>
  );
}

// Photo Upload Component
function PhotoUpload({ pet, onPhotoChange }: { pet: Pet; onPhotoChange: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please select a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await pets.uploadPhoto(pet.id, file);
      onPhotoChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async () => {
    if (!confirm('Delete this photo?')) return;
    try {
      await pets.deletePhoto(pet.id);
      onPhotoChange();
    } catch {
      setError('Failed to delete photo');
    }
  };

  const speciesEmoji = getSpeciesEmoji(pet.species);

  return (
    <div className="text-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
      
      <div className="relative inline-block">
        {pet.photoUrl ? (
          <img
            src={pet.photoUrl}
            alt={pet.name}
            className="w-32 h-32 rounded-2xl object-cover mx-auto"
          />
        ) : (
          <div className="w-32 h-32 bg-sand rounded-2xl flex items-center justify-center mx-auto text-5xl">
            {speciesEmoji}
          </div>
        )}
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 h-10 w-10 bg-forest text-white rounded-full flex items-center justify-center shadow-lg hover:bg-forest/90 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
        </button>
      </div>
      
      <h3 className="mt-3 font-semibold text-lg">{pet.name}</h3>
      <Badge className="mt-1">{pet.verificationLevel}</Badge>
      
      {error && <Alert variant="error" className="mt-3 text-sm">{error}</Alert>}
      
      {pet.photoUrl && (
        <button
          onClick={handleDeletePhoto}
          className="mt-2 text-sm text-rust hover:underline"
        >
          Remove photo
        </button>
      )}
    </div>
  );
}

// QR Code Modal with Enhanced Sharing
function QRCodeModal({ isOpen, onClose, pet }: { isOpen: boolean; onClose: () => void; pet: Pet }) {
  const { toast } = useToast();
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && !qrData) {
      loadQRCode();
    }
  }, [isOpen]);

  const loadQRCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pets.getQRImage(pet.id);
      setQrData(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      await pets.downloadQRPng(pet.id, pet.petportId);
      toast.success('QR code downloaded!');
    } catch {
      toast.error('Failed to download QR code');
    }
  };

  const handleCopyLink = async () => {
    if (!qrData) return;
    try {
      await navigator.clipboard.writeText(qrData.verifyUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleShare = async () => {
    if (!qrData) return;
    
    const shareData: ShareData = {
      title: `${pet.name}'s PetPort ID`,
      text: `Check out ${pet.name}'s digital pet passport! 🐾 Verify their identity and vaccination status.`,
      url: qrData.verifyUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to copy
        await navigator.clipboard.writeText(qrData.verifyUrl);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error('Failed to share');
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pet QR Code">
      <div className="text-center">
        {loading ? (
          <div className="py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-forest" />
            <p className="text-stone mt-2">Generating QR code...</p>
          </div>
        ) : error ? (
          <Alert variant="error">{error}</Alert>
        ) : qrData ? (
          <>
            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl inline-block shadow-md mb-4">
              <img src={qrData.dataUrl} alt="QR Code" className="w-56 h-56" />
            </div>
            
            {/* PetPort ID */}
            <div className="bg-forest/5 rounded-xl px-4 py-3 mb-4 inline-flex items-center gap-2">
              <span className="font-mono text-lg font-semibold text-forest">
                {qrData.petportId}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrData.petportId);
                  toast.success('ID copied!');
                }}
                className="p-1 hover:bg-forest/10 rounded transition-colors"
              >
                <Copy className="h-4 w-4 text-forest" />
              </button>
            </div>
            
            <p className="text-sm text-stone mb-6">
              Scan or share to verify {pet.name}'s identity
            </p>
            
            {/* Action buttons */}
            <div className="space-y-3">
              {/* Primary: Share */}
              <Button fullWidth onClick={handleShare}>
                <Share2 className="h-4 w-4" /> Share
              </Button>
              
              {/* Secondary row */}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleCopyLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4" /> Download
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}

// Add Vaccination Modal
function AddVaccinationModal({ isOpen, onClose, petId, onSuccess }: { isOpen: boolean; onClose: () => void; petId: string; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'RABIES', name: '', administeredAt: '', expiresAt: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await pets.createVaccination(petId, {
        type: form.type as Vaccination['type'],
        name: form.name,
        administeredAt: form.administeredAt,
        expiresAt: form.expiresAt || null,
      });
      setForm({ type: 'RABIES', name: '', administeredAt: '', expiresAt: '' });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add vaccination');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Vaccination">
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          options={[
            { value: 'RABIES', label: 'Rabies' },
            { value: 'DHPP', label: 'DHPP' },
            { value: 'BORDETELLA', label: 'Bordetella' },
            { value: 'LEPTOSPIROSIS', label: 'Leptospirosis' },
            { value: 'LYME', label: 'Lyme' },
            { value: 'FVRCP', label: 'FVRCP' },
            { value: 'FELV', label: 'FeLV' },
            { value: 'OTHER', label: 'Other' },
          ]}
        />
        <Input label="Vaccine Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Input label="Date Administered" type="date" value={form.administeredAt} onChange={(e) => setForm({ ...form, administeredAt: e.target.value })} required />
        <Input label="Expiration Date" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        <div className="flex gap-4 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add Vaccination</Button>
        </div>
      </form>
    </Modal>
  );
}

// Add Health Record Modal
function AddHealthRecordModal({ isOpen, onClose, petId, onSuccess }: { isOpen: boolean; onClose: () => void; petId: string; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'CHECKUP', title: '', date: '', clinicName: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await pets.createHealth(petId, {
        type: form.type as HealthRecord['type'],
        title: form.title,
        date: form.date,
        clinicName: form.clinicName || null,
      });
      setForm({ type: 'CHECKUP', title: '', date: '', clinicName: '' });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add health record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Health Record">
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          options={[
            { value: 'CHECKUP', label: 'Checkup' },
            { value: 'SURGERY', label: 'Surgery' },
            { value: 'MEDICATION', label: 'Medication' },
            { value: 'LAB_RESULT', label: 'Lab Result' },
            { value: 'OTHER', label: 'Other' },
          ]}
        />
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        <Input label="Clinic Name" value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} />
        <div className="flex gap-4 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add Record</Button>
        </div>
      </form>
    </Modal>
  );
}
