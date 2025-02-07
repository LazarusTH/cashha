export interface Report {
  id: string;
  admin_id: string;
  type: 'transactions' | 'users' | 'revenue';
  parameters: ReportParameters;
  status: 'pending' | 'processing' | 'completed' | 'error';
  file_url?: string;
  created_at: string;
  completed_at?: string;
  error?: string;
}

export interface ReportParameters {
  startDate?: string;
  endDate?: string;
  type?: string;
  status?: string;
  role?: string;
  groupBy?: 'day' | 'month';
  stats?: {
    totalCount?: number;
    totalAmount?: number;
    byType?: Record<string, number>;
    byStatus?: Record<string, number>;
    byPeriod?: Record<string, { revenue: number; count: number }>;
  };
}

export interface TransactionReport extends Report {
  type: 'transactions';
  parameters: ReportParameters & {
    stats?: {
      totalCount: number;
      totalAmount: number;
      byType: Record<string, number>;
      byStatus: Record<string, number>;
    };
  };
}

export interface UserReport extends Report {
  type: 'users';
  parameters: ReportParameters & {
    stats?: {
      totalUsers: number;
      byRole: Record<string, number>;
      byStatus: Record<string, number>;
      transactionStats: {
        totalTransactions: number;
        totalVolume: number;
      };
    };
  };
}

export interface RevenueReport extends Report {
  type: 'revenue';
  parameters: ReportParameters & {
    stats?: {
      totalRevenue: number;
      totalTransactions: number;
      averageFee: number;
      byPeriod: Record<string, { revenue: number; count: number }>;
      byType: Record<string, { revenue: number; count: number }>;
    };
  };
}
