"use client";

/**
 * Create Car Preset Page for ShareRide
 * 
 * This page allows users to create a new car preset.
 */

import { useRouter } from "next/navigation";
import { RouteGuard } from "@/components/RouteGuard";
import { CarPresetForm } from "@/components/CarPresetForm";

export default function NewCarPresetPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/profile/cars");
  };

  const handleCancel = () => {
    router.push("/profile/cars");
  };

  return (
    <RouteGuard>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <CarPresetForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </RouteGuard>
  );
}

