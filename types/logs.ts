export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: {
    email: string;
    full_name: string;
  };
}

export interface AuditLog extends ActivityLog {
  details: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'security' | 'access' | 'data' | 'system';
    description: string;
    metadata?: Record<string, any>;
  };
}

export interface SystemHealthLog {
  id: string;
  service: string;
  status: 'healthy' | 'warning' | 'error';
  metrics?: {
    cpu?: {
      loadAverage: number[];
      cpus: number;
      uptime: number;
    };
    memory?: {
      total: number;
      free: number;
      usage: number;
    };
  };
  error?: string;
  created_at: string;
}

export interface SystemMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  labels?: Record<string, string>;
  timestamp: string;
}

export interface MetricsResponse {
  system: Record<string, Record<string, number>>;
  performance: {
    responseTime: number;
    errorRate: number;
    successRate: number;
  };
  summary: {
    avgResponseTime: number;
    avgCpuUsage: number;
    avgMemoryUsage: number;
    totalErrors: number;
  };
}
