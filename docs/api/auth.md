# Authentication API Documentation

## Sign Up
`POST /api/auth/signup`

Create a new user account with email verification.

### Request Body
```json
{
  "email": "string",
  "password": "string",
  "full_name": "string",
  "phone": "string"
}
```

### Response
```json
{
  "message": "Registration successful. Please check your email for verification."
}
```

## Sign In
`POST /api/auth/signin`

Authenticate a user and get their profile.

### Request Body
```json
{
  "email": "string",
  "password": "string"
}
```

### Response
```json
{
  "user": {
    "id": "string",
    "email": "string",
    // other user fields
  },
  "profile": {
    "id": "string",
    "full_name": "string",
    "role": "string",
    // other profile fields
  }
}
```

## Reset Password
`POST /api/auth/reset-password`

Request a password reset email.

### Request Body
```json
{
  "email": "string"
}
```

### Response
```json
{
  "message": "Password reset instructions sent to your email"
}
```

## Update Password
`PUT /api/auth/reset-password`

Update password using reset token.

### Request Body
```json
{
  "password": "string"
}
```

### Response
```json
{
  "message": "Password updated successfully"
}
```

## Verify Email
`GET /api/auth/verify-email?token={token}&type=email_verification`

Verify user's email address.

### Query Parameters
- `token`: Verification token
- `type`: Must be "email_verification"

### Response
```json
{
  "message": "Email verified successfully"
}
```
