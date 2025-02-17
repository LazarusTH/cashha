# Account Management API Documentation

## Close Account
`POST /api/user/account/close`

Close a user's account after validating there are no pending transactions.

### Request Body
```json
{
  "reason": "string"
}
```

### Response
```json
{
  "message": "Account closed successfully"
}
```

## Export Account Data
`GET /api/user/account/export`

Export all user data in compliance with GDPR requirements.

### Response
```json
{
  "profile": {
    "id": "string",
    "email": "string",
    "full_name": "string",
    "phone": "string",
    "role": "string",
    "status": "string"
  },
  "transactions": [
    {
      "id": "string",
      "amount": 1000,
      "type": "transfer",
      "status": "completed",
      "description": "string",
      "created_at": "string",
      "sender": "string",
      "recipient": "string"
    }
  ],
  "preferences": {
    "email_notifications": true,
    "push_notifications": true,
    "transaction_alerts": true,
    "security_alerts": true,
    "marketing_emails": false
  },
  "settings": {
    "daily_transfer_limit": 10000,
    "monthly_transfer_limit": 100000
  },
  "exportDate": "string"
}
```

## Get Account Settings
`GET /api/user/account/settings`

Get user's account settings and preferences.

### Response
```json
{
  "settings": {
    "email_notifications": true,
    "login_alerts": true,
    "transaction_alerts": true,
    "marketing_emails": false
  }
}
```

## Update Account Settings
`PUT /api/user/account/settings`

Update user's account settings and preferences.

### Request Body
```json
{
  "email_notifications": true,
  "login_alerts": true,
  "transaction_alerts": true,
  "marketing_emails": false
}
```

### Response
```json
{
  "message": "Settings updated successfully",
  "settings": {
    "email_notifications": true,
    "login_alerts": true,
    "transaction_alerts": true,
    "marketing_emails": false
  }
}
```

## Get Account Activity
`GET /api/user/account/activity`

Get user's recent account activity and security events.

### Response
```json
{
  "events": [
    {
      "type": "LOGIN",
      "timestamp": "2025-02-17T13:30:00Z",
      "details": {
        "ip": "192.168.1.1",
        "location": "New York, US",
        "device": "Chrome on Windows"
      }
    }
  ]
}
```

## Close Account
`POST /api/user/account/close`

Close user's account and handle cleanup.

### Request Body
```json
{
  "reason": "No longer needed",
  "feedback": "Great service but moving to a different solution"
}
```

### Response
```json
{
  "message": "Account closed successfully",
  "closed_at": "2025-02-17T13:30:00Z"
}
```
