import { useEffect, useRef } from "react";
import Globe from "globe.gl";

// This fetches ~150,000 cities from a verified open-source dataset
async function loadAllCities() {
  const url =
    "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/cities.json";

  try {
    const response = await fetch(url);
    const data = await response.json();

    // Formatting them into your specific { name, lat, lng } format
    const formattedCities = data.map((c) => ({
      name: c.name,
      lat: parseFloat(c.latitude),
      lng: parseFloat(c.longitude),
    }));

    console.log(`Loaded ${formattedCities.length} cities!`);
    return formattedCities;
  } catch (error) {
    console.error("Failed to load cities:", error);
  }
}

const cities = await loadAllCities();

export default function GlobeBasic() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const globe = Globe()(containerRef.current)
      // 🌍 Globe visuals
      .globeImageUrl(
        "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
      ) // 🌈 more colorful texture
      .backgroundColor("#87ceeb") // light sky blue background

      // 📍 City dots
      .pointsData(cities)
      .pointLat((d) => d.lat)
      .pointLng((d) => d.lng)
      .pointAltitude(0.02)
      .pointRadius(0.15)
      .pointColor(() => "#ffcc00")

      // 🔵 Borders around cities (rings)
      .ringsData(cities)
      .ringLat((d) => d.lat)
      .ringLng((d) => d.lng)
      .ringMaxRadius(0.6)
      .ringPropagationSpeed(0)
      .ringRepeatPeriod(0)
      .ringColor(() => ["#ffffff"])

      // 🖱️ Click handler
      .onPointClick((d) => {
        alert(`City: ${d.name}`);
      });

    // optional: gentle rotation
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.1;

    return () => {
      // let React handle cleanup
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
}
