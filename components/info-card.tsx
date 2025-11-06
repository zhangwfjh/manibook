"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function InfoCard() {
  const [location, setLocation] = useState<{
    city: string;
    country: string;
  } | null>(null);
  const [weather, setWeather] = useState<{
    temp: number;
    description: string;
  } | null>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 60000);

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;

      const locationRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      if (locationRes.ok) {
        const locationData = await locationRes.json();
        setLocation({
          city:
            locationData.city || locationData.locality || "Unknown Location",
          country: locationData.countryName || "",
        });

        const weatherRes = await fetch(
          `https://wttr.in/${
            locationData.city || latitude + "," + longitude
          }?format=j1`
        );

        if (weatherRes.ok) {
          const weatherData = await weatherRes.json();
          const currentCondition = weatherData.current_condition[0];
          setWeather({
            temp: parseInt(currentCondition.temp_C),
            description: currentCondition.weatherDesc[0].value.toLowerCase(),
          });
        }
      }
    });

    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className="w-full max-w-md">
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col items-center space-y-2 rounded-lg border p-4">
            <div className="text-center">
              <div className="font-medium">{location?.city}</div>
              <div className="text-sm text-muted-foreground">
                {location?.country}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-2 rounded-lg border p-4">
            <div className="text-center">
              <div className="text-lg font-bold">{formattedTime}</div>
              <div className="text-sm text-muted-foreground">
                {time.toLocaleDateString([], { weekday: "short" })}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-2 rounded-lg border p-4">
            <div className="text-center">
              <div className="text-lg font-bold">
                {time.toLocaleDateString([], { day: "numeric" })}
              </div>
              <div className="text-sm text-muted-foreground">
                {time.toLocaleDateString([], { month: "short" })}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-2 rounded-lg border p-4">
            <div className="text-center">
              <div className="text-lg font-bold">{weather?.temp}°C</div>
              <div className="text-sm text-muted-foreground capitalize">
                {weather?.description}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
