"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useRouter } from "next/navigation";
import { useRoute } from "@/context/RouteContext";
import { useUser } from "@clerk/nextjs";
import getCurrentLocation from "@/utils/getUserLocation";
import { toast } from "sonner";
import sampleRoute from "@/utils/sample_route1.json";

const prioritiesList = [
  "parks",
  "forest",
  "water",
  "touristic",
  "resting",
  "cafe",
  "medical",
];

export default function CreateRoutePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [tripType, setTripType] = useState("round");
  const [mounted, setMounted] = useState(false);
  const [startLocation, setStartLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [inputType, setInputType] = useState("distance");
  const [distance, setDistance] = useState(1);
  const [time, setTime] = useState(30);
  const [calories, setCalories] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [selectedPriorities, setSelectedPriorities] = useState([]);
  const [lat, setLat] = useState(28.622884208666946); // Default coordinates for New Delhi
  const [lng, setLng] = useState(77.22535192598555);
  const { setRoute } = useRoute();

  const savedAddress = user?.publicMetadata?.address || "";
  const savedPriorities = user?.publicMetadata?.priorities || [];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const getDistanceFromInput = () => {
    if (inputType === "distance") return Number(distance);
    if (inputType === "time") return Number(time) * 0.1;
    if (inputType === "calories") return Number(calories) / 50;
    return 0;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!startLocation) {
        toast.error(
          "Please enter a starting location or use your current location."
        );
        setLoading(false);
        return;
      }
      if (!lat || !lng) {
        const geoRes = await fetch(
          `/api/forwardGeocode?place=${encodeURIComponent(startLocation)}`
        );
        const geoData = await geoRes.json();

        if (!geoData?.coords) {
          setLoading(false);
          toast.error("Could not geocode starting location");
          throw new Error("Could not geocode starting location");
        }
        toast.success("Starting location geocoded successfully");
        const [latitude, longitude] = geoData.coords;
        setLat(latitude);
        setLng(longitude);
      }

      if (tripType === "destination" && !destination) {
        toast.error("Please enter a destination.");
        setLoading(false);
        return;
      }

      const priorities = selectedPriorities;

      if (tripType === "round") {
        const res = await fetch("/api/round-route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_location_cords: [lng, lat],
            route_distance: Number(getDistanceFromInput()) * 1000,
            priorities,
          }),
        });

        const data = await res.json();
        if (!data?.route[0]) throw new Error("No route generated");

        const route = data.route[0];
        setRoute(route);
        router.push("/result");
      } else if (tripType === "destination") {
        const geoRes = await fetch(
          `/api/forwardGeocode?place=${encodeURIComponent(destination)}`
        );
        const geoData = await geoRes.json();

        if (!geoData?.coords) {
          setLoading(false);
          toast.error("Could not geocode destination");
          throw new Error("Could not geocode destination");
        }

        const dest_location_cords = geoData.coords;

        const res = await fetch("/api/dest-route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_location_cords: [lng, lat],
            dest_location_cords,
            priorities,
          }),
        });

        const data = await res.json();
        if (!data?.route[0]) throw new Error("No route generated");

        const route = data.route[0];
        setRoute(route);
        router.push("/result");
      }
    } catch (error) {
      console.error("Route generation failed:", error);
      toast.error("Failed to generate route. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrySampleRoute = async () => {
    setRoute(sampleRoute);
    router.push("/result");
  };
  const togglePriority = (priority) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority)
        ? prev.filter((p) => p !== priority)
        : [...prev, priority]
    );
  };

  return (
    <main className="mt-20 mb-5 max-w-7xl mx-auto py-12 px-4 sm:px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
        {/* Form Section  */}
        <div className="h-full border border-muted rounded-xl shadow-md p-8 bg-white">
          <h1 className="text-3xl font-bold text-primary mb-8">
            Create Your Route
          </h1>

          <div className="space-y-6">
            {/* Starting Location */}
            <div className="space-y-2">
              <Label htmlFor="start-location">Starting Location</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="start-location"
                  placeholder="Enter starting point"
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                  className="w-full"
                />
                <Button
                  variant="outline"
                  onClick={async () => {
                    const { latitude, longitude, address } =
                      await getCurrentLocation();
                    setLat(latitude);
                    setLng(longitude);
                    setStartLocation(address);
                  }}
                  className="whitespace-nowrap"
                >
                  Use Current Location
                </Button>
              </div>
              {isLoaded && savedAddress && (
                <Button
                  variant="outline"
                  className="mt-2 w-full sm:w-auto"
                  onClick={() => setStartLocation(savedAddress)}
                >
                  Use Address
                </Button>
              )}
            </div>

            {/* Trip Type */}
            <div className="space-y-2">
              <Label>Trip Type</Label>
              <RadioGroup
                defaultValue="round"
                onValueChange={(value) => setTripType(value)}
                className="flex flex-col sm:flex-row gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="round" id="round" />
                  <Label htmlFor="round">Round Trip</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="destination" id="destination" />
                  <Label htmlFor="destination">To a Destination</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Destination */}
            {tripType === "destination" && (
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  placeholder="Enter destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full"
                />
              </div>
            )}

            {/* Goal Type (only for round trip) */}
            {tripType === "round" && (
              <>
                <div className="space-y-2">
                  <Label>Goal Type</Label>
                  <RadioGroup
                    defaultValue="distance"
                    onValueChange={(val) => setInputType(val)}
                    className="flex flex-col sm:flex-row gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="distance" id="input-distance" />
                      <Label htmlFor="input-distance">Distance (km)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="time" id="input-time" />
                      <Label htmlFor="input-time">Time (min)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="calories" id="input-calories" />
                      <Label htmlFor="input-calories">Calories (kcal)</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Conditional Inputs */}
                {inputType === "distance" && (
                  <div className="space-y-2">
                    <Label htmlFor="distance">Target Distance (in km)</Label>
                    <Input
                      id="distance"
                      type="number"
                      placeholder="e.g. 5"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      className="w-full"
                    />
                  </div>
                )}
                {inputType === "time" && (
                  <div className="space-y-2">
                    <Label htmlFor="time">Expected Time (in minutes)</Label>
                    <Input
                      id="time"
                      type="number"
                      placeholder="e.g. 30"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full"
                    />
                  </div>
                )}
                {inputType === "calories" && (
                  <div className="space-y-2">
                    <Label htmlFor="calories">Calories to Burn (in kcal)</Label>
                    <Input
                      id="calories"
                      type="number"
                      placeholder="e.g. 200"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                      className="w-full"
                    />
                  </div>
                )}
              </>
            )}

            {/* Priorities Checkbox */}
            <div className="space-y-2">
              <Label>Select Priorities (optional)</Label>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {prioritiesList.map((priority) => (
                  <div key={priority} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={priority}
                      value={priority}
                      checked={selectedPriorities.includes(priority)}
                      onChange={() => togglePriority(priority)}
                    />
                    <Label htmlFor={priority} className="capitalize">
                      {priority}
                    </Label>
                  </div>
                ))}
              </div>
              {isLoaded && savedPriorities.length > 0 && (
                <Button
                  variant="outline"
                  className="mt-2 w-full sm:w-auto"
                  onClick={() => setSelectedPriorities(savedPriorities)}
                >
                  Use Saved Priorities
                </Button>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              * Estimates based on average walking speed (6 km/h) and 50
              kcal/km.
            </p>

            <Button
              className="w-full mt-4"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Creating..." : "Next"}
            </Button>
            {/* for the case when server is down add a sample / try button */}
            <Button variant="outline" className="w-full mt-2" onClick={handleTrySampleRoute}>
              Server Down? Try Sample Route
            </Button>
          </div>
        </div>

        {/* Image Section */}
        <div className="hidden sm:flex h-full items-center justify-center">
          <img
            src="/createRoute.png"
            alt="Create Route Illustration"
            className="w-full h-auto rounded-xl shadow-md border border-border max-w-md sm:max-w-none"
          />
        </div>
      </div>
    </main>
  );
}
