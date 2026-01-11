# PetPort Operations Playbook
## COO + Infrastructure Lead Analysis

**Version**: 1.0  
**Date**: January 4, 2026  
**Status**: Beta-Ready (Single Instance)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Deployment Strategy](#2-deployment-strategy)
3. [Cost Profile at Scale](#3-cost-profile-at-scale)
4. [Failure Scenarios & Mitigations](#4-failure-scenarios--mitigations)
5. [Monetization Levers](#5-monetization-levers)
6. [Analytics to Track](#6-analytics-to-track)
7. [Operational Checklists](#7-operational-checklists)

---

## 1. Executive Summary

### Current State

| Dimension | Status |
|-----------|--------|
| **Codebase** | ✅ Production-ready (47 tests, strict TypeScript) |
| **Security** | ✅ 17/24 issues fixed (all 3 critical resolved) |
| **UX** | ✅ 13 features across 3 phases |
| **Scale Target** | Single instance (1k users) |
| **Upgrade Path** | Documented for 10k → 1M |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CURRENT STACK                             │
├─────────────────────────────────────────────────────────────────┤
│  Web (React/Vite)  →  API (Express/Node)  →  SQLite (in-memory) │
│       ↓                     ↓                      ↓             │
│  CDN/Static Host       Single Server          File-based         │
│  (Vercel/Netlify)      (Railway/Render)       (ephemeral)        │
└─────────────────────────────────────────────────────────────────┘
```

### Critical Dependencies

| Component | Current | Production Upgrade |
|-----------|---------|-------------------|
| Database | SQLite (sql.js) | PostgreSQL |
| Auth Store | In-memory | Redis |
| Rate Limiting | In-memory | Redis |
| File Storage | Local filesystem | S3/R2 |
| PDF Generation | Sync (blocking) | Bull/BullMQ queue |

---

## 2. Deployment Strategy

### Phase 1: MVP Launch (0-1k Users)

**Recommended Stack**: Railway or Render

```
┌────────────────────────────────────────────────────────────────┐
│                    PHASE 1 DEPLOYMENT                           │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Vercel/Netlify          Railway/Render         SQLite          │
│  ┌──────────────┐        ┌──────────────┐      ┌──────────────┐│
│  │   Web App    │───────▶│   API Server │─────▶│  sql.js      ││
│  │   (Static)   │        │   (Node 20)  │      │  (in-memory) ││
│  └──────────────┘        └──────────────┘      └──────────────┘│
│                                 │                               │
│                                 ▼                               │
│                          ┌──────────────┐                       │
│                          │  Local Disk  │                       │
│                          │  (uploads/)  │                       │
│                          └──────────────┘                       │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

**Deployment Steps**:

```bash
# 1. Set required environment variables
export JWT_SECRET="$(openssl rand -hex 32)"
export CORS_ORIGINS="https://petport.app"
export NODE_ENV="production"
export PORT=3001

# 2. Build
npm run build

# 3. Start
npm run start:api
```

**Railway Configuration** (`railway.json`):

```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "npm run start:api",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Phase 2: Growth (1k-10k Users)

**Upgrade Stack**: Add PostgreSQL + Redis

```
┌────────────────────────────────────────────────────────────────┐
│                    PHASE 2 DEPLOYMENT                           │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Vercel                 Railway (2 instances)                   │
│  ┌──────────────┐       ┌──────────────┐                       │
│  │   Web App    │──────▶│   API (x2)   │                       │
│  │   (Static)   │       │   + LB       │                       │
│  └──────────────┘       └──────────────┘                       │
│                                │                                │
│              ┌─────────────────┼─────────────────┐              │
│              ▼                 ▼                 ▼              │
│       ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│       │ Postgres │      │  Redis   │      │   S3/R2  │         │
│       │  (RDS)   │      │ (cache)  │      │ (photos) │         │
│       └──────────┘      └──────────┘      └──────────┘         │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

**Required Code Changes**:

| Change | Effort | Impact |
|--------|--------|--------|
| PostgreSQL adapter | 2-3 days | Persistent data |
| Redis for rate limits | 1 day | Distributed limits |
| Redis for token blacklist | 0.5 day | Distributed logout |
| S3 for photos | 1 day | Scalable storage |
| Connection pooling | 0.5 day | Performance |

### Phase 3: Scale (10k-1M Users)

**Upgrade Stack**: Kubernetes + Managed Services

```
┌────────────────────────────────────────────────────────────────┐
│                    PHASE 3 DEPLOYMENT                           │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CloudFlare CDN          GKE/EKS Cluster                        │
│  ┌──────────────┐       ┌────────────────────────────────┐     │
│  │   Web App    │──────▶│    Ingress (nginx/traefik)    │     │
│  │   (Edge)     │       └────────────────────────────────┘     │
│  └──────────────┘                     │                         │
│                                       ▼                         │
│                        ┌──────────────────────────────┐         │
│                        │     API Pods (HPA 2-20)      │         │
│                        └──────────────────────────────┘         │
│                                       │                         │
│        ┌──────────────────────────────┼──────────────────────┐  │
│        ▼                              ▼                      ▼  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │ Postgres │   │  Redis   │   │   S3/R2  │   │ BullMQ   │    │
│  │ (Aurora) │   │ Cluster  │   │  (CDN)   │   │ Workers  │    │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘    │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

**Infrastructure Additions**:

| Component | Service | Purpose |
|-----------|---------|---------|
| Database | Aurora PostgreSQL | Read replicas, auto-failover |
| Cache | ElastiCache Redis | Session, rate limits, blacklist |
| Storage | S3 + CloudFront | Photo CDN |
| Queue | SQS + BullMQ | Async PDF generation |
| Search | OpenSearch | Pet discovery (future) |
| Logging | DataDog/Grafana | Observability |

---

## 3. Cost Profile at Scale

### 3.1 Cost Breakdown by User Tier

#### 1,000 Users (MVP)

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| API Server | Railway Hobby | $5 |
| Web Hosting | Vercel Free | $0 |
| Database | SQLite (bundled) | $0 |
| Domain | Namecheap | $1 |
| **Total** | | **~$6/month** |

**Cost per user**: $0.006/user/month

#### 10,000 Users (Growth)

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| API Server (2x) | Railway Pro | $40 |
| Web Hosting | Vercel Pro | $20 |
| PostgreSQL | Railway | $25 |
| Redis | Upstash | $10 |
| S3 Storage (50GB) | AWS | $5 |
| Monitoring | Sentry | $26 |
| Domain + SSL | Route53 | $3 |
| **Total** | | **~$129/month** |

**Cost per user**: $0.013/user/month

#### 100,000 Users (Scale)

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| API Cluster (5x) | AWS EKS | $300 |
| Load Balancer | AWS ALB | $30 |
| PostgreSQL | RDS (db.r6g.large) | $200 |
| Redis | ElastiCache | $75 |
| S3 Storage (500GB) | AWS | $15 |
| CloudFront CDN | AWS | $50 |
| Monitoring Stack | DataDog | $100 |
| Email (SendGrid) | SendGrid | $50 |
| **Total** | | **~$820/month** |

**Cost per user**: $0.0082/user/month

#### 1,000,000 Users (Enterprise)

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| API Cluster (20x) | AWS EKS | $1,500 |
| Load Balancer | AWS ALB | $150 |
| PostgreSQL | Aurora (r6g.xlarge) | $800 |
| Read Replicas (2x) | Aurora | $400 |
| Redis Cluster | ElastiCache | $300 |
| S3 Storage (5TB) | AWS | $120 |
| CloudFront CDN | AWS | $300 |
| SQS + Lambda | AWS | $100 |
| Monitoring Stack | DataDog | $500 |
| Email (SendGrid) | SendGrid | $200 |
| Security (WAF) | AWS | $50 |
| **Total** | | **~$4,420/month** |

**Cost per user**: $0.0044/user/month

### 3.2 Cost Scaling Curve

```
Monthly Cost ($)
     │
5000 │                                              ●
     │                                            /
4000 │                                          /
     │                                        /
3000 │                                      /
     │                                    /
2000 │                                  /
     │                                /
1000 │                        ●─────/
     │            ●─────────/
 500 │      ●────/
     │    /
 100 │  ●
     │/
   0 └───────┬───────┬───────┬───────┬───────┬──────
           1k      10k     100k    500k      1M   Users
```

### 3.3 Unit Economics Summary

| Scale | Monthly Cost | Cost/User | Breakeven Price |
|-------|--------------|-----------|-----------------|
| 1k | $6 | $0.006 | Free tier viable |
| 10k | $129 | $0.013 | $0.50/mo (5% paid) |
| 100k | $820 | $0.008 | $0.50/mo (3% paid) |
| 1M | $4,420 | $0.004 | $0.50/mo (2% paid) |

---

## 4. Failure Scenarios & Mitigations

### 4.1 Critical Failures

#### F1: Database Corruption / Data Loss

**Risk Level**: 🔴 Critical  
**Current State**: SQLite in-memory (HIGH RISK - no persistence)

| Scenario | Impact | Likelihood | Mitigation |
|----------|--------|------------|------------|
| Server restart | Total data loss | HIGH | Migrate to PostgreSQL |
| OOM kill | Partial corruption | MEDIUM | Enable periodic snapshots |
| Disk failure | Data loss | LOW | Multi-AZ database |

**Mitigation Roadmap**:

```
Phase 1 (Now):     Enable SQLite persistence to disk
Phase 2 (Week 1):  Migrate to PostgreSQL
Phase 3 (Month 1): Add automated backups (pg_dump)
Phase 4 (Month 3): Multi-AZ with read replicas
```

#### F2: JWT Secret Compromise

**Risk Level**: 🔴 Critical  
**Current State**: ✅ Fixed (now requires production secret)

| Scenario | Impact | Likelihood | Mitigation |
|----------|--------|------------|------------|
| Secret in repo | Full account takeover | LOW (fixed) | .env exclusion |
| Log exposure | Token forgery | LOW | Log scrubbing |
| Memory dump | Session hijack | VERY LOW | Secret rotation |

**Production Checklist**:
- [x] JWT_SECRET required in production
- [x] Token blacklist on logout
- [ ] Automatic secret rotation (quarterly)
- [ ] Key vault integration (AWS Secrets Manager)

#### F3: Complete Service Outage

**Risk Level**: 🔴 Critical  
**Current State**: Single point of failure

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Server crash | 100% downtime | Health checks + auto-restart |
| Deploy failure | Extended outage | Blue-green deployment |
| DDoS attack | Service unavailable | CloudFlare protection |

**Uptime Targets**:

| Phase | SLA Target | Strategy |
|-------|------------|----------|
| MVP | 95% | Single instance + monitoring |
| Growth | 99% | 2 instances + LB |
| Scale | 99.9% | Multi-AZ + auto-scaling |

### 4.2 High-Severity Failures

#### F4: Photo Storage Exhaustion

**Risk Level**: 🟠 High  
**Current State**: Local filesystem (limited)

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Disk full | Upload failures | S3 migration |
| Server restart | Photo loss | Persistent volumes |
| Large file attack | DoS | File size limits (5MB) |

**Current Limits**:
- Max file size: 5MB
- Allowed types: JPEG, PNG, GIF, WebP
- Magic byte verification: ✅ Enabled

#### F5: PDF Generation Overload

**Risk Level**: 🟠 High  
**Current State**: Synchronous (blocking)

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Batch passport requests | API timeout | Queue system |
| Large PDF | Memory spike | Streaming generation |
| Concurrent users | Thread starvation | Worker pool |

**Recommended Architecture**:

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Request │────▶│   API    │────▶│  BullMQ  │────▶│  Worker  │
│  /passport│     │          │     │  Queue   │     │  Pool    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                      │                                  │
                      │            ┌──────────────────────┘
                      ▼            ▼
                 ┌──────────────────────┐
                 │    S3 (PDF Store)    │
                 └──────────────────────┘
```

#### F6: Rate Limit Bypass (Distributed)

**Risk Level**: 🟠 High  
**Current State**: In-memory (per-instance only)

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Multi-instance | Bypass limits | Redis rate limiter |
| IP rotation | Abuse | Account-based limits |
| Bot traffic | Resource exhaustion | CAPTCHA on signup |

### 4.3 Medium-Severity Failures

#### F7: Email Delivery Failures

**Risk Level**: 🟡 Medium  
**Current State**: Not implemented

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Password reset fails | Support burden | SendGrid/SES |
| Vaccination reminders | User churn | Multi-channel (SMS) |

#### F8: API Version Conflicts

**Risk Level**: 🟡 Medium  
**Current State**: No versioning

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Breaking changes | Client crashes | API versioning (/v1/, /v2/) |
| Mobile app lag | Incompatibility | Deprecation windows |

### 4.4 Failure Response Playbooks

#### Playbook: Database Recovery

```bash
# 1. Identify issue
curl https://api.petport.app/health/detailed

# 2. If database corrupted, restore from backup
pg_restore -d petport latest_backup.dump

# 3. Verify data integrity
npm run db:verify

# 4. Restart services
railway restart
```

#### Playbook: Token Compromise

```bash
# 1. Rotate JWT secret immediately
export JWT_SECRET="$(openssl rand -hex 32)"

# 2. Clear all tokens (force re-login)
redis-cli FLUSHDB

# 3. Notify affected users
npm run notify:password-reset

# 4. Deploy with new secret
railway deploy
```

---

## 5. Monetization Levers

### 5.1 Revenue Model Analysis

| Model | Revenue Potential | Implementation Effort | Recommended Phase |
|-------|-------------------|----------------------|-------------------|
| Freemium SaaS | ⭐⭐⭐⭐⭐ | Medium | Phase 1 |
| Transaction Fees | ⭐⭐⭐⭐ | High | Phase 2 |
| B2B API | ⭐⭐⭐⭐⭐ | Low | Phase 2 |
| Insurance Partnerships | ⭐⭐⭐⭐⭐ | Medium | Phase 3 |

### 5.2 Freemium Tier Structure

#### Free Tier (Hook)

| Feature | Limit |
|---------|-------|
| Pets | 1 |
| Health Records | 10 |
| Vaccinations | Unlimited |
| QR Code | Basic |
| PDF Passport | 1/month |
| Public Profile | Yes |

#### Pro Tier ($4.99/month or $49/year)

| Feature | Limit |
|---------|-------|
| Pets | 5 |
| Health Records | Unlimited |
| Vaccinations | Unlimited |
| QR Code | Branded |
| PDF Passport | Unlimited |
| Public Profile | Customizable |
| Priority Support | Yes |
| Export Data | Yes |

#### Family Tier ($9.99/month or $99/year)

| Feature | Limit |
|---------|-------|
| Pets | 15 |
| Family Members | 5 accounts |
| Shared Access | Yes |
| All Pro Features | Yes |
| Vet Record Import | Yes |

### 5.3 B2B Revenue Streams

#### API Access Tiers

| Tier | Calls/Month | Price | Target Customer |
|------|-------------|-------|-----------------|
| Developer | 1,000 | Free | Hobbyists |
| Startup | 50,000 | $99/mo | Pet apps |
| Business | 500,000 | $499/mo | Vet chains |
| Enterprise | Unlimited | Custom | Airlines, hotels |

#### Integration Partners

| Partner Type | Revenue Model | Potential ARR |
|--------------|---------------|---------------|
| Pet Insurance | Lead gen ($5-10/lead) | $50k-100k |
| Airlines | Verification API ($0.50/check) | $100k-500k |
| Vet Clinics | White-label SaaS ($50-200/mo) | $200k-1M |
| Pet Hotels | Verification bundle ($100/mo) | $50k-200k |
| Breeders | Registry subscription ($20/mo) | $30k-100k |

### 5.4 Monetization Implementation Roadmap

```
Month 1-3: Launch Free + Pro tiers
           - Stripe integration
           - Usage metering
           - Upgrade prompts in UI

Month 4-6: Add Family tier + API access
           - Multi-user accounts
           - API key management
           - Developer portal

Month 7-12: B2B partnerships
            - White-label customization
            - Partner onboarding
            - Revenue share agreements
```

### 5.5 Pricing Psychology Tactics

| Tactic | Implementation |
|--------|----------------|
| Anchoring | Show Pro price crossed out on Family |
| Loss aversion | "Upgrade to keep your records" |
| Social proof | "Join 10,000+ pet owners" |
| Urgency | "Annual plan saves 20%" |
| Free trial | 14-day Pro trial for new users |

---

## 6. Analytics to Track

### 6.1 North Star Metrics

| Metric | Definition | Target (MVP) | Target (Scale) |
|--------|------------|--------------|----------------|
| **MAU** | Monthly Active Users | 500 | 100k |
| **Pet Profiles Created** | Total pets registered | 1,000 | 500k |
| **Verification Scans** | Public profile views | 100/mo | 50k/mo |
| **Paid Conversion** | Free → Pro | 5% | 8% |

### 6.2 Acquisition Metrics

| Metric | Event | Priority |
|--------|-------|----------|
| Signups | `user_registered` | 🔴 Critical |
| Signup Source | `user_registered.source` | 🔴 Critical |
| Organic vs Paid | `user_registered.attribution` | 🟠 High |
| First Pet Creation | `pet_created.first_pet` | 🔴 Critical |
| Time to First Pet | `pet_created.time_since_signup` | 🟠 High |

### 6.3 Activation Metrics

| Metric | Event | Target |
|--------|-------|--------|
| Profile Completion | `pet_profile_complete` | 70% |
| First Vaccination Added | `vaccination_added.first` | 60% |
| First QR Share | `qr_shared.first` | 30% |
| First PDF Download | `passport_downloaded.first` | 25% |

### 6.4 Engagement Metrics

| Metric | Event | Frequency |
|--------|-------|-----------|
| Daily Active Users | `session_started` | Daily |
| Pet Profile Views | `pet_viewed` | Per session |
| Health Records Added | `health_record_added` | Monthly |
| Share Actions | `profile_shared` | Weekly |
| Return Rate (D7) | `session_started.d7_return` | Weekly |

### 6.5 Retention Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| D1 Retention | Return next day | 40% |
| D7 Retention | Return within week | 25% |
| D30 Retention | Return within month | 15% |
| Churn Rate | Cancel/inactive | <5%/mo |

### 6.6 Revenue Metrics

| Metric | Event | Priority |
|--------|-------|----------|
| Trial Starts | `trial_started` | 🔴 Critical |
| Trial → Paid | `subscription_created` | 🔴 Critical |
| MRR | `subscription_created.mrr` | 🔴 Critical |
| ARPU | Revenue / Active Users | 🟠 High |
| LTV | Lifetime revenue | 🟠 High |
| CAC | Acquisition cost | 🟠 High |

### 6.7 Viral Metrics

| Metric | Event | Target |
|--------|-------|--------|
| Public Profile Views | `public_profile_viewed` | 2x pets |
| Verify → Signup | `signup_from_verify` | 10% |
| Share Rate | `profile_shared / pets` | 40% |
| Viral Coefficient | New users from shares | >1.0 |

### 6.8 Technical Metrics

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| API Latency (p95) | APM | >500ms |
| Error Rate | Sentry | >1% |
| Database Connections | DB Pool | >80% |
| Memory Usage | Server | >85% |
| Uptime | Health checks | <99% |

### 6.9 Recommended Analytics Stack

| Phase | Tool | Purpose |
|-------|------|---------|
| MVP | PostHog (free) | Product analytics |
| MVP | Sentry (free) | Error tracking |
| Growth | Mixpanel | Funnel analysis |
| Growth | Stripe Dashboard | Revenue metrics |
| Scale | Amplitude | Advanced analytics |
| Scale | Looker | BI dashboards |

### 6.10 Event Schema

```typescript
// Core events to implement
interface AnalyticsEvents {
  // Acquisition
  'user_registered': { source: string; referrer?: string };
  'user_login': { method: 'email' | 'google' };
  
  // Activation
  'pet_created': { species: string; first_pet: boolean };
  'pet_profile_complete': { completion_percent: number };
  'vaccination_added': { type: string; first: boolean };
  
  // Engagement
  'qr_viewed': { pet_id: string };
  'qr_shared': { method: 'native' | 'copy' };
  'passport_downloaded': { pet_id: string };
  'public_profile_viewed': { pet_id: string; referrer?: string };
  
  // Retention
  'notification_viewed': { type: string };
  'notification_clicked': { type: string; pet_id: string };
  
  // Revenue
  'trial_started': { plan: string };
  'subscription_created': { plan: string; interval: string; mrr: number };
  'subscription_cancelled': { reason?: string };
  
  // Viral
  'signup_from_verify': { referrer_pet_id: string };
  'invite_sent': { method: string };
}
```

---

## 7. Operational Checklists

### 7.1 Pre-Launch Checklist

```
Security
□ JWT_SECRET is random 256-bit value
□ CORS_ORIGINS is restricted to production domain
□ Rate limiting is enabled
□ HTTPS is enforced
□ Security headers (Helmet) configured

Data
□ Database backups configured (if PostgreSQL)
□ Data export feature works
□ GDPR deletion endpoint tested

Monitoring
□ Health check endpoint responds
□ Error tracking (Sentry) connected
□ Uptime monitoring configured
□ Log aggregation enabled

Performance
□ Build is optimized (production mode)
□ Static assets on CDN
□ API response times <200ms p50

Legal
□ Terms of Service published
□ Privacy Policy published
□ Cookie consent (if EU traffic)
```

### 7.2 Deployment Checklist

```
Pre-Deploy
□ All tests passing (npm test)
□ Build succeeds (npm run build)
□ Environment variables documented
□ Database migrations ready

Deploy
□ Deploy to staging first
□ Run smoke tests on staging
□ Monitor error rates for 15min
□ Promote to production

Post-Deploy
□ Verify health endpoint
□ Check error tracking for new issues
□ Monitor API latency
□ Validate critical user flows
```

### 7.3 Incident Response Checklist

```
Detection (0-5 min)
□ Acknowledge alert
□ Assess severity (P1-P4)
□ Notify stakeholders if P1/P2

Investigation (5-30 min)
□ Check health endpoints
□ Review recent deployments
□ Check error logs
□ Identify root cause

Mitigation (30-60 min)
□ Implement fix or rollback
□ Verify service restored
□ Update status page

Post-Incident (within 24h)
□ Write incident report
□ Identify preventive measures
□ Update runbooks
□ Schedule follow-up fixes
```

### 7.4 Scaling Trigger Checklist

**When to Scale Up**:

```
□ API p95 latency >500ms for 5+ minutes
□ Database connections >80% pool
□ Memory usage >85% sustained
□ Error rate >2% of requests
□ Queue depth growing faster than processing
```

**When to Scale Down**:

```
□ CPU usage <20% for 1+ hour
□ API p95 latency <100ms sustained
□ Cost per user increasing without revenue
```

---

## Appendix A: Environment Variables

```bash
# Required for Production
JWT_SECRET=<random-256-bit-hex>
CORS_ORIGINS=https://petport.app
NODE_ENV=production
PORT=3001

# Recommended
BCRYPT_ROUNDS=12
JWT_EXPIRY=7d
LOG_LEVEL=info

# Phase 2 (PostgreSQL)
DATABASE_URL=postgres://user:pass@host:5432/petport

# Phase 2 (Redis)
REDIS_URL=redis://host:6379

# Phase 2 (S3)
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
S3_BUCKET=petport-uploads

# Phase 3 (Email)
SENDGRID_API_KEY=<key>
FROM_EMAIL=noreply@petport.app
```

---

## Appendix B: Infrastructure Cost Calculator

```
=== MONTHLY COST FORMULA ===

Base Cost:
  Server: $5 × (users / 1000) × instance_count
  Database: $25 × (users / 10000)
  Cache: $10 × (users / 10000)
  Storage: $0.023 × (photos × 2MB / 1GB)
  CDN: $0.085 × (bandwidth_GB)

Variable Cost:
  PDF Generation: $0.001 × pdfs_generated
  Email: $0.0001 × emails_sent
  SMS (optional): $0.01 × sms_sent

Total = Base + Variable + 20% buffer
```

---

**Document Prepared By**: Operations Team  
**Review Cycle**: Quarterly  
**Next Review**: April 2026
