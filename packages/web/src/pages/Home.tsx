import { Link } from 'react-router-dom';
import { Shield, Heart, Bell, Users, CheckCircle, ArrowRight, MapPin, Clock, Star, Verified } from 'lucide-react';
import { PublicLayout } from '@/components/Layout';
import { Button } from '@/components/ui';

// SVG Pet Avatars
const DogAvatar = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full">
    <circle cx="40" cy="40" r="38" fill="#E6FBF6" />
    <ellipse cx="40" cy="48" rx="20" ry="16" fill="#1A1A1A" />
    <circle cx="32" cy="38" r="6" fill="#FFFFFF" />
    <circle cx="48" cy="38" r="6" fill="#FFFFFF" />
    <circle cx="33" cy="39" r="3" fill="#1A1A1A" />
    <circle cx="49" cy="39" r="3" fill="#1A1A1A" />
    <ellipse cx="40" cy="52" rx="4" ry="3" fill="#FF6B5B" />
    <ellipse cx="25" cy="30" rx="8" ry="12" fill="#1A1A1A" transform="rotate(-15 25 30)" />
    <ellipse cx="55" cy="30" rx="8" ry="12" fill="#1A1A1A" transform="rotate(15 55 30)" />
  </svg>
);

const CatAvatar = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full">
    <circle cx="40" cy="40" r="38" fill="#FFF0EE" />
    <ellipse cx="40" cy="50" rx="18" ry="14" fill="#6B6B6B" />
    <circle cx="32" cy="40" r="5" fill="#FFFFFF" />
    <circle cx="48" cy="40" r="5" fill="#FFFFFF" />
    <circle cx="33" cy="41" r="2" fill="#1A1A1A" />
    <circle cx="49" cy="41" r="2" fill="#1A1A1A" />
    <polygon points="40,52 38,56 42,56" fill="#FF6B5B" />
    <polygon points="18,20 28,38 12,36" fill="#6B6B6B" />
    <polygon points="62,20 52,38 68,36" fill="#6B6B6B" />
    <path d="M32 58 Q40 62 48 58" stroke="#1A1A1A" strokeWidth="1" fill="none" />
  </svg>
);

const BirdAvatar = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full">
    <circle cx="40" cy="40" r="38" fill="#E6FBF6" />
    <ellipse cx="40" cy="45" rx="16" ry="20" fill="#00D4AA" />
    <circle cx="35" cy="36" r="4" fill="#FFFFFF" />
    <circle cx="45" cy="36" r="4" fill="#FFFFFF" />
    <circle cx="36" cy="37" r="2" fill="#1A1A1A" />
    <circle cx="46" cy="37" r="2" fill="#1A1A1A" />
    <polygon points="40,42 36,48 44,48" fill="#FF6B5B" />
    <ellipse cx="40" cy="22" rx="8" ry="6" fill="#00D4AA" />
  </svg>
);

export function HomePage() {
  return (
    <PublicLayout>
      {/* ============================================================
          HERO SECTION
          ============================================================ */}
      <section className="section-padding bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              {/* Tag Badge */}
              <div className="inline-flex items-center gap-2 bg-mint-light text-mint px-4 py-2 rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-mint rounded-full animate-pulse" />
                Now Available Nationwide
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-black mb-6 leading-tight">
                The Digital Identity for Your{' '}
                <span className="text-mint">Beloved Pets</span>
              </h1>

              {/* Description */}
              <p className="text-lg lg:text-xl text-steel max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                Track health records, find lost pets instantly, and connect with verified breeders.
                One platform for everything your pet needs.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/register">
                  <Button size="lg" className="group w-full sm:w-auto">
                    Get Started Free
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/verify">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Verify a Pet
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right - Visual Card */}
            <div className="hidden lg:block relative">
              <div className="bg-cloud rounded-3xl p-8 shadow-card hover-lift">
                {/* Pet Profile Preview */}
                <div className="bg-white rounded-2xl p-6 shadow-soft">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-16 w-16 rounded-2xl overflow-hidden">
                      <DogAvatar />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-xl text-black">Max</h3>
                        <div className="bg-mint-light text-mint p-1 rounded-full">
                          <Verified className="h-4 w-4" />
                        </div>
                      </div>
                      <p className="text-steel">Golden Retriever</p>
                    </div>
                  </div>

                  {/* Stat Boxes */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-cloud rounded-xl p-3 text-center">
                      <p className="text-2xl font-semibold text-black">3</p>
                      <p className="text-xs text-steel uppercase tracking-wide">Years Old</p>
                    </div>
                    <div className="bg-cloud rounded-xl p-3 text-center">
                      <p className="text-2xl font-semibold text-mint">100%</p>
                      <p className="text-xs text-steel uppercase tracking-wide">Vaccinated</p>
                    </div>
                    <div className="bg-cloud rounded-xl p-3 text-center">
                      <p className="text-2xl font-semibold text-black">12</p>
                      <p className="text-xs text-steel uppercase tracking-wide">Records</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-mint/10 rounded-full blur-2xl" />
              <div className="absolute -top-4 -left-4 w-32 h-32 bg-coral/10 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FEATURES GRID SECTION
          ============================================================ */}
      <section id="features" className="section-padding bg-cloud">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <p className="section-tag mb-4">Everything You Need</p>
            <h2 className="section-title mb-4">Powerful Features for Pet Owners</h2>
            <p className="section-desc mx-auto">
              Comprehensive tools to manage your pet's health, safety, and community connections.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: 'Digital Identity',
                desc: 'Unique QR-powered ID card that anyone can scan to verify your pet instantly.',
              },
              {
                icon: Heart,
                title: 'Health Records',
                desc: 'Store vaccinations, vet visits, and medical history securely in one place.',
              },
              {
                icon: Bell,
                title: 'Lost & Found Alerts',
                desc: 'Instant community alerts when your pet goes missing. GPS-enabled tracking.',
              },
              {
                icon: Users,
                title: 'Community Network',
                desc: 'Connect with verified breeders, vets, and other pet owners in your area.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-soft hover-lift-md transition-all duration-300 hover:shadow-card"
              >
                <div className="h-12 w-12 bg-cloud rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-black" />
                </div>
                <h3 className="font-semibold text-lg text-black mb-2">{feature.title}</h3>
                <p className="text-steel text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          LOST & FOUND SECTION
          ============================================================ */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div>
              <p className="section-tag mb-4">Never Lose Your Pet</p>
              <h2 className="section-title mb-4">
                Find Your <span className="text-coral">Lost Pet</span> in Minutes
              </h2>
              <p className="section-desc mb-8">
                Our community-powered alert system notifies nearby pet owners instantly when your pet goes missing.
              </p>

              {/* Feature List */}
              <div className="space-y-4">
                {[
                  'Instant push notifications to nearby PetPort users',
                  'GPS-enabled smart tags for real-time tracking',
                  'Community sightings with photo verification',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="h-10 w-10 bg-coral-light rounded-xl flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-coral" />
                    </div>
                    <p className="text-steel pt-2">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Demo Alert Card */}
            <div className="relative">
              <div className="bg-white rounded-2xl border border-pearl shadow-card overflow-hidden">
                {/* Alert Header */}
                <div className="bg-coral-light p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-coral rounded-full flex items-center justify-center">
                      <Bell className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className="font-semibold text-coral text-sm uppercase tracking-wide">Lost Pet Alert</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-steel text-sm">
                    <Clock className="h-4 w-4" />
                    <span>2 min ago</span>
                  </div>
                </div>

                {/* Alert Content */}
                <div className="p-6">
                  <div className="flex gap-4 mb-4">
                    <div className="h-20 w-20 rounded-xl overflow-hidden flex-shrink-0">
                      <CatAvatar />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg text-black">Whiskers</h4>
                      <p className="text-steel text-sm">Grey Tabby Cat, 2 years old</p>
                      <div className="flex items-center gap-2 mt-2 text-steel text-sm">
                        <MapPin className="h-4 w-4 text-coral" />
                        <span>Last seen near Central Park</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button size="sm" className="flex-1">I've Seen This Pet</Button>
                    <Button variant="outline" size="sm" className="flex-1">Share Alert</Button>
                  </div>
                </div>
              </div>

              {/* Decorative */}
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-coral/10 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          BREEDING NETWORK SECTION
          ============================================================ */}
      <section className="section-padding bg-cloud">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <p className="section-tag mb-4">Trusted Connections</p>
            <h2 className="section-title mb-4">Verified Breeding Network</h2>
            <p className="section-desc mx-auto">
              Connect with health-tested, registered breeders you can trust.
            </p>
          </div>

          {/* Horizontal Scroll Cards */}
          <div className="horizontal-scroll">
            {[
              {
                name: 'Luna',
                breed: 'Labrador Retriever',
                gender: 'Female',
                avatar: DogAvatar,
                tags: ['Health Tested', 'AKC Registered', '18 months'],
                verified: true,
              },
              {
                name: 'Oliver',
                breed: 'Maine Coon',
                gender: 'Male',
                avatar: CatAvatar,
                tags: ['Vet Certified', 'TICA Registered', '2 years'],
                verified: true,
              },
              {
                name: 'Coco',
                breed: 'African Grey',
                gender: 'Female',
                avatar: BirdAvatar,
                tags: ['DNA Tested', 'Breeder Certified', '3 years'],
                verified: true,
              },
            ].map((pet, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-soft hover-lift-md transition-all duration-300 w-80"
              >
                {/* Pet Avatar */}
                <div className="h-24 w-24 mx-auto mb-4 rounded-2xl overflow-hidden">
                  <pet.avatar />
                </div>

                {/* Pet Info */}
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <h4 className="font-semibold text-lg text-black">{pet.name}</h4>
                    {pet.verified && (
                      <div className="bg-mint-light text-mint p-1 rounded-full">
                        <Verified className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <p className="text-steel text-sm">{pet.breed} &bull; {pet.gender}</p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  {pet.tags.map((tag, j) => (
                    <span
                      key={j}
                      className="bg-cloud text-steel text-xs px-3 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Button variant="outline" size="sm" fullWidth>
                  View Profile
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          HOW IT WORKS SECTION
          ============================================================ */}
      <section id="how-it-works" className="section-padding bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <p className="section-tag mb-4">Simple & Fast</p>
            <h2 className="section-title mb-4">How It Works</h2>
            <p className="section-desc mx-auto">
              Get your pet's digital identity set up in just three simple steps.
            </p>
          </div>

          {/* Steps Grid */}
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: '01',
                title: 'Create Profile',
                desc: 'Add your pet\'s info, photos, and health records. Takes less than 2 minutes.',
              },
              {
                step: '02',
                title: 'Get Smart Tag',
                desc: 'Receive your QR-enabled tag that links directly to your pet\'s profile.',
              },
              {
                step: '03',
                title: 'Stay Connected',
                desc: 'Access records anywhere, get alerts, and connect with the community.',
              },
            ].map((item, i) => (
              <div key={i} className="text-center relative">
                {/* Step Number */}
                <div className="h-20 w-20 rounded-full border-2 border-pearl flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl font-semibold text-black">{item.step}</span>
                </div>

                {/* Content */}
                <h3 className="font-semibold text-xl text-black mb-3">{item.title}</h3>
                <p className="text-steel leading-relaxed">{item.desc}</p>

                {/* Connector Line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-pearl" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          TESTIMONIALS SECTION
          ============================================================ */}
      <section className="section-padding bg-cloud">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <p className="section-tag mb-4">Trusted by Thousands</p>
            <h2 className="section-title mb-4">What Pet Owners Say</h2>
            <p className="section-desc mx-auto">
              Join thousands of happy pet owners who trust PetPort for their pet's digital identity.
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {[
              {
                quote: 'PetPort helped us find our dog Max within 3 hours of him going missing. The community alerts are incredible!',
                author: 'Sarah M.',
                role: 'Dog Owner',
                avatar: '🐕',
              },
              {
                quote: 'Having all of Luna\'s health records in one place has been a game-changer. Our vet loves it too!',
                author: 'Michael T.',
                role: 'Cat Owner',
                avatar: '🐱',
              },
              {
                quote: 'As a breeder, PetPort gives my clients confidence. The verified profiles build trust instantly.',
                author: 'Jennifer K.',
                role: 'Professional Breeder',
                avatar: '🏆',
              },
              {
                quote: 'The QR tag saved us when we were traveling. A stranger scanned it and called us immediately.',
                author: 'David & Emma R.',
                role: 'Multi-Pet Household',
                avatar: '🐾',
              },
            ].map((testimonial, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 lg:p-8 shadow-soft hover-lift"
              >
                {/* Star Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-charcoal leading-relaxed mb-6">"{testimonial.quote}"</p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-cloud rounded-full flex items-center justify-center text-2xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-black">{testimonial.author}</p>
                    <p className="text-steel text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          CTA SECTION
          ============================================================ */}
      <section className="section-padding bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <p className="section-tag mb-4">Ready to Get Started?</p>
          <h2 className="section-title mb-4">
            Give Your Pet the Identity They Deserve
          </h2>
          <p className="section-desc mx-auto mb-8">
            Join thousands of pet owners who trust PetPort. It's free to start and takes less than 2 minutes to set up.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="group w-full sm:w-auto">
                Get Started Free
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/#features">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Learn More
              </Button>
            </Link>
          </div>

          <p className="text-steel text-sm mt-6">
            No credit card required &bull; Free forever plan available
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
