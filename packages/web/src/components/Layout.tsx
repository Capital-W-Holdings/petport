import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, Home, List, Plus, Settings, Twitter, Instagram, Facebook, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './ui';

interface LayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: LayoutProps) {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Frosted glass navigation */}
      <header
        className={`nav-frosted transition-all duration-300 ${
          scrolled ? 'shadow-soft' : ''
        }`}
        style={{
          background: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.9)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="h-9 w-9 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="font-semibold text-xl text-black tracking-tight">PetPort</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link
                to="/#features"
                className="text-steel hover:text-black transition-colors uppercase text-sm tracking-wider font-medium"
              >
                Features
              </Link>
              <Link
                to="/#how-it-works"
                className="text-steel hover:text-black transition-colors uppercase text-sm tracking-wider font-medium"
              >
                How It Works
              </Link>
              <Link
                to="/verify"
                className="text-steel hover:text-black transition-colors uppercase text-sm tracking-wider font-medium"
              >
                Verify Pet
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="text-steel hover:text-black transition-colors uppercase text-sm tracking-wider font-medium"
                  >
                    Dashboard
                  </Link>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-steel">{user?.name}</span>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                      Log Out
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm">Sign In</Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm">Get Started</Button>
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-black"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-pearl animate-fadeIn">
            <div className="px-4 py-6 space-y-4">
              <Link
                to="/#features"
                className="block text-steel hover:text-black uppercase text-sm tracking-wider font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                to="/#how-it-works"
                className="block text-steel hover:text-black uppercase text-sm tracking-wider font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </Link>
              <Link
                to="/verify"
                className="block text-steel hover:text-black uppercase text-sm tracking-wider font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Verify Pet
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="block text-steel hover:text-black uppercase text-sm tracking-wider font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="text-steel hover:text-black uppercase text-sm tracking-wider font-medium py-2"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <div className="pt-4 space-y-3">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" fullWidth>Sign In</Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button fullWidth>Get Started</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Spacer for fixed nav */}
      <div className="h-16 md:h-20" />

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-3 mb-4">
                <div className="h-9 w-9 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-black font-bold text-lg">P</span>
                </div>
                <span className="font-semibold text-xl text-white tracking-tight">PetPort</span>
              </Link>
              <p className="text-silver text-sm leading-relaxed">
                The digital identity platform for your beloved pets. Track health, find lost pets, and connect with breeders.
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="uppercase text-xs tracking-widest text-steel font-medium mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link to="/#features" className="text-silver hover:text-white transition-colors text-sm">Features</Link></li>
                <li><Link to="/#how-it-works" className="text-silver hover:text-white transition-colors text-sm">How It Works</Link></li>
                <li><Link to="/verify" className="text-silver hover:text-white transition-colors text-sm">Verify Pet</Link></li>
                <li><Link to="/register" className="text-silver hover:text-white transition-colors text-sm">Get Started</Link></li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="uppercase text-xs tracking-widest text-steel font-medium mb-4">Company</h4>
              <ul className="space-y-3">
                <li><a href="mailto:hello@petport.ai" className="text-silver hover:text-white transition-colors text-sm">About Us</a></li>
                <li><a href="mailto:hello@petport.ai" className="text-silver hover:text-white transition-colors text-sm">Careers</a></li>
                <li><a href="mailto:press@petport.ai" className="text-silver hover:text-white transition-colors text-sm">Press</a></li>
                <li><a href="mailto:hello@petport.ai" className="text-silver hover:text-white transition-colors text-sm">Blog</a></li>
              </ul>
            </div>

            {/* Support Links */}
            <div>
              <h4 className="uppercase text-xs tracking-widest text-steel font-medium mb-4">Support</h4>
              <ul className="space-y-3">
                <li><a href="mailto:support@petport.ai" className="text-silver hover:text-white transition-colors text-sm">Help Center</a></li>
                <li><a href="mailto:support@petport.ai" className="text-silver hover:text-white transition-colors text-sm">Contact Us</a></li>
                <li><a href="mailto:legal@petport.ai" className="text-silver hover:text-white transition-colors text-sm">Privacy Policy</a></li>
                <li><a href="mailto:legal@petport.ai" className="text-silver hover:text-white transition-colors text-sm">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-graphite flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-steel">
              &copy; {new Date().getFullYear()} PetPort. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-steel hover:text-white transition-colors" aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-steel hover:text-white transition-colors" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-steel hover:text-white transition-colors" aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function DashboardLayout({ children }: LayoutProps) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/pets', icon: List, label: 'My Pets' },
    { to: '/pets/new', icon: Plus, label: 'Add Pet' },
    { to: '/settings', icon: Settings, label: 'Settings' },
    // Admin-only items
    ...(isAdmin ? [{ to: '/security-report', icon: Shield, label: 'Security Report' }] : []),
  ];

  return (
    <div className="min-h-screen bg-cloud">
      {/* Mobile header */}
      <header className="lg:hidden bg-white border-b border-pearl sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <span className="font-semibold text-black">PetPort</span>
          </Link>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
            {sidebarOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-0 left-0 z-30 h-screen w-64 bg-white border-r border-pearl
            transform transition-transform lg:transform-none
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="flex flex-col h-full">
            <div className="hidden lg:flex items-center gap-3 p-6 border-b border-pearl">
              <div className="h-10 w-10 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="font-semibold text-xl text-black">PetPort</span>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-steel hover:bg-cloud hover:text-black transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-pearl">
              <div className="flex items-center gap-3 px-4 py-2 mb-2">
                <div className="h-10 w-10 bg-pearl rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-steel" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-charcoal truncate">{user?.name}</p>
                  <p className="text-sm text-steel truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-steel hover:bg-coral-light hover:text-coral transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Log Out
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-h-screen lg:min-h-[calc(100vh)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
