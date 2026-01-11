import React, { useState } from 'react';
import { User, Mail, Phone, Shield, Bell, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/components/Layout';
import { Card, Button, Input, Alert, Badge, useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/components/OnboardingWizard';

export function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { resetOnboarding } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // TODO: Implement profile update API
    await new Promise((r) => setTimeout(r, 1000));
    setSuccess(true);
    setSaving(false);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-display font-bold text-forest">Settings</h1>

        {/* Profile */}
        <Card>
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <User className="h-5 w-5 text-forest" />
            Profile Information
          </h2>

          {success && (
            <Alert variant="success" className="mb-6">
              Your profile has been updated successfully.
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
            />
            <div>
              <label className="label flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <Input
                value={user?.email || ''}
                disabled
                className="bg-sand/30"
              />
              <p className="text-sm text-stone mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="label flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </form>
        </Card>

        {/* Account Status */}
        <Card>
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Shield className="h-5 w-5 text-forest" />
            Account Status
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-sand/30 rounded-lg">
              <div>
                <p className="font-medium">Email Verification</p>
                <p className="text-sm text-stone">Your email address verification status</p>
              </div>
              <Badge variant={user?.isVerified ? 'success' : 'warning'}>
                {user?.isVerified ? 'Verified' : 'Pending'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-sand/30 rounded-lg">
              <div>
                <p className="font-medium">Account Created</p>
                <p className="text-sm text-stone">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Bell className="h-5 w-5 text-forest" />
            Notifications
          </h2>
          <div className="space-y-4">
            {[
              { id: 'vaccination', label: 'Vaccination Reminders', desc: 'Get notified before vaccinations expire' },
              { id: 'health', label: 'Health Check Reminders', desc: 'Annual checkup reminders for your pets' },
              { id: 'updates', label: 'Product Updates', desc: 'News about PetPort features and updates' },
            ].map((item) => (
              <label key={item.id} className="flex items-center justify-between p-4 bg-sand/30 rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-stone">{item.desc}</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 rounded border-sand" />
              </label>
            ))}
          </div>
        </Card>

        {/* Preferences */}
        <Card>
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-forest" />
            Preferences
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-sand/30 rounded-lg">
              <div>
                <p className="font-medium">Welcome Tutorial</p>
                <p className="text-sm text-stone">Reset the onboarding wizard to see it again</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  resetOnboarding();
                  toast.success('Tutorial reset! Visit Dashboard to see it again.');
                }}
              >
                Reset Tutorial
              </Button>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-rust/20">
          <h2 className="text-lg font-semibold mb-4 text-rust">Danger Zone</h2>
          <p className="text-stone mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <Button variant="ghost" className="text-rust hover:bg-red-50">
            Delete Account
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
}
