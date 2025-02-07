# Admin Bulk Sending API Documentation

## Send Bulk Transfer
`POST /api/admin/sending/bulk`

Send money to multiple users at once.

### Request Body
```json
{
  "recipients": [
    {
      "email": "string",
      "amount": "number"
    }
  ],
  "amount": "number",
  "description": "string"
}
```

### Response
```json
{
  "message": "Bulk transfer completed successfully",
  "count": "number"
}
```

## Validate Recipients
`POST /api/admin/sending/validate`

Validate recipient emails before sending.

### Request Body
```json
{
  "recipients": [
    {
      "email": "string"
    }
  ]
}
```

### Response
```json
{
  "valid": [
    {
      "email": "string",
      "full_name": "string"
    }
  ],
  "invalid": [
    {
      "email": "string"
    }
  ],
  "totalValid": "number",
  "totalInvalid": "number"
}
```

## Get Transfer History
`GET /api/admin/sending/history?page={page}&limit={limit}`

Get history of bulk transfers.

### Query Parameters
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

### Response
```json
{
  "transfers": [
    {
      "id": "string",
      "admin_id": "string",
      "total_amount": "number",
      "recipient_count": "number",
      "description": "string",
      "status": "string",
      "created_at": "string",
      "completed_at": "string"
    }
  ],
  "total": "number",
  "page": "number",
  "limit": "number"
}
```
