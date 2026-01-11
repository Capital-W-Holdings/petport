import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Syringe, FileText, MapPin, Calendar, ChevronRight, CheckCircle } from 'lucide-react';
import { Pet, Vaccination, HealthRecord } from '@/lib/api';

interface ProfileProgressProps {
  pet: Pet;
  vaccinations: Vaccination[];
  healthRecords: HealthRecord[];
  className?: string;
}

interface ProgressItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  points: number;
  completed: boolean;
  action?: {
    label: string;
    href: string;
  };
}

export function ProfileProgress({ pet, vaccinations, healthRecords, className = '' }: ProfileProgressProps) {
  // Calculate completion items
  const items: ProgressItem[] = [
    {
      id: 'photo',
      label: 'Add Photo',
      description: 'Help identify your pet',
      icon: <Camera className="h-4 w-4" />,
      points: 20,
      completed: !!pet.photoUrl,
      action: pet.photoUrl ? undefined : {
        label: 'Upload Photo',
        href: `/pets/${pet.id}/edit`,
      },
    },
    {
      id: 'breed',
      label: 'Add Breed',
      description: 'Specify breed information',
      icon: <FileText className="h-4 w-4" />,
      points: 10,
      completed: !!pet.breed,
      action: pet.breed ? undefined : {
        label: 'Add Breed',
        href: `/pets/${pet.id}/edit`,
      },
    },
    {
      id: 'dob',
      label: 'Add Birthday',
      description: 'Track your pet\'s age',
      icon: <Calendar className="h-4 w-4" />,
      points: 10,
      completed: !!pet.dateOfBirth,
      action: pet.dateOfBirth ? undefined : {
        label: 'Add Birthday',
        href: `/pets/${pet.id}/edit`,
      },
    },
    {
      id: 'microchip',
      label: 'Add Microchip ID',
      description: 'Permanent identification',
      icon: <MapPin className="h-4 w-4" />,
      points: 15,
      completed: !!pet.microchipId,
      action: pet.microchipId ? undefined : {
        label: 'Add Microchip',
        href: `/pets/${pet.id}/edit`,
      },
    },
    {
      id: 'rabies',
      label: 'Rabies Vaccination',
      description: 'Required for travel',
      icon: <Syringe className="h-4 w-4" />,
      points: 25,
      completed: vaccinations.some(v => v.type === 'RABIES'),
      action: vaccinations.some(v => v.type === 'RABIES') ? undefined : {
        label: 'Add Rabies',
        href: `/pets/${pet.id}`,
      },
    },
    {
      id: 'health-record',
      label: 'Health Record',
      description: 'Track vet visits',
      icon: <FileText className="h-4 w-4" />,
      points: 20,
      completed: healthRecords.length > 0,
      action: healthRecords.length > 0 ? undefined : {
        label: 'Add Record',
        href: `/pets/${pet.id}`,
      },
    },
  ];

  // Calculate total and completed points
  const totalPoints = items.reduce((sum, item) => sum + item.points, 0);
  const completedPoints = items
    .filter((item) => item.completed)
    .reduce((sum, item) => sum + item.points, 0);
  const percentage = Math.round((completedPoints / totalPoints) * 100);

  // Get incomplete items for suggestions
  const incompleteItems = items.filter((item) => !item.completed);

  return (
    <div className={className}>
      {/* Progress Ring */}
      <div className="flex items-center gap-6 mb-6">
        <ProgressRing percentage={percentage} size={80} strokeWidth={8} />
        <div>
          <p className="text-2xl font-bold text-charcoal">{percentage}%</p>
          <p className="text-stone">Profile Complete</p>
          {percentage === 100 && (
            <p className="text-green-600 text-sm font-medium mt-1">
              ✨ Fully verified!
            </p>
          )}
        </div>
      </div>

      {/* Completion Items */}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`
              flex items-center justify-between p-3 rounded-lg
              ${item.completed ? 'bg-green-50' : 'bg-sand/50'}
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                h-8 w-8 rounded-full flex items-center justify-center
                ${item.completed ? 'bg-green-100 text-green-600' : 'bg-sand text-stone'}
              `}>
                {item.completed ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  item.icon
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${item.completed ? 'text-green-700' : 'text-charcoal'}`}>
                  {item.label}
                </p>
                <p className="text-xs text-stone">{item.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${item.completed ? 'text-green-600' : 'text-stone'}`}>
                +{item.points}
              </span>
              {item.action && (
                <Link
                  to={item.action.href}
                  className="text-forest text-sm font-medium hover:underline flex items-center gap-1"
                >
                  Add
                  <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Next Steps */}
      {incompleteItems.length > 0 && percentage < 100 && (
        <div className="mt-4 p-3 bg-forest/5 rounded-lg">
          <p className="text-sm text-forest font-medium">
            💡 Next: {incompleteItems[0].label}
          </p>
          <p className="text-xs text-stone mt-0.5">
            {incompleteItems[0].description} (+{incompleteItems[0].points} points)
          </p>
        </div>
      )}
    </div>
  );
}

// Circular Progress Ring Component
function ProgressRing({ 
  percentage, 
  size = 80, 
  strokeWidth = 8 
}: { 
  percentage: number; 
  size?: number; 
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  // Determine color based on percentage
  const getColor = () => {
    if (percentage >= 100) return '#16a34a'; // green-600
    if (percentage >= 60) return '#2d5016'; // forest
    if (percentage >= 30) return '#ca8a04'; // yellow-600
    return '#dc2626'; // red-600
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e5e5"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        {percentage >= 100 ? (
          <CheckCircle className="h-6 w-6 text-green-600" />
        ) : (
          <span className="text-lg font-bold" style={{ color: getColor() }}>
            {percentage}
          </span>
        )}
      </div>
    </div>
  );
}

// Compact version for pet cards
export function ProfileProgressBadge({ 
  pet, 
  vaccinationCount = 0, 
  healthRecordCount = 0 
}: { 
  pet: Pet;
  vaccinationCount?: number;
  healthRecordCount?: number;
}) {
  // Quick calculation
  let completed = 0;
  let total = 6;

  if (pet.photoUrl) completed++;
  if (pet.breed) completed++;
  if (pet.dateOfBirth) completed++;
  if (pet.microchipId) completed++;
  if (vaccinationCount > 0) completed++;
  if (healthRecordCount > 0) completed++;

  const percentage = Math.round((completed / total) * 100);

  if (percentage === 100) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
        <CheckCircle className="h-3 w-3" />
        Complete
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-stone bg-sand px-2 py-0.5 rounded-full">
      {percentage}% complete
    </span>
  );
}
