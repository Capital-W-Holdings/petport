import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { PublicLayout } from '@/components/Layout';
import { Card, Button, Input, Alert } from '@/components/ui';
import { auth, ApiError } from '@/lib/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await auth.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <PublicLayout>
        <div className="max-w-md mx-auto">
          <Card className="text-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-display font-bold text-charcoal mb-2">
              Check Your Email
            </h1>
            <p className="text-stone mb-6">
              If an account exists with <strong>{email}</strong>, we've sent a password reset link.
              Please check your inbox and spam folder.
            </p>
            <p className="text-sm text-stone mb-6">
              The link will expire in 1 hour.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(false);
                  setEmail('');
                }}
              >
                Try a Different Email
              </Button>
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

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto">
        <Card>
          <div className="text-center mb-6">
            <div className="h-12 w-12 bg-forest/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 text-forest" />
            </div>
            <h1 className="text-2xl font-display font-bold text-charcoal">
              Reset Your Password
            </h1>
            <p className="text-stone mt-2">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <Button type="submit" fullWidth loading={loading}>
              Send Reset Link
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
