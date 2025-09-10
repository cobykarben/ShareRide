# ShareRide - Product Requirements Document (PRD)

## Project Overview

ShareRide is a software service that connects drivers and riders for event-specific transportation. Unlike traditional rideshare apps like Uber, ShareRide focuses on event-based rides where drivers are already traveling to specific events and have extra capacity in their vehicles.

### Core Concept
- **Drivers**: Post rides to events they're already attending, specify available seats, set cost-sharing preferences
- **Riders**: Search for rides to specific events, view seating layouts, apply for rides, and make payments
- **Events**: Standardized event listings with location and time for ride coordination
- **Interactive Seating**: Airline-style cabin view showing available seats based on vehicle type

### Key Differentiators
- Event-centric rather than on-demand transportation
- Pre-planned rides with advance booking
- Interactive seating selection with vehicle-specific layouts
- Cost-sharing flexibility (driver can choose to participate in cost splitting)
- Social features including user profiles and friend connections

---

## Stage 1: Core Data Objects and Backend Foundation

### 1.1 User Management Objects

#### Driver Object
**Purpose**: Represents users who can create ride listings and transport riders

**Core Attributes**:
- `driver_id`: Unique identifier
- `username`: Display name
- `email`: Contact information
- `phone`: Contact number
- `profile_picture`: Image URL
- `driver_rating`: Average rating from riders
- `verification_status`: Account verification level
- `payment_methods`: Linked payment options
- `created_at`: Account creation timestamp
- `last_active`: Last login timestamp

**Driver Capabilities**:
- Create and manage ride listings
- Accept or reject rider applications
- Set cost-sharing preferences for rides
- Receive payments from approved riders
- View rider profiles and friend connections
- Rate riders after completed rides

#### Rider Object
**Purpose**: Represents users who search for and join ride listings

**Core Attributes**:
- `rider_id`: Unique identifier
- `username`: Display name
- `email`: Contact information
- `phone`: Contact number
- `profile_picture`: Image URL
- `rider_rating`: Average rating from drivers
- `verification_status`: Account verification level
- `payment_methods`: Linked payment options
- `created_at`: Account creation timestamp
- `last_active`: Last login timestamp

**Rider Capabilities**:
- Search for rides by event
- Apply to join ride listings
- Select specific seats via cabin view
- Make payments to drivers
- Rate drivers after completed rides
- Send and receive friend requests

### 1.2 Event Management Object

#### Event Object
**Purpose**: Standardized event listings that serve as ride destinations

**Core Attributes**:
- `event_id`: Unique identifier
- `event_name`: Human-readable event title
- `event_type`: Category (sports, wedding, concert, etc.)
- `location`: Physical address or venue
- `coordinates`: GPS coordinates (lat, lng)
- `event_date`: Date and time of event
- `description`: Optional event details
- `created_by`: User ID of event creator
- `created_at`: Event creation timestamp
- `status`: Active, completed, or cancelled

**Event Management Logic**:
- **Duplicate Prevention**: System checks for existing events at same location within 2-hour window
- **Event Consolidation**: Users must select existing event if similar event exists
- **Event Creation**: Only drivers can create new events when no suitable match exists
- **Event Validation**: Location and time validation to prevent duplicates

### 1.3 Vehicle Management Object

#### Car Object
**Purpose**: Represents vehicles used for rides with standardized categorization

**Core Attributes**:
- `car_id`: Unique identifier
- `driver_id`: Owner of the vehicle
- `make`: Vehicle manufacturer
- `model`: Vehicle model
- `year`: Manufacturing year
- `vehicle_type`: Standardized category (sedan, SUV, minivan, pickup, van_16_seater, etc.)
- `color`: Vehicle color
- `license_plate`: Registration number
- `seating_capacity`: Total available seats
- `amenities`: Available features (AC, WiFi, etc.)
- `created_at`: Vehicle registration timestamp

**Vehicle Type Categories**:
- **Sedan**: 4-5 seats, standard layout
- **SUV**: 5-7 seats, elevated seating
- **Minivan**: 7-8 seats, sliding doors
- **Pickup Truck**: 2-5 seats, open bed
- **Van (16-seater)**: 16 seats, commercial layout
- **Convertible**: 2-4 seats, open top
- **Hatchback**: 4-5 seats, rear access

### 1.4 Ride Listing Object

#### Ride Object
**Purpose**: Individual ride listings created by drivers

**Core Attributes**:
- `ride_id`: Unique identifier
- `driver_id`: Driver creating the listing
- `car_id`: Vehicle being used
- `event_id`: Destination event
- `departure_location`: Pickup point
- `departure_time`: Scheduled departure
- `arrival_time`: Estimated arrival at event
- `available_seats`: Number of open seats
- `seat_map`: Visual representation of occupied/available seats
- `cost_per_person`: Base cost per rider
- `toll_costs`: Estimated toll expenses
- `gas_costs`: Estimated fuel expenses
- `driver_pays_share`: Boolean for driver cost participation
- `max_riders`: Maximum number of riders allowed
- `status`: Active, full, completed, cancelled
- `created_at`: Listing creation timestamp

**Seat Management**:
- Pre-occupied seats marked by driver during listing creation
- Real-time seat availability updates
- Seat selection by riders through cabin view interface

---

## Stage 2: Backend Logic and API Requirements

### 2.1 Authentication and User Management

#### User Registration and Login
- **Registration Endpoint**: `POST /api/auth/register`
  - Validate email format and uniqueness
  - Hash passwords using secure algorithms
  - Send verification email
  - Create user profile with default settings

- **Login Endpoint**: `POST /api/auth/login`
  - Authenticate credentials
  - Generate JWT tokens for session management
  - Return user profile and preferences

- **Profile Management**: `GET/PUT /api/users/profile`
  - Retrieve and update user information
  - Handle profile picture uploads
  - Manage payment method integration

#### Friend System
- **Friend Requests**: `POST /api/friends/request`
  - Send friend requests between users
  - Notification system for pending requests
  - Mutual friend suggestions based on ride history

- **Friend Management**: `GET/PUT/DELETE /api/friends`
  - List friends and pending requests
  - Accept or decline friend requests
  - Remove friends from network

### 2.2 Event Management System

#### Event Creation and Discovery
- **Event Search**: `GET /api/events/search`
  - Search by location, date range, event type
  - Fuzzy matching for event names
  - Location-based radius search

- **Event Creation**: `POST /api/events`
  - Validate location and time uniqueness
  - Check for existing similar events
  - Auto-suggest event consolidation
  - Geocoding for address validation

- **Event Details**: `GET /api/events/{event_id}`
  - Full event information
  - Associated ride listings
  - User participation status

### 2.3 Vehicle and Ride Management

#### Vehicle Registration
- **Vehicle Creation**: `POST /api/vehicles`
  - Validate vehicle information
  - Categorize vehicle type automatically
  - Generate seat map templates based on type

- **Vehicle Management**: `GET/PUT/DELETE /api/vehicles/{vehicle_id}`
  - Update vehicle information
  - Manage vehicle availability
  - Handle vehicle deletion with ride impact

#### Ride Listing System
- **Ride Creation**: `POST /api/rides`
  - Validate driver and vehicle availability
  - Calculate estimated costs
  - Generate initial seat map
  - Set cost-sharing preferences

- **Ride Search**: `GET /api/rides/search`
  - Filter by event, location, time
  - Sort by departure time, cost, rating
  - Real-time availability updates

- **Ride Details**: `GET /api/rides/{ride_id}`
  - Complete ride information
  - Current seat availability
  - Driver and vehicle details
  - Cost breakdown

### 2.4 Seat Management and Booking

#### Interactive Seat Selection
- **Seat Map Generation**: `GET /api/rides/{ride_id}/seats`
  - Generate vehicle-specific seat layout
  - Show occupied and available seats
  - Include seat proximity information

- **Seat Reservation**: `POST /api/rides/{ride_id}/reserve`
  - Validate seat availability
  - Create temporary reservation
  - Handle concurrent booking attempts

#### Ride Application System
- **Application Submission**: `POST /api/rides/{ride_id}/apply`
  - Submit ride application with seat preference
  - Include rider profile and friend status
  - Send notification to driver

- **Application Management**: `GET/PUT /api/rides/{ride_id}/applications`
  - Driver views all applications
  - Accept or reject applications
  - Notify riders of decisions

### 2.5 Payment and Cost Management

#### Cost Calculation System
- **Cost Estimation**: `POST /api/rides/{ride_id}/calculate-cost`
  - Calculate per-person costs including tolls and gas
  - Apply driver cost-sharing preferences
  - Handle dynamic cost adjustments

- **Payment Processing**: `POST /api/payments/process`
  - Integrate with payment providers
  - Handle split payments among riders
  - Process driver payments
  - Manage refunds and adjustments

#### Post-Ride Cost Management
- **Cost Adjustment**: `PUT /api/rides/{ride_id}/adjust-costs`
  - Allow drivers to modify final costs
  - Require rider approval for increases
  - Process additional payments

### 2.6 Rating and Review System

#### User Rating System
- **Rating Submission**: `POST /api/ratings`
  - Rate drivers and riders after completed rides
  - Include optional written reviews
  - Validate ride completion before rating

- **Rating Retrieval**: `GET /api/users/{user_id}/ratings`
  - Display user rating history
  - Calculate average ratings
  - Show recent reviews

### 2.7 Notification System

#### Real-time Notifications
- **WebSocket Integration**: Real-time updates for:
  - New ride applications
  - Application status changes
  - Seat availability updates
  - Payment confirmations
  - Friend requests

- **Email Notifications**: Automated emails for:
  - Ride confirmations
  - Payment receipts
  - Event reminders
  - Account verification

### 2.8 Data Validation and Security

#### Input Validation
- **Location Validation**: Verify address accuracy and geocoding
- **Time Validation**: Ensure logical departure and arrival times
- **Capacity Validation**: Verify seat availability and vehicle capacity
- **Cost Validation**: Validate cost calculations and payment amounts

#### Security Measures
- **Authentication**: JWT-based session management
- **Authorization**: Role-based access control
- **Data Encryption**: Sensitive data encryption at rest and in transit
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Sanitization**: Prevent SQL injection and XSS attacks

---

## Stage 3: Frontend Requirements and User Experience

### 3.1 User Interface Design Principles

#### Design Philosophy
- **Clean and Intuitive**: Minimalist design with clear navigation
- **Mobile-First**: Responsive design optimized for mobile devices
- **Accessibility**: WCAG 2.1 AA compliance for inclusive design
- **Consistent Branding**: Cohesive visual identity throughout the platform

#### Visual Design Guidelines
- **Color Scheme**: Professional, trustworthy palette with accent colors for actions
- **Typography**: Clear, readable fonts with proper hierarchy
- **Spacing**: Generous white space for improved readability
- **Icons**: Consistent iconography for universal understanding
- **Loading States**: Smooth transitions and loading indicators

### 3.2 Core User Flows

#### Driver Onboarding Flow
1. **Registration**: Simple signup form with email verification
2. **Profile Setup**: Upload photo, add contact information
3. **Vehicle Registration**: Add vehicle details with photo upload
4. **Verification**: Identity verification process
5. **First Ride**: Guided tour for creating first ride listing

#### Rider Discovery Flow
1. **Event Search**: Search bar with location and date filters
2. **Event Selection**: Browse events with map integration
3. **Ride Browsing**: View available rides with key details
4. **Seat Selection**: Interactive cabin view for seat choice
5. **Application**: Submit application with payment method

#### Ride Management Flow (Driver)
1. **Ride Creation**: Step-by-step listing creation wizard
2. **Application Review**: Dashboard showing pending applications
3. **Rider Approval**: Review profiles and approve/reject riders
4. **Ride Coordination**: Communication tools for ride details
5. **Post-Ride**: Cost adjustment and rating submission

### 3.3 Key User Interface Components

#### Navigation and Layout
- **Header Navigation**: Logo, main menu, user profile, notifications
- **Sidebar Navigation**: Quick access to key features
- **Breadcrumb Navigation**: Clear page hierarchy indication
- **Footer**: Links, legal information, social media

#### Search and Filtering Interface
- **Event Search Bar**: Prominent search with autocomplete
- **Filter Sidebar**: Location, date, vehicle type, cost range filters
- **Map Integration**: Interactive map showing events and rides
- **Sort Options**: Sort by time, cost, rating, distance

#### Interactive Seat Selection
- **Cabin View Component**: 3D-style vehicle interior visualization
- **Seat Map**: Clickable seats with availability status
- **Seat Information**: Details about seat location and neighbors
- **Selection Confirmation**: Clear indication of selected seats

#### User Profile Interface
- **Profile Cards**: Clean display of user information and ratings
- **Photo Gallery**: Vehicle and profile photo management
- **Settings Panel**: Account preferences and privacy settings
- **Activity History**: Past rides and upcoming bookings

### 3.4 Responsive Design Requirements

#### Mobile Optimization
- **Touch-Friendly**: Large buttons and touch targets (44px minimum)
- **Swipe Gestures**: Intuitive swipe navigation for lists
- **Thumb Navigation**: Easy one-handed operation
- **Offline Capability**: Basic functionality without internet connection

#### Tablet and Desktop
- **Multi-Column Layout**: Efficient use of larger screens
- **Hover States**: Interactive elements with hover feedback
- **Keyboard Navigation**: Full keyboard accessibility
- **Drag and Drop**: Intuitive file uploads and seat selection

### 3.5 User Experience Enhancements

#### Onboarding and Guidance
- **Welcome Tour**: Interactive introduction to platform features
- **Tooltips**: Contextual help throughout the interface
- **Progress Indicators**: Clear indication of multi-step processes
- **Success Messages**: Confirmation of completed actions

#### Real-time Updates
- **Live Notifications**: Toast notifications for important updates
- **Real-time Availability**: Instant updates for seat availability
- **Status Indicators**: Clear visual status for applications and rides
- **Auto-refresh**: Automatic updates without page reload

#### Error Handling and Feedback
- **Form Validation**: Real-time validation with helpful error messages
- **Loading States**: Clear indication of processing actions
- **Error Recovery**: Easy ways to retry failed actions
- **Help System**: Contextual help and FAQ integration

### 3.6 Accessibility Requirements

#### Visual Accessibility
- **High Contrast**: Sufficient color contrast ratios
- **Text Scaling**: Support for text size adjustments
- **Screen Reader**: Full compatibility with assistive technologies
- **Focus Indicators**: Clear focus states for keyboard navigation

#### Motor Accessibility
- **Keyboard Navigation**: Complete functionality via keyboard
- **Voice Control**: Support for voice commands where appropriate
- **Alternative Input**: Support for alternative input methods

#### Cognitive Accessibility
- **Clear Language**: Simple, jargon-free communication
- **Consistent Navigation**: Predictable interface patterns
- **Error Prevention**: Clear warnings and confirmations
- **Help Integration**: Easy access to help and support

### 3.7 Performance Requirements

#### Loading Performance
- **Initial Load**: Page load time under 3 seconds
- **Image Optimization**: Compressed images with lazy loading
- **Code Splitting**: Efficient JavaScript loading
- **Caching Strategy**: Effective browser and CDN caching

#### Interaction Performance
- **Smooth Animations**: 60fps animations and transitions
- **Quick Response**: Interface response under 100ms
- **Efficient Updates**: Minimal re-rendering for real-time features
- **Background Processing**: Non-blocking operations

---

## Development Phases Summary

### Phase 1: Foundation (Months 1-3)
- Core data objects and database schema
- Basic authentication and user management
- Event creation and management system
- Vehicle registration and categorization

### Phase 2: Core Functionality (Months 4-6)
- Ride listing and search functionality
- Interactive seat selection system
- Application and approval workflow
- Basic payment processing

### Phase 3: Enhanced Features (Months 7-9)
- Advanced search and filtering
- Real-time notifications and updates
- Rating and review system
- Social features and friend system

### Phase 4: Polish and Optimization (Months 10-12)
- Mobile app development
- Performance optimization
- Advanced UI/UX enhancements
- Comprehensive testing and bug fixes

---

*This PRD will be updated as the project progresses and requirements evolve.*
