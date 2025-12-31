"use client";

/**
 * Create New Ride Page for ShareRide
 * 
 * This page allows drivers to create a new ride listing.
 * Uses the RideForm component.
 */

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RouteGuard } from "@/components/RouteGuard";
import { RideForm } from "@/components/RideForm";

function CreateRideForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") || undefined;

  return (
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
  );
}

export default function CreateRidePage() {
  return (
    <RouteGuard>
      <Suspense fallback={<div className="container mx-auto px-4 py-8 max-w-3xl">Loading...</div>}>
        <CreateRideForm />
      </Suspense>
    </RouteGuard>
  );
}

