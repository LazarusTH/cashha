# Cashora

Cashora is a comprehensive system for managing user accounts and transactions.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)
- Redis (for rate limiting)
- Supabase account (for database and authentication)

### Environment Setup

1. Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

2. Fill in the environment variables in `.env`:
- Supabase configuration (get from your Supabase project settings)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Redis configuration (get from Upstash dashboard)
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- Email service configuration
  - Configure your SMTP settings for email notifications
- Security keys
  - Generate strong random strings for `JWT_SECRET` and `ENCRYPTION_KEY`

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cashora.git
cd cashora
```

2. Install dependencies:
```bash
npm install
```

3. Run database migrations:
```bash
npm run migrate
```

4. Start the development server:
```bash
npm run dev
```

The application should now be running at `http://localhost:3000`.

### Building for Production

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Features

- User authentication and authorization
- Transaction management
- Admin dashboard
- Rate limiting
- Email notifications
- Error tracking and monitoring
- Responsive UI

## Common Issues and Solutions

### Rate Limiting Issues
- Ensure Redis is properly configured
- Check the Redis connection in the logs
- Verify the rate limit settings in `middleware.ts`

### Authentication Issues
- Verify Supabase credentials are correct
- Check if the user session is properly maintained
- Ensure all required environment variables are set

### Database Issues
- Run migrations to ensure schema is up to date
- Check Supabase connection in the logs
- Verify database permissions

### Email Notification Issues
- Verify SMTP settings
- Check email service logs
- Ensure email templates are properly configured

## Security Considerations

- All API routes are protected with proper authentication
- Rate limiting is implemented to prevent abuse
- Input validation is enforced using Zod schemas
- Error messages are sanitized in production
- Session management is handled securely
- Admin routes have additional authorization checks

## Development Guidelines

1. Error Handling
   - Use the `ErrorBoundary` component for React components
   - Use the `AppError` class for backend errors
   - Always validate input using Zod schemas

2. API Routes
   - Use the `withValidation` middleware for input validation
   - Implement proper error handling
   - Follow the rate limiting guidelines

3. Database
   - Use typed queries with Supabase
   - Implement proper error handling for database operations
   - Follow the migration guidelines

## Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Deployment

1. Set up environment variables in your deployment platform
2. Build the application
3. Run database migrations
4. Start the application

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

