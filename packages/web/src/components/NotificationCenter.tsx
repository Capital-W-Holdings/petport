import { useState, useEffect, useRef } from 'react';
import { Bell, Syringe, AlertTriangle, CheckCircle, ChevronRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PetWithSummary } from '@/lib/api';

interface Notification {
  id: string;
  type: 'warning' | 'error' | 'success' | 'info';
  title: string;
  message: string;
  petId?: string;
  petName?: string;
  action?: {
    label: string;
    href: string;
  };
  timestamp: Date;
  read: boolean;
}

interface NotificationCenterProps {
  pets: PetWithSummary[];
}

export function NotificationCenter({ pets }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate notifications from pet data
  useEffect(() => {
    const newNotifications: Notification[] = [];

    pets.forEach((pet) => {
      const { rabiesCompliance } = pet;
      const days = rabiesCompliance.daysUntilExpiry;

      // Expired vaccination
      if (!rabiesCompliance.isCompliant) {
        if (rabiesCompliance.vaccination) {
          newNotifications.push({
            id: `expired-${pet.id}`,
            type: 'error',
            title: 'Vaccination Expired',
            message: `${pet.name}'s rabies vaccination has expired`,
            petId: pet.id,
            petName: pet.name,
            action: {
              label: 'Update Vaccination',
              href: `/pets/${pet.id}`,
            },
            timestamp: new Date(),
            read: false,
          });
        } else {
          newNotifications.push({
            id: `missing-${pet.id}`,
            type: 'error',
            title: 'Missing Vaccination',
            message: `${pet.name} has no rabies vaccination on record`,
            petId: pet.id,
            petName: pet.name,
            action: {
              label: 'Add Vaccination',
              href: `/pets/${pet.id}`,
            },
            timestamp: new Date(),
            read: false,
          });
        }
      }
      // Expiring soon (within 30 days)
      else if (days !== null && days > 0 && days <= 30) {
        newNotifications.push({
          id: `expiring-${pet.id}`,
          type: 'warning',
          title: 'Vaccination Expiring Soon',
          message: `${pet.name}'s rabies vaccination expires in ${days} days`,
          petId: pet.id,
          petName: pet.name,
          action: {
            label: 'Schedule Renewal',
            href: `/pets/${pet.id}`,
          },
          timestamp: new Date(),
          read: false,
        });
      }
      // Expiring in 60 days (heads up)
      else if (days !== null && days > 30 && days <= 60) {
        newNotifications.push({
          id: `reminder-${pet.id}`,
          type: 'info',
          title: 'Upcoming Renewal',
          message: `${pet.name}'s vaccination expires in ${days} days`,
          petId: pet.id,
          petName: pet.name,
          action: {
            label: 'View Details',
            href: `/pets/${pet.id}`,
          },
          timestamp: new Date(),
          read: false,
        });
      }
    });

    // Sort by severity (error > warning > info)
    newNotifications.sort((a, b) => {
      const order = { error: 0, warning: 1, info: 2, success: 3 };
      return order[a.type] - order[b.type];
    });

    setNotifications(newNotifications);
  }, [pets]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasUrgent = notifications.some((n) => n.type === 'error' || n.type === 'warning');

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-rust" />;
      case 'warning':
        return <Syringe className="h-5 w-5 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Calendar className="h-5 w-5 text-forest" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-lg transition-colors
          ${isOpen ? 'bg-forest/10' : 'hover:bg-sand'}
        `}
        aria-label="Notifications"
      >
        <Bell className={`h-5 w-5 ${hasUrgent ? 'text-rust' : 'text-charcoal'}`} />
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span className={`
            absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-bold
            flex items-center justify-center text-white
            ${hasUrgent ? 'bg-rust' : 'bg-forest'}
          `}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-sand z-50 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-sand">
            <h3 className="font-semibold text-charcoal">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-forest hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-medium text-charcoal">All caught up!</p>
                <p className="text-sm text-stone">No notifications at this time</p>
              </div>
            ) : (
              <div className="divide-y divide-sand">
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    to={notification.action?.href || '#'}
                    onClick={() => {
                      markAsRead(notification.id);
                      setIsOpen(false);
                    }}
                    className={`
                      block px-4 py-3 hover:bg-sand/50 transition-colors
                      ${!notification.read ? 'bg-forest/5' : ''}
                    `}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-charcoal text-sm">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="h-2 w-2 bg-forest rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-stone mt-0.5">
                          {notification.message}
                        </p>
                        {notification.action && (
                          <p className="text-sm text-forest font-medium mt-1 flex items-center gap-1">
                            {notification.action.label}
                            <ChevronRight className="h-4 w-4" />
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-sand">
              <p className="text-xs text-stone text-center">
                Vaccination reminders help keep your pets travel-ready
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Hook to get notification count for use in other components
export function useNotificationCount(pets: PetWithSummary[]): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let urgentCount = 0;
    pets.forEach((pet) => {
      const { rabiesCompliance } = pet;
      const days = rabiesCompliance.daysUntilExpiry;

      if (!rabiesCompliance.isCompliant) {
        urgentCount++;
      } else if (days !== null && days > 0 && days <= 30) {
        urgentCount++;
      }
    });
    setCount(urgentCount);
  }, [pets]);

  return count;
}
