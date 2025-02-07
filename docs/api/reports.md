# Reports API Documentation

## Generate Transaction Report
`POST /api/admin/reports/transactions`

Generate a detailed report of transactions with statistics.

### Request Body
```json
{
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-02-01T00:00:00Z",
  "type": "transfer | deposit | withdrawal",
  "status": "completed | pending | failed"
}
```

### Response
```json
{
  "report": {
    "id": "string",
    "type": "transactions",
    "status": "completed",
    "stats": {
      "totalCount": 100,
      "totalAmount": 50000,
      "byType": {
        "transfer": 50,
        "deposit": 30,
        "withdrawal": 20
      },
      "byStatus": {
        "completed": 90,
        "pending": 8,
        "failed": 2
      }
    }
  }
}
```

## Generate User Report
`POST /api/admin/reports/users`

Generate a detailed report of user statistics and activity.

### Request Body
```json
{
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-02-01T00:00:00Z",
  "role": "user | admin",
  "status": "active | suspended | closed"
}
```

### Response
```json
{
  "report": {
    "id": "string",
    "type": "users",
    "status": "completed",
    "stats": {
      "totalUsers": 1000,
      "byRole": {
        "user": 980,
        "admin": 20
      },
      "byStatus": {
        "active": 950,
        "suspended": 30,
        "closed": 20
      },
      "transactionStats": {
        "totalTransactions": 5000,
        "totalVolume": 1000000
      }
    }
  }
}
```

## Generate Revenue Report
`POST /api/admin/reports/revenue`

Generate a detailed report of revenue and fees.

### Request Body
```json
{
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-02-01T00:00:00Z",
  "groupBy": "day | month"
}
```

### Response
```json
{
  "report": {
    "id": "string",
    "type": "revenue",
    "status": "completed",
    "stats": {
      "totalRevenue": 50000,
      "totalTransactions": 1000,
      "averageFee": 50,
      "byPeriod": {
        "2025-01": {
          "revenue": 25000,
          "count": 500
        },
        "2025-02": {
          "revenue": 25000,
          "count": 500
        }
      }
    }
  }
}
```
