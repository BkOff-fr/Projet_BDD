# StayScape - Accommodation Rental Platform

A modern, full-featured accommodation rental platform built with React, TypeScript, and Tailwind CSS. Inspired by Airbnb, this application provides a complete solution for hosts to list properties and guests to find their perfect stay.

![StayScape](https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=600&fit=crop)

## Features

### For Guests
- **Browse Listings**: Explore properties with beautiful image galleries and detailed information
- **Advanced Search**: Filter by location, dates, price range, amenities, and more
- **Property Details**: View comprehensive information including amenities, reviews, and host details
- **Booking System**: Easy-to-use booking form with real-time price calculation
- **User Profiles**: Manage personal information, view booking history, and track trips
- **Messaging**: Communicate directly with hosts through the built-in chat system

### For Hosts
- **Host Dashboard**: Comprehensive dashboard with earnings, bookings, and property management
- **Property Management**: Create, edit, and manage property listings
- **Booking Management**: View and manage all bookings for your properties
- **Earnings Tracking**: Track your income with detailed analytics
- **Guest Communication**: Respond to guest inquiries and messages

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Build Tool**: Vite

## Project Structure

```
airbnb-platform/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Header.tsx
│   │   ├── SearchBar.tsx
│   │   ├── AccommodationCard.tsx
│   │   ├── FilterSidebar.tsx
│   │   ├── ReviewCard.tsx
│   │   ├── BookingForm.tsx
│   │   ├── MessageThread.tsx
│   │   ├── HostPropertyForm.tsx
│   │   └── Footer.tsx
│   ├── pages/           # Page components
│   │   ├── Home.tsx
│   │   ├── AccommodationList.tsx
│   │   ├── AccommodationDetail.tsx
│   │   ├── UserProfile.tsx
│   │   ├── HostDashboard.tsx
│   │   ├── BookingConfirmation.tsx
│   │   └── Messages.tsx
│   ├── data/            # Mock data
│   │   └── mockData.ts
│   ├── types/           # TypeScript interfaces
│   │   └── index.ts
│   ├── hooks/           # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useSearch.ts
│   │   ├── useBooking.ts
│   │   └── useClickOutside.ts
│   ├── utils/           # Utility functions
│   │   ├── helpers.ts
│   │   └── cn.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── index.html
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd airbnb-platform
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Features Overview

### Home Page
- Hero section with search functionality
- Category filters for browsing
- Featured and top-rated stays
- Why choose us section
- Become a host CTA

### Accommodation List
- Grid view of all properties
- Advanced filtering sidebar
- Sort options
- Price range filter
- Property type and amenity filters

### Accommodation Detail
- Full-screen photo gallery
- Property information and amenities
- Host details
- Reviews and ratings
- Interactive booking form
- Location map

### User Profile
- Personal information
- Booking history
- Reviews
- Property listings (for hosts)

### Host Dashboard
- Overview with key metrics
- Property management
- Booking management
- Earnings tracking
- Quick actions

### Booking Confirmation
- Step-by-step booking flow
- Payment method selection
- Price breakdown
- Cancellation policy
- Ground rules

### Messages
- Conversation list
- Real-time messaging interface
- Property context in conversations

## Mock Data

The application comes with comprehensive mock data including:
- 12+ accommodations (various types)
- 5+ users (mix of hosts and guests)
- Reviews with ratings
- Bookings
- Messages and conversations

## Customization

### Colors
The primary brand color can be customized in `tailwind.config.js`:
```javascript
colors: {
  primary: {
    DEFAULT: '#FF5A5F',  // Airbnb red
    dark: '#E0484D',
    light: '#FF7A7E',
  },
  // ...
}
```

### Adding New Accommodations
Edit `src/data/mockData.ts` to add new properties following the `Accommodation` interface.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Design inspired by Airbnb
- Icons by Lucide
- Images from Unsplash
