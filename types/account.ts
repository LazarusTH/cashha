export interface UserAccountSettings {
  id: string;
  user_id: string;
  daily_transfer_limit: number;
  monthly_transfer_limit: number;
  require_2fa: boolean;
  last_security_review?: string;
  account_closure_reason?: string;
  account_closure_date?: string;
  created_at: string;
  updated_at: string;
}

export interface SecuritySettings {
  settings: UserAccountSettings;
  securityEvents: ActivityLog[];
  factors: {
    totp?: {
      id: string;
      status: 'enabled' | 'disabled';
    };
  };
}

export interface AccountExportData {
  profile: {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    role: string;
    status: string;
    created_at: string;
  };
  transactions: {
    id: string;
    amount: number;
    type: string;
    status: string;
    description?: string;
    created_at: string;
    sender?: string;
    recipient?: string;
  }[];
  preferences?: {
    email_notifications: boolean;
    push_notifications: boolean;
    transaction_alerts: boolean;
    security_alerts: boolean;
    marketing_emails: boolean;
  };
  settings?: UserAccountSettings;
  exportDate: string;
}
