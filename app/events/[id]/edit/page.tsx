"use client";

/**
 * Edit Event Page for ShareRide
 * 
 * This page allows event creators to edit their events.
 * Uses the EventForm component in edit mode.
 */

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteGuard } from "@/components/RouteGuard";
import { EventForm } from "@/components/EventForm";
import { useEvents } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { user } = useAuth();
  const { currentEvent, loading, error, fetchEvent } = useEvents();

  // Fetch event on mount
  useEffect(() => {
    if (eventId) {
      fetchEvent(eventId);
    }
  }, [eventId, fetchEvent]);

  // Check if user is the event creator
  const isEventCreator = user && currentEvent?.created_by === user.id;

  // Loading state
  if (loading) {
    return (
      <RouteGuard>
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="text-center py-12">
            <Loader2 className="inline-block h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading event...</p>
          </div>
        </div>
      </RouteGuard>
    );
  }

  // Error state or event not found
  if (error || !currentEvent) {
    return (
      <RouteGuard>
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>
                {error || "Event not found"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/events")} variant="outline">
                Back to Events
              </Button>
            </CardContent>
          </Card>
        </div>
      </RouteGuard>
    );
  }

  // Check if user is the creator
  if (!isEventCreator) {
    return (
      <RouteGuard>
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You can only edit events you created.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => router.push(`/events/${eventId}`)} variant="outline">
              Back to Event
            </Button>
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <EventForm
          initialValues={currentEvent}
          onSuccess={() => {
            router.push(`/events/${eventId}`);
            router.refresh();
          }}
          onCancel={() => {
            router.push(`/events/${eventId}`);
          }}
        />
      </div>
    </RouteGuard>
  );
}

