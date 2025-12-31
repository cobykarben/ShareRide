"use client";

/**
 * Create New Ride Page for ShareRide
 * 
 * This page allows drivers to create a new ride listing.
 * Uses the RideForm component.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { RouteGuard } from "@/components/RouteGuard";
import { RideForm } from "@/components/RideForm";

export default function CreateRidePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") || undefined;

  return (
    <RouteGuard>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <RideForm
          eventId={eventId}
          onSuccess={() => {
            // Redirect to the created ride or events page
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

