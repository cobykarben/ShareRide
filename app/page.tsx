import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Car, Users, DollarSign, MapPin, Ticket, Shield, Clock } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 lg:py-32">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Car className="h-12 w-12 text-primary" />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              ShareRide
            </h1>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight max-w-3xl">
            Find or Share Rides to Events
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Connect drivers with empty seats to riders heading to the same event.
            Affordable, safe, and convenient event transportation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/signup">Get Started</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8">
              <Link href="/events">Browse Events</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* For Drivers */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">For Drivers</CardTitle>
              </div>
              <CardDescription className="text-base">
                Going to an event? Fill your empty seats and offset your costs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <DollarSign className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold">Offset Your Costs</h4>
                  <p className="text-sm text-muted-foreground">
                    Share gas and toll costs with riders heading to the same event.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold">Meet New People</h4>
                  <p className="text-sm text-muted-foreground">
                    Connect with people who share your interests and events.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold">Safe & Secure</h4>
                  <p className="text-sm text-muted-foreground">
                    All users are verified and rides are pre-planned with clear details.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* For Riders */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Ticket className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">For Riders</CardTitle>
              </div>
              <CardDescription className="text-base">
                Need a ride to an event? Find affordable, pre-planned rides.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <DollarSign className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold">Affordable Prices</h4>
                  <p className="text-sm text-muted-foreground">
                    Split costs with the driver and other riders - much cheaper than rideshare.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold">Plan Ahead</h4>
                  <p className="text-sm text-muted-foreground">
                    Book your ride in advance with confirmed departure times.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold">Choose Your Seat</h4>
                  <p className="text-sm text-muted-foreground">
                    Interactive seat maps let you pick your preferred spot.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Getting started with ShareRide is simple
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Ticket className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-center">1. Find an Event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">
                  Browse our directory of events - concerts, games, conferences, and more.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Car className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-center">2. Choose a Ride</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">
                  View available rides to your event, see seat availability, and pick your spot.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-center">3. Ride Together</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">
                  Connect with your driver, enjoy the ride, and split costs transparently.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="border-2 bg-primary/5">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-4">Ready to Get Started?</CardTitle>
            <CardDescription className="text-lg">
              Join ShareRide today and start connecting with drivers and riders
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/signup">Sign Up Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8">
              <Link href="/events">Browse Events</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
