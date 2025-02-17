export interface UserAccountSettings {
  id: string;
  user_id: string;
  daily_transfer_limit: number;
  monthly_transfer_limit: number;
  last_security_review?: string;
  account_closure_reason?: string;
  account_closure_date?: string;
  created_at: string;
  updated_at: string;
}

export interface SecuritySettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  login_alerts: boolean;
  transaction_alerts: boolean;
  marketing_emails: boolean;
  account_updates: boolean;
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

export interface AccountSettings {
  security: SecuritySettings;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  preferences: {
    language: string;
    currency: string;
    timezone: string;
  };
}
