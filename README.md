# Parv Finance Backend

Node.js backend application with MongoDB for Parv Finance.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB installed and running on localhost (default port 27017)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/parv-finance

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE=15m
REFRESH_TOKEN_EXPIRE=30d

# CORS Configuration
CLIENT_URL=http://localhost:3000
```

## Running the Application

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000` (or the PORT specified in .env)

## Project Structure

```
parv-backend/
├── config/
│   └── database.js          # MongoDB connection configuration
├── controllers/             # Route controllers
│   ├── authController.js   # Authentication controllers
│   └── userController.js    # User/DSA controllers
├── middleware/              # Custom middleware
│   ├── auth.js             # Authentication middleware
│   └── errorHandler.js     # Error handling middleware
├── models/                  # Mongoose models
│   ├── User.js             # User/DSA model
│   ├── Loan.js             # Loan model
│   └── DSAIncome.js        # DSA Income model
├── routes/                  # API routes
│   ├── authRoutes.js       # Authentication routes
│   └── userRoutes.js       # User routes
├── utils/                   # Utility functions
│   └── mail.js             # Email utility
├── server.js                # Main application entry point
├── .env                     # Environment variables (not in git)
├── .gitignore              # Git ignore file
└── package.json            # Project dependencies and scripts
```

## MongoDB Setup

Make sure MongoDB is running on your local machine:

1. **Windows**: Start MongoDB service or run `mongod` in a terminal
2. **Mac/Linux**: Run `mongod` or `sudo systemctl start mongod`

The application will connect to `mongodb://localhost:27017/parv-finance` by default.

## API Endpoints

### Authentication Routes (`/api/auth`)

- `POST /api/auth/login` - Login user
  - Body: `{ "username": "string", "password": "string" }`
  - Returns: User data
  - Sets cookies: `accessToken` (15 min) and `refreshToken` (30 days)

- `POST /api/auth/refresh` - Refresh access token
  - Uses refresh token from cookie to generate new access token
  - Automatically called by middleware if access token expires

- `POST /api/auth/logout` - Logout user
  - Clears both access and refresh token cookies
  - Removes refresh token from database

- `GET /api/auth/me` - Get current authenticated user
  - Requires: Valid access token or refresh token in cookies
  - Auto-refreshes access token if expired but refresh token is valid

### User Routes (`/api/users`)

- `POST /api/users/dsa/register` - Create DSA account (Public)
  - Body: DSA registration data (full_name, email, phone_no, etc.)
  - Returns: Generated username and temporary password

- `GET /api/users/dsa` - Get all DSA data with pagination (Admin only)
  - Query params: `pageSize`, `pageNumber`, `startAfterDocId`
  - Requires: Admin authentication

- `GET /api/users/dsa/:username` - Get DSA data by username
  - Requires: Authentication

- `PUT /api/users/dsa/:formId/approve` - Approve/reject DSA form (Admin only)
  - Body: `{ "status": "approved" | "rejected" }`
  - Requires: Admin authentication

- `GET /api/users/loans` - Get loan data by connector
  - Query params: `username`, `pageSize`, `currentPage`, `startAfterDocId`
  - Requires: Authentication

- `GET /api/users/dashboard/:connectorId` - Get DSA dashboard data
  - Requires: Authentication
  - Returns: Total loans, income, applications, chart data

## Development

- The server uses `nodemon` for auto-reloading during development
- All routes should be added in the `routes/` directory
- Controllers should be placed in the `controllers/` directory
- Models should be defined in the `models/` directory using Mongoose

