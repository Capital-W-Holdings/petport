import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/Layout';
import { Card, Button, Badge, LoadingState, ErrorState, Alert } from '@/components/ui';
import {
  admin,
  SecurityAudit,
  SecurityMetrics,
  OwaspItem,
  ComplianceIndicator,
  SecurityCategory,
} from '@/lib/api';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Activity,
  Lock,
  FileWarning,
  Server,
  Clock,
  Users,
  Key,
} from 'lucide-react';

type TabType = 'audit' | 'metrics';

export function SecurityReportPage() {
  const [audit, setAudit] = useState<SecurityAudit | null>(null);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('audit');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [auditData, metricsData] = await Promise.all([
        admin.getSecurityAudit(),
        admin.getSecurityMetrics(),
      ]);
      setAudit(auditData);
      setMetrics(metricsData);
    } catch (err) {
      setError('Failed to load security data. Please try again.');
      console.error('Security data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading security report..." />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState message={error} onRetry={loadData} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-forest">Security Report</h1>
            <p className="text-stone mt-1">
              Comprehensive security analysis and live monitoring
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-stone">
              Last updated: {new Date(audit?.timestamp || '').toLocaleString()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overall Grade Card */}
        {audit && <OverallGradeCard audit={audit} />}

        {/* Tab Navigation */}
        <div className="border-b border-sand">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab('audit')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'audit'
                  ? 'border-forest text-forest'
                  : 'border-transparent text-stone hover:text-charcoal hover:border-sand'
              }`}
            >
              <Shield className="h-4 w-4 inline mr-2" />
              Security Audit
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'metrics'
                  ? 'border-forest text-forest'
                  : 'border-transparent text-stone hover:text-charcoal hover:border-sand'
              }`}
            >
              <Activity className="h-4 w-4 inline mr-2" />
              Live Metrics
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'audit' && audit && <AuditTabContent audit={audit} />}
        {activeTab === 'metrics' && metrics && <MetricsTabContent metrics={metrics} />}
      </div>
    </DashboardLayout>
  );
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

function OverallGradeCard({ audit }: { audit: SecurityAudit }) {
  const gradeColors: Record<string, string> = {
    A: 'bg-green-500',
    B: 'bg-green-400',
    C: 'bg-yellow-500',
    D: 'bg-orange-500',
    F: 'bg-red-500',
  };

  return (
    <Card className="bg-gradient-to-r from-forest to-pine text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">Overall Security Grade</p>
          <div className="flex items-center gap-4 mt-2">
            <div
              className={`${gradeColors[audit.overallGrade]} text-white text-4xl font-bold w-16 h-16 rounded-full flex items-center justify-center`}
            >
              {audit.overallGrade}
            </div>
            <div>
              <p className="text-2xl font-bold">{audit.overallScore}%</p>
              <p className="text-white/70 text-sm">
                {audit.overallScore >= 80
                  ? 'Good security posture'
                  : audit.overallScore >= 60
                    ? 'Room for improvement'
                    : 'Needs attention'}
              </p>
            </div>
          </div>
        </div>
        <Shield className="h-20 w-20 text-white/20" />
      </div>
    </Card>
  );
}

function AuditTabContent({ audit }: { audit: SecurityAudit }) {
  return (
    <div className="space-y-8">
      {/* OWASP Top 10 */}
      <div>
        <h2 className="text-xl font-semibold text-charcoal mb-4">OWASP Top 10 Compliance</h2>
        <Card>
          <div className="divide-y divide-sand">
            {audit.owaspCompliance.map((item) => (
              <OwaspItemRow key={item.id} item={item} />
            ))}
          </div>
        </Card>
      </div>

      {/* Compliance Indicators */}
      <div>
        <h2 className="text-xl font-semibold text-charcoal mb-4">Compliance Standards</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {audit.complianceIndicators.map((indicator) => (
            <ComplianceCard key={indicator.standard} indicator={indicator} />
          ))}
        </div>
      </div>

      {/* Security Categories */}
      <div>
        <h2 className="text-xl font-semibold text-charcoal mb-4">Security Categories</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {audit.categories.map((category) => (
            <SecurityCategoryCard key={category.name} category={category} />
          ))}
        </div>
      </div>
    </div>
  );
}

function OwaspItemRow({ item }: { item: OwaspItem }) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = {
    pass: <CheckCircle className="h-5 w-5 text-green-600" />,
    partial: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
    fail: <XCircle className="h-5 w-5 text-red-600" />,
    'not-applicable': <span className="h-5 w-5 text-stone">N/A</span>,
  };

  const statusBadge = {
    pass: 'success' as const,
    partial: 'warning' as const,
    fail: 'error' as const,
    'not-applicable': 'default' as const,
  };

  return (
    <div className="py-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          {statusIcon[item.status]}
          <div>
            <span className="font-mono text-sm text-stone">{item.id}</span>
            <span className="mx-2 text-charcoal font-medium">{item.name}</span>
          </div>
        </div>
        <Badge variant={statusBadge[item.status]}>
          {item.status.replace('-', ' ').toUpperCase()}
        </Badge>
      </button>

      {expanded && (
        <div className="mt-4 pl-8 space-y-3">
          <p className="text-stone text-sm">{item.description}</p>

          {item.findings.length > 0 && (
            <div>
              <p className="text-sm font-medium text-charcoal mb-1">Findings:</p>
              <ul className="list-disc list-inside text-sm text-stone">
                {item.findings.map((finding, i) => (
                  <li key={i}>{finding}</li>
                ))}
              </ul>
            </div>
          )}

          {item.recommendations.length > 0 && (
            <div>
              <p className="text-sm font-medium text-charcoal mb-1">Recommendations:</p>
              <ul className="list-disc list-inside text-sm text-stone">
                {item.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ComplianceCard({ indicator }: { indicator: ComplianceIndicator }) {
  const statusColors = {
    compliant: 'text-green-600 bg-green-100',
    partial: 'text-yellow-600 bg-yellow-100',
    'non-compliant': 'text-red-600 bg-red-100',
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-charcoal">{indicator.standard}</h3>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${statusColors[indicator.status]}`}
        >
          {indicator.status.replace('-', ' ').toUpperCase()}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-stone">Coverage</span>
          <span className="font-medium">{indicator.coverage}%</span>
        </div>
        <div className="w-full bg-sand rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              indicator.coverage >= 70
                ? 'bg-green-500'
                : indicator.coverage >= 40
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${indicator.coverage}%` }}
          />
        </div>
      </div>

      <p className="text-sm text-stone">{indicator.details}</p>
    </Card>
  );
}

function SecurityCategoryCard({ category }: { category: SecurityCategory }) {
  const iconMap: Record<string, React.ReactNode> = {
    Authentication: <Lock className="h-6 w-6" />,
    'File Upload': <FileWarning className="h-6 w-6" />,
    'API Security': <Server className="h-6 w-6" />,
  };

  const statusColors = {
    good: 'text-green-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600',
  };

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className={`${statusColors[category.status]}`}>
          {iconMap[category.name] || <Shield className="h-6 w-6" />}
        </div>
        <div>
          <h3 className="font-semibold text-charcoal">{category.name}</h3>
          <p className="text-sm text-stone">
            {category.score}/{category.maxScore} points
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {category.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-stone">{item.name}</span>
            <Badge
              variant={
                item.status === 'pass'
                  ? 'success'
                  : item.status === 'warning'
                    ? 'warning'
                    : 'error'
              }
            >
              {item.status.toUpperCase()}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MetricsTabContent({ metrics }: { metrics: SecurityMetrics }) {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<AlertTriangle className="h-6 w-6 text-yellow-600" />}
          label="Failed Logins (24h)"
          value={metrics.failedLogins.last24Hours}
          subtext={`${metrics.failedLogins.last7Days} in 7 days`}
        />
        <MetricCard
          icon={<XCircle className="h-6 w-6 text-red-600" />}
          label="API Errors (24h)"
          value={metrics.apiErrors.errors24h}
          subtext={`${metrics.apiErrors.errorRate}% error rate`}
        />
        <MetricCard
          icon={<Key className="h-6 w-6 text-forest" />}
          label="Tokens Issued (24h)"
          value={metrics.tokenUsage.tokensIssued24h}
          subtext={`${metrics.tokenUsage.tokensRevoked24h} revoked`}
        />
        <MetricCard
          icon={<Shield className="h-6 w-6 text-pine" />}
          label="Rate Limited (24h)"
          value={metrics.rateLimiting.blockedRequests24h}
          subtext={metrics.rateLimiting.enabled ? 'Rate limiting active' : 'Disabled'}
        />
      </div>

      {/* Recent Failed Logins */}
      <div>
        <h2 className="text-xl font-semibold text-charcoal mb-4">Recent Failed Login Attempts</h2>
        <Card>
          {metrics.failedLogins.recentAttempts.length === 0 ? (
            <p className="text-stone text-center py-4">No recent failed login attempts</p>
          ) : (
            <div className="divide-y divide-sand">
              {metrics.failedLogins.recentAttempts.map((attempt, i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-charcoal">{attempt.email || 'Unknown'}</p>
                    <p className="text-sm text-stone">
                      {attempt.ipAddress || 'Unknown IP'} - {attempt.reason}
                    </p>
                  </div>
                  <div className="text-right">
                    <Clock className="h-4 w-4 text-stone inline mr-1" />
                    <span className="text-sm text-stone">
                      {new Date(attempt.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Suspicious Activity */}
      <div>
        <h2 className="text-xl font-semibold text-charcoal mb-4">Suspicious Activity</h2>
        <Card>
          {metrics.suspiciousActivity.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-stone">No suspicious activity detected</p>
            </div>
          ) : (
            <div className="divide-y divide-sand">
              {metrics.suspiciousActivity.map((activity) => (
                <div key={activity.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`h-5 w-5 ${
                          activity.severity === 'critical'
                            ? 'text-red-600'
                            : activity.severity === 'high'
                              ? 'text-orange-600'
                              : 'text-yellow-600'
                        }`}
                      />
                      <span className="font-medium text-charcoal">{activity.type}</span>
                    </div>
                    <Badge
                      variant={
                        activity.severity === 'critical' || activity.severity === 'high'
                          ? 'error'
                          : 'warning'
                      }
                    >
                      {activity.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-stone mt-1">{activity.description}</p>
                  <p className="text-xs text-stone mt-1">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtext: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-sand/50 rounded-lg">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-charcoal">{value}</p>
          <p className="text-sm font-medium text-charcoal">{label}</p>
          <p className="text-xs text-stone">{subtext}</p>
        </div>
      </div>
    </Card>
  );
}

export default SecurityReportPage;
