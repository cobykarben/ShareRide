"use client";

/**
 * Create Event Page for ShareRide
 * 
 * This page allows authenticated users to create a new event.
 * Uses the EventForm component in create mode.
 */

import { useRouter } from "next/navigation";
import { RouteGuard } from "@/components/RouteGuard";
import { EventForm } from "@/components/EventForm";

export default function CreateEventPage() {
  const router = useRouter();

  return (
    <RouteGuard>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <EventForm
          onSuccess={() => {
            router.push("/events");
            router.refresh();
          }}
          onCancel={() => {
            router.back();
          }}
        />
      </div>
    </RouteGuard>
  );
}

