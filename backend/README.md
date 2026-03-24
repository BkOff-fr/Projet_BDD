# Airbnb Backend API

Node.js/Express backend for the Accommodation Rental Platform.

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and update with your settings:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=airbnb_db
DB_USER=root
DB_PASSWORD=your_mysql_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration (frontend URL)
CORS_ORIGIN=http://localhost:5173
```

### 3. Database Setup

Make sure your MySQL database is set up with the schema from the project root:

```bash
# From project root
mysql -u root -p
source 01_schema.sql
source 02_constraints_triggers.sql
source 03_views.sql
source 05_data.sql
```

### 4. Run Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Accommodations
- `GET /api/accommodations` - List all accommodations (with filters)
- `GET /api/accommodations/amenities` - Get all amenities
- `GET /api/accommodations/:id` - Get accommodation details
- `POST /api/accommodations` - Create new accommodation (host only)

### Bookings
- `GET /api/bookings` - Get user's bookings (protected)
- `POST /api/bookings` - Create new booking (protected)
- `PATCH /api/bookings/:id/cancel` - Cancel booking (protected)
- `POST /api/bookings/review` - Create review (protected)

### Messages
- `GET /api/messages` - Get conversations (protected)
- `GET /api/messages/unread` - Get unread count (protected)
- `GET /api/messages/:userId` - Get conversation with user (protected)
- `POST /api/messages` - Send message (protected)

## Production Build

```bash
npm run build
npm start
```
