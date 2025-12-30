"use client";

/**
 * Events Directory Page for ShareRide
 * 
 * This page allows users to:
 * - Browse all events
 * - Search events by name (fuzzy search)
 * - Filter events by date (upcoming, past, today, this week, this month)
 * - View event details
 * - Create new events (if authenticated)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { Search, Plus, Calendar, MapPin, ExternalLink, Ticket } from "lucide-react";
import { useEvents, type DateFilter } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function EventsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    events,
    loading,
    error,
    fetchEvents,
    searchEvents,
    filterEventsByDate,
  } = useEvents();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [isSearching, setIsSearching] = useState(false);

  // Fetch events on mount
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  /**
   * Handle search input change
   * Debounced search - waits for user to stop typing
   */
  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);
    
    if (value.trim()) {
      setIsSearching(true);
      await searchEvents(value);
      setIsSearching(false);
    } else {
      // If search is cleared, apply current date filter
      await handleDateFilterChange(dateFilter);
    }
  };

  /**
   * Handle date filter change
   */
  const handleDateFilterChange = async (filter: DateFilter) => {
    setDateFilter(filter);
    
    if (searchQuery.trim()) {
      // If there's a search query, apply both search and filter
      // For now, just search - we can enhance this later to combine filters
      await searchEvents(searchQuery);
    } else {
      // Apply date filter
      await filterEventsByDate(filter);
    }
  };

  /**
   * Format event datetime for display
   */
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If event is in the future, show relative time
    if (date > now) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    
    // Otherwise show formatted date
    return format(date, "MMM d, yyyy 'at' h:mm a"); // e.g., "Jan 15, 2025 at 7:00 PM"
  };

  /**
   * Get event status badge (upcoming/past)
   */
  const getEventStatus = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    return date > now ? "upcoming" : "past";
  };

  const isAuthenticated = !!user;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Events Directory
          </h1>
          <p className="text-muted-foreground">
            Find events and connect with riders heading to the same place
          </p>
        </div>
        {isAuthenticated && (
          <Button asChild>
            <Link href="/events/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Link>
          </Button>
        )}
      </div>

      {/* Search and Filters Section */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search events by name..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Date Filter */}
        <Select
          value={dateFilter}
          onValueChange={(value) => handleDateFilterChange(value as DateFilter)}
        >
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="past">Past Events</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {(loading || isSearching) && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading events...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={fetchEvents} variant="outline">
              Try Again
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Events Grid */}
      {!loading && !isSearching && !error && (
        <>
          {events.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No events found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery
                    ? "Try adjusting your search or filters"
                    : "Be the first to create an event!"}
                </p>
                {isAuthenticated && (
                  <Button asChild>
                    <Link href="/events/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Event
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Results count */}
              <div className="mb-4 text-sm text-muted-foreground">
                Found {events.length} {events.length === 1 ? "event" : "events"}
              </div>

              {/* Events Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => {
                  const status = getEventStatus(event.start_datetime);
                  const isUpcoming = status === "upcoming";

                  return (
                    <Card
                      key={event.id}
                      className={`hover:shadow-lg transition-shadow cursor-pointer ${
                        !isUpcoming ? "opacity-75" : ""
                      }`}
                      onClick={() => router.push(`/events/${event.id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <CardTitle className="text-xl line-clamp-2">
                            {event.name}
                          </CardTitle>
                          <Badge variant={isUpcoming ? "default" : "secondary"}>
                            {isUpcoming ? "Upcoming" : "Past"}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>{formatEventDate(event.start_datetime)}</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Location */}
                        {event.address && (
                          <div className="flex items-start gap-2 mb-4">
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {event.address}
                            </p>
                          </div>
                        )}

                        {/* Description */}
                        {event.description && (
                          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                            {event.description}
                          </p>
                        )}

                        {/* Website Link */}
                        {event.website_url && (
                          <a
                            href={event.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()} // Prevent card click
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Visit website
                          </a>
                        )}
                      </CardContent>
                      <CardFooter>
                        <Button
                          className="w-full"
                          variant={isUpcoming ? "default" : "outline"}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/events/${event.id}`);
                          }}
                        >
                          View Details
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

