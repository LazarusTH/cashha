import { createClient } from '@supabase/supabase-js'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import fetchMock from 'jest-fetch-mock'

// Enable fetch mock
fetchMock.enableMocks()

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Test data
export const TEST_USERS = {
  admin: {
    id: 'admin-id',
    email: 'admin1@test.com',
    role: 'admin',
  },
  user: {
    id: 'user-id',
    email: 'user1@test.com',
    role: 'user',
  }
} as const

export const TEST_WALLETS = {
  admin: {
    id: 'admin-wallet-id',
    user_id: TEST_USERS.admin.id,
    balance: 1000.00,
    currency: 'USD',
  },
  user: {
    id: 'user-wallet-id',
    user_id: TEST_USERS.user.id,
    balance: 500.00,
    currency: 'USD',
  }
} as const

// Mock Supabase client
export const mockSupabaseClient = mockDeep<ReturnType<typeof createClient>>()

// Add proper typing for mock methods
type MockClient = DeepMockProxy<ReturnType<typeof createClient>>

interface MockBuilder {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  single: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  then: jest.Mock;
  catch: jest.Mock;
  finally: jest.Mock;
  data?: any;
  mockResolvedValue: (value: any) => MockBuilder;
  mockResolvedValueOnce: (value: any) => MockBuilder;
}

function createMockBuilder(): MockBuilder {
  const mockBuilder: MockBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    then: jest.fn(),
    catch: jest.fn(),
    finally: jest.fn(),
    mockResolvedValue(value: any) {
      this.data = value;
      return this;
    },
    mockResolvedValueOnce(value: any) {
      this.data = value;
      return this;
    }
  };

  // Add promise-like behavior
  mockBuilder.then.mockImplementation((resolve) => {
    return Promise.resolve(resolve ? resolve(mockBuilder.data) : mockBuilder.data);
  });

  return mockBuilder;
}

function mockSupabaseFrom(supabaseClient: any) {
  // Create mock functions that return the builder
  const mockFrom = jest.fn().mockImplementation(() => createMockBuilder());
  const mockRpc = jest.fn().mockImplementation(() => createMockBuilder());

  // Attach the mock functions to the client
  supabaseClient.from = mockFrom;
  supabaseClient.rpc = mockRpc;
}

// Mock session
export const mockSession = (user: typeof TEST_USERS.user | typeof TEST_USERS.admin) => ({
  user: {
    id: user.id,
    email: user.email,
    user_metadata: {
      role: user.role
    }
  },
  expires_at: Date.now() + 3600
})

// Mock fetch responses
export const mockApiResponse = (data: any, status = 200) => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data
  }
}

// Reset mocks before each test
beforeEach(() => {
  fetchMock.resetMocks()
  mockSupabaseFrom(mockSupabaseClient)

  // Default fetch mock implementation
  fetchMock.mockImplementation((url: string | Request | undefined, init?: RequestInit): Promise<Response> => {
    if (!url) {
      return Promise.resolve(new Response(JSON.stringify({ error: 'No URL provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    const urlString = typeof url === 'string' ? url : url.url;

    if (urlString.includes('/api/admin/logs/activity')) {
      return Promise.resolve(new Response(JSON.stringify({
        logs: [
          {
            id: 'log1',
            timestamp: new Date().toISOString(),
            action: 'login',
            userId: 'user1'
          }
        ],
        total: 100,
        page: 1
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    if (urlString.includes('/api/admin/logs/audit')) {
      return Promise.resolve(new Response(JSON.stringify({
        logs: {
          security: [
            {
              id: 'audit1',
              severity: 'high',
              message: 'Failed login attempt'
            }
          ]
        },
        summary: {
          total: 50,
          high: 10,
          medium: 20,
          low: 20
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    if (urlString.includes('/api/admin/health/system')) {
      return Promise.resolve(new Response(JSON.stringify({
        status: 'healthy',
        uptime: 3600,
        memory_usage: 512,
        metrics: {
          cpu: {
            loadAverage: [0.5, 0.7, 0.8],
            usage: 45
          },
          memory: {
            total: 16384,
            used: 8192,
            free: 8192
          }
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    if (urlString.includes('/api/admin/health/metrics')) {
      return Promise.resolve(new Response(JSON.stringify({
        system: {
          cpu: 45,
          memory: 60,
          disk: 70
        },
        summary: {
          avgCpuUsage: 42,
          avgMemoryUsage: 58,
          peakUsage: {
            cpu: 80,
            memory: 85
          }
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    if (urlString.includes('/api/admin/reports/transactions')) {
      return Promise.resolve(new Response(JSON.stringify({
        report: {
          total_transactions: 1000,
          total_volume: 50000,
          average_transaction: 50
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    if (urlString.includes('/api/admin/reports/users')) {
      return Promise.resolve(new Response(JSON.stringify({
        report: {
          total_users: 500,
          active_users: 300,
          new_users_today: 10
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    if (urlString.includes('/api/admin/reports/revenue')) {
      return Promise.resolve(new Response(JSON.stringify({
        report: {
          total_revenue: 10000,
          monthly_revenue: 2500,
          revenue_growth: 0.15
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    if (urlString.includes('/api/user/account/close')) {
      return Promise.resolve(new Response(JSON.stringify({
        success: true,
        message: 'Account closed successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    if (urlString.includes('/api/user/account/export')) {
      return Promise.resolve(new Response(JSON.stringify({
        data: {
          user: TEST_USERS.user,
          transactions: [],
          settings: {}
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    if (urlString.includes('/api/user/account/settings')) {
      return Promise.resolve(new Response(JSON.stringify({
        settings: {
          notifications: true,
          two_factor: false,
          language: 'en'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Default response
    return Promise.resolve(new Response(JSON.stringify({ message: "Mock response" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  });
})
