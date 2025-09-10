"""
ShareRide - Stage 1: Core Data Objects and Backend Foundation

This module contains the core data objects and classes for the ShareRide platform
as defined in the PRD Stage 1 requirements.

Objects implemented:
- Driver: Users who can create ride listings and transport riders
- Rider: Users who search for and join ride listings  
- Event: Standardized event listings that serve as ride destinations
- Car: Vehicles used for rides with standardized categorization
- Ride: Individual ride listings created by drivers
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum
import uuid


class VerificationStatus(Enum):
    """Account verification levels"""
    UNVERIFIED = "unverified"
    EMAIL_VERIFIED = "email_verified"
    PHONE_VERIFIED = "phone_verified"
    ID_VERIFIED = "id_verified"
    FULLY_VERIFIED = "fully_verified"


class VehicleType(Enum):
    """Standardized vehicle categories"""
    SEDAN = "sedan"
    SUV = "suv"
    MINIVAN = "minivan"
    PICKUP = "pickup"
    VAN_16_SEATER = "van_16_seater"
    CONVERTIBLE = "convertible"
    HATCHBACK = "hatchback"


class EventStatus(Enum):
    """Event status options"""
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class RideStatus(Enum):
    """Ride status options"""
    ACTIVE = "active"
    FULL = "full"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Driver:
    """
    Represents users who can create ride listings and transport riders.
    
    Core capabilities:
    - Create and manage ride listings
    - Accept or reject rider applications
    - Set cost-sharing preferences for rides
    - Receive payments from approved riders
    - View rider profiles and friend connections
    - Rate riders after completed rides
    """
    
    def __init__(self, username: str, email: str, phone: str):
        self.driver_id = str(uuid.uuid4())
        self.username = username
        self.email = email
        self.phone = phone
        self.profile_picture: Optional[str] = None
        self.driver_rating: float = 0.0
        self.verification_status = VerificationStatus.UNVERIFIED
        self.payment_methods: List[Dict[str, Any]] = []
        self.created_at = datetime.now()
        self.last_active = datetime.now()
        self.friends: List[str] = []  # List of user IDs who are friends
        self.vehicles: List[str] = []  # List of car IDs owned by this driver
        self.rides: List[str] = []  # List of ride IDs created by this driver
    
    def update_profile_picture(self, image_url: str) -> None:
        """Update the driver's profile picture"""
        self.profile_picture = image_url
    
    def add_payment_method(self, payment_method: Dict[str, Any]) -> None:
        """Add a new payment method"""
        self.payment_methods.append(payment_method)
    
    def update_rating(self, new_rating: float) -> None:
        """Update the driver's average rating"""
        self.driver_rating = new_rating
    
    def update_verification_status(self, status: VerificationStatus) -> None:
        """Update the driver's verification status"""
        self.verification_status = status
    
    def add_friend(self, user_id: str) -> None:
        """Add a friend to the driver's friend list"""
        if user_id not in self.friends:
            self.friends.append(user_id)
    
    def add_vehicle(self, car_id: str) -> None:
        """Add a vehicle to the driver's vehicle list"""
        if car_id not in self.vehicles:
            self.vehicles.append(car_id)
    
    def add_ride(self, ride_id: str) -> None:
        """Add a ride to the driver's ride list"""
        if ride_id not in self.rides:
            self.rides.append(ride_id)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert driver object to dictionary"""
        return {
            'driver_id': self.driver_id,
            'username': self.username,
            'email': self.email,
            'phone': self.phone,
            'profile_picture': self.profile_picture,
            'driver_rating': self.driver_rating,
            'verification_status': self.verification_status.value,
            'payment_methods': self.payment_methods,
            'created_at': self.created_at.isoformat(),
            'last_active': self.last_active.isoformat(),
            'friends': self.friends,
            'vehicles': self.vehicles,
            'rides': self.rides
        }


class Rider:
    """
    Represents users who search for and join ride listings.
    
    Core capabilities:
    - Search for rides by event
    - Apply to join ride listings
    - Select specific seats via cabin view
    - Make payments to drivers
    - Rate drivers after completed rides
    - Send and receive friend requests
    """
    
    def __init__(self, username: str, email: str, phone: str):
        self.rider_id = str(uuid.uuid4())
        self.username = username
        self.email = email
        self.phone = phone
        self.profile_picture: Optional[str] = None
        self.rider_rating: float = 0.0
        self.verification_status = VerificationStatus.UNVERIFIED
        self.payment_methods: List[Dict[str, Any]] = []
        self.created_at = datetime.now()
        self.last_active = datetime.now()
        self.friends: List[str] = []  # List of user IDs who are friends
        self.applications: List[str] = []  # List of ride application IDs
        self.booked_rides: List[str] = []  # List of ride IDs the rider is booked for
    
    def update_profile_picture(self, image_url: str) -> None:
        """Update the rider's profile picture"""
        self.profile_picture = image_url
    
    def add_payment_method(self, payment_method: Dict[str, Any]) -> None:
        """Add a new payment method"""
        self.payment_methods.append(payment_method)
    
    def update_rating(self, new_rating: float) -> None:
        """Update the rider's average rating"""
        self.rider_rating = new_rating
    
    def update_verification_status(self, status: VerificationStatus) -> None:
        """Update the rider's verification status"""
        self.verification_status = status
    
    def add_friend(self, user_id: str) -> None:
        """Add a friend to the rider's friend list"""
        if user_id not in self.friends:
            self.friends.append(user_id)
    
    def add_application(self, application_id: str) -> None:
        """Add a ride application to the rider's application list"""
        if application_id not in self.applications:
            self.applications.append(application_id)
    
    def add_booked_ride(self, ride_id: str) -> None:
        """Add a booked ride to the rider's booked rides list"""
        if ride_id not in self.booked_rides:
            self.booked_rides.append(ride_id)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert rider object to dictionary"""
        return {
            'rider_id': self.rider_id,
            'username': self.username,
            'email': self.email,
            'phone': self.phone,
            'profile_picture': self.profile_picture,
            'rider_rating': self.rider_rating,
            'verification_status': self.verification_status.value,
            'payment_methods': self.payment_methods,
            'created_at': self.created_at.isoformat(),
            'last_active': self.last_active.isoformat(),
            'friends': self.friends,
            'applications': self.applications,
            'booked_rides': self.booked_rides
        }


class Event:
    """
    Standardized event listings that serve as ride destinations.
    
    Event Management Logic:
    - Duplicate Prevention: System checks for existing events at same location within 2-hour window
    - Event Consolidation: Users must select existing event if similar event exists
    - Event Creation: Only drivers can create new events when no suitable match exists
    - Event Validation: Location and time validation to prevent duplicates
    """
    
    def __init__(self, event_name: str, event_type: str, location: str, 
                 coordinates: tuple, event_date: datetime, created_by: str, 
                 description: Optional[str] = None):
        self.event_id = str(uuid.uuid4())
        self.event_name = event_name
        self.event_type = event_type
        self.location = location
        self.coordinates = coordinates  # (latitude, longitude)
        self.event_date = event_date
        self.description = description
        self.created_by = created_by
        self.created_at = datetime.now()
        self.status = EventStatus.ACTIVE
        self.rides: List[str] = []  # List of ride IDs going to this event
    
    def add_ride(self, ride_id: str) -> None:
        """Add a ride going to this event"""
        if ride_id not in self.rides:
            self.rides.append(ride_id)
    
    def update_status(self, status: EventStatus) -> None:
        """Update the event status"""
        self.status = status
    
    def is_duplicate(self, other_event: 'Event', time_window_hours: int = 2) -> bool:
        """
        Check if this event is a duplicate of another event.
        Events are considered duplicates if they are at the same location
        and within the specified time window.
        """
        if self.location != other_event.location:
            return False
        
        time_diff = abs((self.event_date - other_event.event_date).total_seconds())
        return time_diff <= (time_window_hours * 3600)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event object to dictionary"""
        return {
            'event_id': self.event_id,
            'event_name': self.event_name,
            'event_type': self.event_type,
            'location': self.location,
            'coordinates': self.coordinates,
            'event_date': self.event_date.isoformat(),
            'description': self.description,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat(),
            'status': self.status.value,
            'rides': self.rides
        }


class Car:
    """
    Represents vehicles used for rides with standardized categorization.
    
    Vehicle Type Categories:
    - Sedan: 4-5 seats, standard layout
    - SUV: 5-7 seats, elevated seating
    - Minivan: 7-8 seats, sliding doors
    - Pickup Truck: 2-5 seats, open bed
    - Van (16-seater): 16 seats, commercial layout
    - Convertible: 2-4 seats, open top
    - Hatchback: 4-5 seats, rear access
    """
    
    def __init__(self, driver_id: str, make: str, model: str, year: int, 
                 vehicle_type: VehicleType, color: str, license_plate: str,
                 seating_capacity: int, amenities: Optional[List[str]] = None):
        self.car_id = str(uuid.uuid4())
        self.driver_id = driver_id
        self.make = make
        self.model = model
        self.year = year
        self.vehicle_type = vehicle_type
        self.color = color
        self.license_plate = license_plate
        self.seating_capacity = seating_capacity
        self.amenities = amenities or []
        self.created_at = datetime.now()
        self.rides: List[str] = []  # List of ride IDs using this car
    
    def add_ride(self, ride_id: str) -> None:
        """Add a ride using this car"""
        if ride_id not in self.rides:
            self.rides.append(ride_id)
    
    def get_seat_map_template(self) -> Dict[str, Any]:
        """
        Generate a seat map template based on vehicle type.
        This would be used to create the interactive cabin view.
        """
        seat_templates = {
            VehicleType.SEDAN: {
                'rows': 2,
                'seats_per_row': [2, 3],  # Front row: 2 seats, Back row: 3 seats
                'layout': 'standard_sedan'
            },
            VehicleType.SUV: {
                'rows': 3,
                'seats_per_row': [2, 2, 3],  # Front: 2, Middle: 2, Back: 3
                'layout': 'suv_three_row'
            },
            VehicleType.MINIVAN: {
                'rows': 3,
                'seats_per_row': [2, 3, 3],  # Front: 2, Middle: 3, Back: 3
                'layout': 'minivan_standard'
            },
            VehicleType.PICKUP: {
                'rows': 2,
                'seats_per_row': [2, 3],  # Front: 2, Back: 3
                'layout': 'pickup_standard'
            },
            VehicleType.VAN_16_SEATER: {
                'rows': 4,
                'seats_per_row': [4, 4, 4, 4],  # 4 rows of 4 seats each
                'layout': 'commercial_van'
            },
            VehicleType.CONVERTIBLE: {
                'rows': 2,
                'seats_per_row': [2, 2],  # Front: 2, Back: 2
                'layout': 'convertible_2_2'
            },
            VehicleType.HATCHBACK: {
                'rows': 2,
                'seats_per_row': [2, 3],  # Front: 2, Back: 3
                'layout': 'hatchback_standard'
            }
        }
        
        return seat_templates.get(self.vehicle_type, {
            'rows': 2,
            'seats_per_row': [2, 3],
            'layout': 'default'
        })
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert car object to dictionary"""
        return {
            'car_id': self.car_id,
            'driver_id': self.driver_id,
            'make': self.make,
            'model': self.model,
            'year': self.year,
            'vehicle_type': self.vehicle_type.value,
            'color': self.color,
            'license_plate': self.license_plate,
            'seating_capacity': self.seating_capacity,
            'amenities': self.amenities,
            'created_at': self.created_at.isoformat(),
            'rides': self.rides
        }


class Ride:
    """
    Individual ride listings created by drivers.
    
    Seat Management:
    - Pre-occupied seats marked by driver during listing creation
    - Real-time seat availability updates
    - Seat selection by riders through cabin view interface
    """
    
    def __init__(self, driver_id: str, car_id: str, event_id: str, 
                 departure_location: str, departure_time: datetime,
                 arrival_time: datetime, cost_per_person: float,
                 toll_costs: float, gas_costs: float, 
                 driver_pays_share: bool, max_riders: int):
        self.ride_id = str(uuid.uuid4())
        self.driver_id = driver_id
        self.car_id = car_id
        self.event_id = event_id
        self.departure_location = departure_location
        self.departure_time = departure_time
        self.arrival_time = arrival_time
        self.available_seats = max_riders
        self.seat_map: Dict[str, Any] = {}  # Visual representation of occupied/available seats
        self.cost_per_person = cost_per_person
        self.toll_costs = toll_costs
        self.gas_costs = gas_costs
        self.driver_pays_share = driver_pays_share
        self.max_riders = max_riders
        self.status = RideStatus.ACTIVE
        self.created_at = datetime.now()
        self.riders: List[str] = []  # List of rider IDs booked for this ride
        self.applications: List[str] = []  # List of application IDs for this ride
    
    def initialize_seat_map(self, car: Car) -> None:
        """Initialize the seat map based on the car's seat template"""
        seat_template = car.get_seat_map_template()
        self.seat_map = {
            'template': seat_template,
            'seats': {},
            'available_count': self.max_riders
        }
        
        # Initialize all seats as available
        seat_id = 1
        for row_idx, seats_in_row in enumerate(seat_template['seats_per_row']):
            for seat_in_row in range(seats_in_row):
                self.seat_map['seats'][f'seat_{seat_id}'] = {
                    'row': row_idx + 1,
                    'position': seat_in_row + 1,
                    'available': True,
                    'rider_id': None
                }
                seat_id += 1
    
    def book_seat(self, rider_id: str, seat_id: str) -> bool:
        """
        Book a specific seat for a rider.
        Returns True if successful, False if seat is not available.
        """
        if seat_id not in self.seat_map['seats']:
            return False
        
        seat = self.seat_map['seats'][seat_id]
        if not seat['available']:
            return False
        
        seat['available'] = False
        seat['rider_id'] = rider_id
        self.seat_map['available_count'] -= 1
        self.available_seats -= 1
        
        if rider_id not in self.riders:
            self.riders.append(rider_id)
        
        # Update ride status if full
        if self.available_seats == 0:
            self.status = RideStatus.FULL
        
        return True
    
    def release_seat(self, rider_id: str, seat_id: str) -> bool:
        """
        Release a seat that was booked by a rider.
        Returns True if successful, False if seat was not booked by this rider.
        """
        if seat_id not in self.seat_map['seats']:
            return False
        
        seat = self.seat_map['seats'][seat_id]
        if seat['rider_id'] != rider_id:
            return False
        
        seat['available'] = True
        seat['rider_id'] = None
        self.seat_map['available_count'] += 1
        self.available_seats += 1
        
        if rider_id in self.riders:
            self.riders.remove(rider_id)
        
        # Update ride status if no longer full
        if self.status == RideStatus.FULL and self.available_seats > 0:
            self.status = RideStatus.ACTIVE
        
        return True
    
    def calculate_total_cost(self) -> float:
        """Calculate the total cost for this ride"""
        total_cost = (self.cost_per_person * len(self.riders)) + self.toll_costs + self.gas_costs
        
        if self.driver_pays_share:
            # Driver pays their share of tolls and gas
            driver_share = (self.toll_costs + self.gas_costs) / (len(self.riders) + 1)
            total_cost -= driver_share
        
        return total_cost
    
    def calculate_cost_per_rider(self) -> float:
        """Calculate the cost per rider including tolls and gas"""
        base_cost = self.cost_per_person
        
        if self.driver_pays_share:
            # Split tolls and gas among all participants (including driver)
            additional_cost = (self.toll_costs + self.gas_costs) / (len(self.riders) + 1)
        else:
            # Split tolls and gas only among riders
            additional_cost = (self.toll_costs + self.gas_costs) / len(self.riders) if self.riders else 0
        
        return base_cost + additional_cost
    
    def add_application(self, application_id: str) -> None:
        """Add a ride application to this ride"""
        if application_id not in self.applications:
            self.applications.append(application_id)
    
    def update_status(self, status: RideStatus) -> None:
        """Update the ride status"""
        self.status = status
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert ride object to dictionary"""
        return {
            'ride_id': self.ride_id,
            'driver_id': self.driver_id,
            'car_id': self.car_id,
            'event_id': self.event_id,
            'departure_location': self.departure_location,
            'departure_time': self.departure_time.isoformat(),
            'arrival_time': self.arrival_time.isoformat(),
            'available_seats': self.available_seats,
            'seat_map': self.seat_map,
            'cost_per_person': self.cost_per_person,
            'toll_costs': self.toll_costs,
            'gas_costs': self.gas_costs,
            'driver_pays_share': self.driver_pays_share,
            'max_riders': self.max_riders,
            'status': self.status.value,
            'created_at': self.created_at.isoformat(),
            'riders': self.riders,
            'applications': self.applications
        }


# Example usage and testing functions
def create_sample_data():
    """Create sample data to demonstrate the Stage 1 objects"""
    
    # Create a driver
    driver = Driver("john_doe", "john@example.com", "+1234567890")
    driver.update_verification_status(VerificationStatus.EMAIL_VERIFIED)
    driver.add_payment_method({"type": "credit_card", "last_four": "1234"})
    
    # Create a rider
    rider = Rider("jane_smith", "jane@example.com", "+0987654321")
    rider.update_verification_status(VerificationStatus.EMAIL_VERIFIED)
    rider.add_payment_method({"type": "debit_card", "last_four": "5678"})
    
    # Create an event
    event = Event(
        event_name="YU vs NYU Soccer Game",
        event_type="sports",
        location="Yankee Stadium, Bronx, NY",
        coordinates=(40.8296, -73.9262),
        event_date=datetime(2024, 6, 15, 19, 0),  # June 15, 2024 at 7 PM
        created_by=driver.driver_id,
        description="Championship soccer match between YU and NYU"
    )
    
    # Create a car
    car = Car(
        driver_id=driver.driver_id,
        make="Honda",
        model="Odyssey",
        year=2022,
        vehicle_type=VehicleType.MINIVAN,
        color="Silver",
        license_plate="ABC123",
        seating_capacity=7,
        amenities=["AC", "Bluetooth", "USB Chargers"]
    )
    
    # Create a ride
    ride = Ride(
        driver_id=driver.driver_id,
        car_id=car.car_id,
        event_id=event.event_id,
        departure_location="Times Square, Manhattan",
        departure_time=datetime(2024, 6, 15, 17, 0),  # 5 PM departure
        arrival_time=datetime(2024, 6, 15, 18, 30),  # 6:30 PM arrival
        cost_per_person=15.0,
        toll_costs=8.0,
        gas_costs=12.0,
        driver_pays_share=True,
        max_riders=5
    )
    
    # Initialize seat map for the ride
    ride.initialize_seat_map(car)
    
    # Add relationships
    driver.add_vehicle(car.car_id)
    driver.add_ride(ride.ride_id)
    car.add_ride(ride.ride_id)
    event.add_ride(ride.ride_id)
    
    return {
        'driver': driver,
        'rider': rider,
        'event': event,
        'car': car,
        'ride': ride
    }


if __name__ == "__main__":
    # Demonstrate the Stage 1 objects
    print("ShareRide - Stage 1: Core Data Objects")
    print("=" * 50)
    
    # Create sample data
    sample_data = create_sample_data()
    
    # Display sample data
    print("\nSample Driver:")
    print(sample_data['driver'].to_dict())
    
    print("\nSample Rider:")
    print(sample_data['rider'].to_dict())
    
    print("\nSample Event:")
    print(sample_data['event'].to_dict())
    
    print("\nSample Car:")
    print(sample_data['car'].to_dict())
    
    print("\nSample Ride:")
    print(sample_data['ride'].to_dict())
    
    # Demonstrate seat booking
    print("\nSeat Booking Demo:")
    print(f"Available seats before booking: {sample_data['ride'].available_seats}")
    
    # Book a seat for the rider
    success = sample_data['ride'].book_seat(sample_data['rider'].rider_id, "seat_1")
    print(f"Seat booking successful: {success}")
    print(f"Available seats after booking: {sample_data['ride'].available_seats}")
    print(f"Cost per rider: ${sample_data['ride'].calculate_cost_per_rider():.2f}")
    
    print("\nStage 1 implementation complete!")
