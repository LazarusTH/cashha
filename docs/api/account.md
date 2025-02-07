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
    "monthly_transfer_limit": 100000,
    "require_2fa": true
  },
  "exportDate": "string"
}
```

## Get Security Settings
`GET /api/user/account/security`

Get user's security settings and recent security events.

### Response
```json
{
  "settings": {
    "require_2fa": true,
    "last_security_review": "string"
  },
  "securityEvents": [
    {
      "action": "LOGIN_ATTEMPT",
      "details": {
        "success": true,
        "ip_address": "string"
      },
      "created_at": "string"
    }
  ],
  "factors": {
    "totp": {
      "id": "string",
      "status": "enabled"
    }
  }
}
```

## Update Security Settings
`PUT /api/user/account/security`

Update user's security settings and configure 2FA.

### Request Body
```json
{
  "require_2fa": true,
  "daily_transfer_limit": 10000,
  "monthly_transfer_limit": 100000
}
```

### Response
```json
{
  "message": "Security settings updated",
  "factorData": {
    "qr": "string",
    "secret": "string"
  }
}
```
