# Logs API Documentation

## Get Activity Logs
`GET /api/admin/logs/activity`

Get detailed activity logs with filtering options.

### Query Parameters
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `action`: Filter by action type
- `entityType`: Filter by entity type
- `userId`: Filter by user ID
- `startDate`: Filter from date
- `endDate`: Filter to date

### Response
```json
{
  "logs": [
    {
      "id": "string",
      "user_id": "string",
      "action": "LOGIN_ATTEMPT",
      "entity_type": "user",
      "entity_id": "string",
      "details": {},
      "ip_address": "string",
      "user_agent": "string",
      "created_at": "string",
      "user": {
        "email": "string",
        "full_name": "string"
      }
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 50
}
```

## Get Audit Logs
`GET /api/admin/logs/audit`

Get security audit logs with severity and category filtering.

### Query Parameters
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `severity`: Filter by severity (low, medium, high, critical)
- `category`: Filter by category (security, access, data, system)
- `startDate`: Filter from date
- `endDate`: Filter to date

### Response
```json
{
  "logs": {
    "security": [
      {
        "id": "string",
        "action": "LOGIN_ATTEMPT",
        "details": {
          "severity": "high",
          "category": "security",
          "description": "Failed login attempt"
        },
        "created_at": "string"
      }
    ]
  },
  "summary": {
    "total": 100,
    "bySeverity": {
      "high": 10,
      "medium": 30,
      "low": 60
    },
    "byCategory": {
      "security": 40,
      "access": 30,
      "data": 30
    }
  }
}
```

## Get System Health
`GET /api/admin/health/system`

Get current system health status and metrics.

### Response
```json
{
  "status": "healthy",
  "timestamp": "string",
  "metrics": {
    "cpu": {
      "loadAverage": [1.5, 1.2, 1.0],
      "cpus": 8,
      "uptime": 86400
    },
    "memory": {
      "total": 16000000000,
      "free": 8000000000,
      "usage": 50
    }
  },
  "database": {
    "status": "healthy",
    "connections": 10
  },
  "recentLogs": []
}
```

## Get System Metrics
`GET /api/admin/health/metrics`

Get detailed system metrics over time.

### Query Parameters
- `duration`: Time range (24h, 7d, 30d)
- `metrics`: Comma-separated list of metrics to include

### Response
```json
{
  "system": {
    "2025-02-07T08:00:00Z": {
      "cpu_usage": 45,
      "memory_usage": 60,
      "response_time": 150
    }
  },
  "performance": {
    "responseTime": 150,
    "errorRate": 0.1,
    "successRate": 99.9
  },
  "summary": {
    "avgResponseTime": 145,
    "avgCpuUsage": 50,
    "avgMemoryUsage": 65,
    "totalErrors": 10
  }
}
```
