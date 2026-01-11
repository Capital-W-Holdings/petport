import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { PublicLayout } from '@/components/Layout';
import { Card, Button, Input, Alert } from '@/components/ui';
import { auth, ApiError } from '@/lib/api';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validate token exists
  if (!token) {
    return (
      <PublicLayout>
        <div className="max-w-md mx-auto">
          <Card className="text-center">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-rust" />
            </div>
            <h1 className="text-2xl font-display font-bold text-charcoal mb-2">
              Invalid Reset Link
            </h1>
            <p className="text-stone mb-6">
              This password reset link is invalid or has expired.
              Please request a new one.
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/forgot-password">
                <Button fullWidth>Request New Link</Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" fullWidth>
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      await auth.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'AUTHENTICATION_ERROR') {
          setError('This reset link has expired or already been used. Please request a new one.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PublicLayout>
        <div className="max-w-md mx-auto">
          <Card className="text-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-display font-bold text-charcoal mb-2">
              Password Reset!
            </h1>
            <p className="text-stone mb-6">
              Your password has been successfully reset.
              You can now log in with your new password.
            </p>
            <Button onClick={() => navigate('/login')} fullWidth>
              Go to Login
            </Button>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto">
        <Card>
          <div className="text-center mb-6">
            <div className="h-12 w-12 bg-forest/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-6 w-6 text-forest" />
            </div>
            <h1 className="text-2xl font-display font-bold text-charcoal">
              Set New Password
            </h1>
            <p className="text-stone mt-2">
              Enter your new password below.
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              label="New Password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />

            <Input
              type="password"
              label="Confirm Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <p className="text-xs text-stone">
              Password must be at least 8 characters.
            </p>

            <Button type="submit" fullWidth loading={loading}>
              Reset Password
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-forest hover:text-forest/80 inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
}
