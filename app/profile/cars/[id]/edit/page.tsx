"use client";

/**
 * Edit Car Preset Page for ShareRide
 * 
 * This page allows users to edit an existing car preset.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteGuard } from "@/components/RouteGuard";
import { CarPresetForm } from "@/components/CarPresetForm";
import { useCarPresets } from "@/hooks/useCarPresets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function EditCarPresetPage() {
  const params = useParams();
  const router = useRouter();
  const carPresetId = params.id as string;
  
  const { fetchCarPreset, currentCarPreset, loading, error } = useCarPresets();
  const [notFound, setNotFound] = useState(false);

  // Fetch car preset on mount
  useEffect(() => {
    if (carPresetId) {
      fetchCarPreset(carPresetId).catch((err) => {
        console.error("Error fetching car preset:", err);
        // Check if it's a "not found" error
        if (err instanceof Error && err.message.includes("not found")) {
          setNotFound(true);
        }
      });
    }
  }, [carPresetId, fetchCarPreset]);

  const handleSuccess = () => {
    router.push("/profile/cars");
  };

  const handleCancel = () => {
    router.push("/profile/cars");
  };

  // Show loading state
  if (loading) {
    return (
      <RouteGuard>
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading car preset...</p>
            </div>
          </div>
        </div>
      </RouteGuard>
    );
  }

  // Show error or not found state
  if (error || notFound || !currentCarPreset) {
    return (
      <RouteGuard>
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Car Preset Not Found</CardTitle>
              <CardDescription>
                The car preset you're looking for doesn't exist or you don't have permission to edit it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => router.push("/profile/cars")}
                className="text-primary hover:underline"
              >
                ← Back to My Car Presets
              </button>
            </CardContent>
          </Card>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <CarPresetForm
          initialValues={currentCarPreset}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </RouteGuard>
  );
}

