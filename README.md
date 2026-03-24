# EC08-BDD Project - Accommodation Rental Platform

## 📋 Project Overview

This project implements a complete **Accommodation Rental Platform** (similar to Airbnb) with:
- **Database Design**: Conceptual and relational models (MCD/MLD)
- **SQL Implementation**: Complete MySQL database with constraints, triggers, views, and test data
- **Web Interface**: Modern React application with full functionality

---

## 📁 Project Structure

```
/mnt/okcomputer/output/
├── README.md                          # This file
├── database_design.md                 # Complete database design documentation
├── diagrams_mermaid.md                # All Mermaid diagrams (MCD, MLD, Use Cases)
├── 01_schema.sql                      # Database schema (CREATE TABLE)
├── 02_constraints_triggers.sql        # Constraints and triggers
├── 03_views.sql                       # SQL views
├── 04_queries.sql                     # Complex queries
├── 05_data.sql                        # Test dataset
└── airbnb-platform/                   # React web application
    ├── package.json
    ├── src/
    │   ├── components/               # Reusable UI components
    │   ├── pages/                    # Page components
    │   ├── data/                     # Mock data
    │   ├── types/                    # TypeScript interfaces
    │   └── hooks/                    # Custom React hooks
    └── ...
```

---

## 🗄️ Database Design

### Entities

| Entity | Description |
|--------|-------------|
| **users** | Platform users (can be both guests and hosts) |
| **accommodations** | Rental properties with details and compliance status |
| **amenities** | Property features (WiFi, pool, etc.) |
| **accommodation_amenities** | Junction table (M:N relationship) |
| **availability** | Calendar periods (available/unavailable) |
| **pricing_rules** | Seasonal/event price adjustments |
| **additional_fees** | Extra fees (cleaning, service, tax) |
| **cancellation_policies** | Property-specific refund rules |
| **bookings** | Reservation records with lifecycle status |
| **payments** | Multi-stage payment transactions |
| **reviews** | Guest ratings and comments |
| **messages** | User communications |

### Business Constraints Implemented

| Constraint | Implementation |
|------------|----------------|
| Host → Multiple Accommodations | 1:N relationship via FK |
| No booking during unavailable periods | Trigger `trg_check_availability_before_insert` |
| Security compliance required | CHECK constraint + trigger |
| Booking history preserved | Soft-delete protection |
| Cancellation policies per accommodation | FK to policy table |
| One review per booking | UNIQUE constraint |

---

## 🚀 Quick Start

### 1. Database Setup (MySQL)

```bash
# Connect to MySQL
mysql -u root -p

# Execute SQL files in order
source /mnt/okcomputer/output/01_schema.sql
source /mnt/okcomputer/output/02_constraints_triggers.sql
source /mnt/okcomputer/output/03_views.sql
source /mnt/okcomputer/output/05_data.sql
```

### 2. Web Application

```bash
cd /mnt/okcomputer/output/airbnb-platform
npm install
npm run dev
```

The application will be available at `http://localhost:5173`

---

## 📊 Key Features

### Database Features
- ✅ **14 tables** with proper normalization (3NF)
- ✅ **6 triggers** for business rule enforcement
- ✅ **10 views** including dashboard and analytics
- ✅ **10 complex queries** for various use cases
- ✅ **Comprehensive test data** with varied scenarios

### Web Application Features
- ✅ **7 pages**: Home, Listings, Detail, Profile, Dashboard, Booking, Messages
- ✅ **Advanced search** with filters (type, price, dates, amenities)
- ✅ **Booking flow** with date picker and pricing calculation
- ✅ **Host dashboard** with property management
- ✅ **Messaging system** between users
- ✅ **Responsive design** (mobile-first)

---

## 📈 Operating Requirements (Section 4)

### 4a. Business Constraints
All constraints identified and implemented via:
- Primary/Foreign keys
- CHECK constraints
- Triggers
- UNIQUE constraints

### 4b. Dashboard View
```sql
-- View: dashboard_lowest_ratings
-- Shows: lowest rating per accommodation + comment + reviewer info + user's total bookings
```
Implemented in `03_views.sql`

### 4c. Search Performance
```sql
-- Index on accommodations.type for fast filtering
CREATE INDEX idx_accommodation_type ON accommodations(type);
```

### 4d. Security Compliance
```sql
-- Trigger prevents booking non-compliant properties
CREATE TRIGGER trg_check_compliance_before_insert
```

### 4e. Test Dataset
Comprehensive dataset includes:
- Validated/non-validated accommodations
- Compliant/non-compliant properties
- Confirmed/canceled/completed bookings
- Invalid booking attempts (commented)
- Positive/negative reviews
- Users with varying booking volumes
- Never-booked accommodations

### 4f. Average Rating Query
```sql
-- View: accommodations_with_avg_rating
-- Includes all properties, NULL for never-reviewed
```

---

## 🎨 Technologies Used

### Database
- **MySQL 8.0** - RDBMS
- **InnoDB** - Storage engine
- **UTF8MB4** - Character set

### Web Application
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Lucide React** - Icons
- **date-fns** - Date handling

---

## 📚 Documentation

| File | Description |
|------|-------------|
| `database_design.md` | Complete design with MCD, MLD, explanations |
| `diagrams_mermaid.md` | All Mermaid diagram source code |
| `01_schema.sql` | Table definitions |
| `02_constraints_triggers.sql` | Business rules implementation |
| `03_views.sql` | Database views |
| `04_queries.sql` | Example queries |
| `05_data.sql` | Test data |

---

## 🔍 Sample Queries

### Search Accommodations by Type
```sql
SELECT * FROM accommodations 
WHERE type = 'apartment' 
AND is_validated = TRUE 
AND has_alarm_system = TRUE;
```

### Get Accommodation with Average Rating
```sql
SELECT * FROM accommodations_with_avg_rating 
WHERE accommodation_id = 1;
```

### Dashboard: Lowest Ratings
```sql
SELECT * FROM dashboard_lowest_ratings;
```

---

## ✨ Authors

This project was developed as part of the EC08-BDD coursework.

---

## 📄 License

Academic project - For educational purposes only.
