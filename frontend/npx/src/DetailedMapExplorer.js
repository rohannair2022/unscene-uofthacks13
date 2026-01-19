import React, { useState, useEffect, useRef } from "react";

export default function DetailedMapExplorer({ state, onClose }) {
  const [center, setCenter] = useState({ lat: 0, lng: 0 });
  const [zoom, setZoom] = useState(12);
  const [activeCat, setActiveCat] = useState("restaurants");
  const [useGems, setUseGems] = useState(true);
  const [radiusKm, setRadiusKm] = useState(6);
  const [places, setPlaces] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [searchingCities, setSearchingCities] = useState(false);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const searchTimeoutRef = useRef(null);
  const effectiveRadiusKm = Math.min(radiusKm, 10);

  const CATEGORIES = [
    {
      key: "restaurants",
      label: "Restaurants",
      icon: "🍽️",
      overpass: [
        'node["amenity"="restaurant"]',
        'node["amenity"="cafe"]',
        'node["amenity"="bar"]',
        'node["amenity"="fast_food"]',
      ],
    },
    {
      key: "attractions",
      label: "Attractions",
      icon: "📍",
      overpass: [
        'node["tourism"="attraction"]',
        'node["tourism"="museum"]',
        'node["tourism"="gallery"]',
        'node["historic"]',
        'node["leisure"="park"]',
      ],
    },
    {
      key: "hotels",
      label: "Hotels",
      icon: "🏨",
      overpass: [
        'node["tourism"="hotel"]',
        'node["tourism"="hostel"]',
        'node["tourism"="guest_house"]',
      ],
    },
    {
      key: "safety",
      label: "Safety",
      icon: "🛡️",
      overpass: [
        'node["amenity"="police"]',
        'node["amenity"="hospital"]',
        'node["amenity"="clinic"]',
        'node["amenity"="pharmacy"]',
      ],
    },
    {
      key: "transport",
      label: "Transport",
      icon: "🚆",
      overpass: [
        'node["railway"="station"]',
        'node["public_transport"="station"]',
        'node["amenity"="bus_station"]',
      ],
    },
  ];

  const HIDDEN_GEMS = {
    overpass: [
      'node["tourism"="artwork"]',
      'node["amenity"="library"]',
      'node["leisure"="garden"]',
      'node["craft"]',
      'node["amenity"="arts_centre"]',
      'node["shop"="antique"]',
    ],
  };

  useEffect(() => {
    setCenter({ lat: state.lat, lng: state.lng });

    loadLeaflet().then(() => {
      initializeMap(state.lat, state.lng);
      runSearch(state.lat, state.lng);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [state]);

  useEffect(() => {
    if (mapInstanceRef.current && places.length > 0) {
      updateMarkers();
    }
  }, [places, selectedId]);

  async function loadLeaflet() {
    if (window.L) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  function initializeMap(lat, lng) {
    if (!window.L || !mapContainerRef.current) return;

    const L = window.L;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 12,
      scrollWheelZoom: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      },
    ).addTo(map);

    // Leaflet sometimes renders a blank/grey map when the container was just mounted
    // (common in modals/overlays). This forces a proper reflow.
    setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {
        // no-op
      }
    }, 0);

    mapInstanceRef.current = map;
  }

  function updateMarkers() {
    if (!mapInstanceRef.current || !window.L) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    places.forEach((place) => {
      const marker = L.marker([place.lat, place.lon], {
        icon: L.icon({
          iconUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      });

      const popupContent = `
        <div style="min-width: 200px;">
          <div style="font-weight: 800; margin-bottom: 4px; color: #111;">${place.name}</div>
          <div style="opacity: 0.8; font-size: 13px; margin-bottom: 8px; color: #333;">${place.description}</div>
          <div style="font-size: 13px; opacity: 0.9; color: #111;">
            ⭐ ${place.rating} · ${place.distanceKm.toFixed(1)} km away
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on("click", () => setSelectedId(place.id));
      marker.addTo(map);

      markersRef.current[place.id] = marker;

      if (place.id === selectedId) {
        marker.openPopup();
        map.setView([place.lat, place.lon], 14, { animate: true });
      }
    });
  }

  async function fetchOverpass({ lat, lon, radiusM, selectors }) {
    const radiusDeg = radiusM / 111000;

    const bbox = [
      lat - radiusDeg,
      lon - radiusDeg / Math.cos((lat * Math.PI) / 180),
      lat + radiusDeg,
      lon + radiusDeg / Math.cos((lat * Math.PI) / 180),
    ]
      .map((n) => n.toFixed(6))
      .join(",");

    const body = `
[out:json][timeout:100];
(
  ${selectors.map((s) => `${s}(${bbox});`).join("\n  ")}
);
out center 50;
`;

    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: body,
      });

      if (!res.ok) {
        if (res.status === 504) {
          const fallbackBody = body.replace(
            "out center 50;",
            "out center 100;",
          );
          const fallbackRes = await fetch(
            "https://overpass-api.de/api/interpreter",
            {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=UTF-8" },
              body: fallbackBody,
            },
          );

          if (!fallbackRes.ok)
            throw new Error(`Overpass error: ${fallbackRes.status}`);
          const json = await fallbackRes.json();
          return json.elements || [];
        }
        throw new Error(`Overpass error: ${res.status}`);
      }

      const json = await res.json();
      return json.elements || [];
    } catch (err) {
      console.warn("Overpass failed:", err.message);
      return [];
    }
  }

  function haversineKm(a, b) {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  async function runSearch(lat = center.lat, lng = center.lng) {
    setLoading(true);
    setStatus("Finding places…");
    setPlaces([]);
    setSelectedId(null);

    try {
      const category =
        CATEGORIES.find((c) => c.key === activeCat) || CATEGORIES[0];
      const selectors = [...category.overpass];
      if (useGems) selectors.push(...HIDDEN_GEMS.overpass);

      const elements = await fetchOverpass({
        lat,
        lon: lng,
        radiusM: Math.round(radiusKm * 1000),
        selectors,
      });

      const unique = new Map();
      for (const el of elements) {
        if (!el?.lat || !el?.lon) continue;
        const name =
          el.tags?.name ||
          el.tags?.["name:en"] ||
          el.tags?.amenity ||
          el.tags?.tourism ||
          "Unknown Place";

        const isSafety =
          el.tags?.amenity === "police" ||
          el.tags?.amenity === "hospital" ||
          el.tags?.amenity === "pharmacy";
        if (!el.tags?.name && !isSafety) continue;

        const id = `${el.type}:${el.id}`;
        if (unique.has(id)) continue;

        const dist = haversineKm({ lat, lng }, { lat: el.lat, lng: el.lon });
        const hasWebsite = !!(el.tags?.website || el.tags?.["contact:website"]);
        const hasPhone = !!(el.tags?.phone || el.tags?.["contact:phone"]);
        const rating = Math.min(
          4.9,
          Math.max(
            3.6,
            3.6 + (hasWebsite ? 0.3 : 0) + (hasPhone ? 0.15 : 0) - dist * 0.02,
          ),
        );

        unique.set(id, {
          id,
          name: String(name),
          lat: el.lat,
          lon: el.lon,
          distanceKm: dist,
          rating: Number(rating.toFixed(1)),
          description:
            el.tags?.description ||
            el.tags?.tourism ||
            el.tags?.amenity ||
            "Point of interest",
        });
      }

      const list = Array.from(unique.values())
        .sort((a, b) => b.rating - a.rating || a.distanceKm - b.distanceKm)
        .slice(0, 100);

      setPlaces(list);
      setStatus(
        list.length ? `Found ${list.length} places` : "No places found",
      );
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  function focusPlace(place) {
    setSelectedId(place.id);
    if (mapInstanceRef.current && markersRef.current[place.id]) {
      mapInstanceRef.current.setView([place.lat, place.lon], 14, {
        animate: true,
      });
      markersRef.current[place.id].openPopup();
    }
  }

  async function searchCities(query) {
    if (!query || query.length < 2) {
      setCitySuggestions([]);
      return;
    }

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce the search
    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingCities(true);
      try {
        // Nominatim (OpenStreetMap) geocoding
        // IMPORTANT:
        // - Don't set a custom `User-Agent` header in the browser: it's a forbidden header.
        //   Adding it triggers a CORS preflight that Nominatim will reject, making search "not work".
        // - Don't hard-bound results to the current state viewbox: that blocks global searches
        //   (e.g., typing "Paris" while exploring Ontario).
        const url =
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(query)}` +
          `&format=jsonv2&addressdetails=1&limit=20&accept-language=en`;

        const res = await fetch(url);

        if (!res.ok) throw new Error("City search failed");

        const data = await res.json();

        // Keep place-like results.
        // NOTE: Big cities (Toronto, NYC, etc.) often come back as administrative boundaries
        // (class=boundary, type=administrative). If we filter too strictly, they disappear.
        const cities = (Array.isArray(data) ? data : [])
          .filter((item) => {
            const addrType = (
              item.addresstype ||
              item.type ||
              ""
            ).toLowerCase();
            const okAddrTypes = [
              "city",
              "town",
              "village",
              "municipality",
              "county",
              "state",
              "province",
              "region",
            ];
            const isAdminBoundary =
              item.class === "boundary" && item.type === "administrative";
            return (
              item.class === "place" ||
              okAddrTypes.includes(addrType) ||
              isAdminBoundary
            );
          })
          .map((item) => ({
            name:
              item.name ||
              String(item.display_name || "").split(",")[0] ||
              "Unknown",
            fullName: item.display_name || "",
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
          }))
          .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon))
          .filter(
            (city, index, self) =>
              index === self.findIndex((c) => c.fullName === city.fullName),
          )
          .slice(0, 10);

        setCitySuggestions(cities);
      } catch (err) {
        console.warn("City search error:", err);
        // Fallback: clear suggestions
        setCitySuggestions([]);
      } finally {
        setSearchingCities(false);
      }
    }, 600);
  }
  async function fetchMajorCitiesInState() {
    try {
      // Query Overpass API for major cities in the state bounding box
      const stateRadiusDeg = 2; // Approximate bounding box around state
      const bbox = [
        state.lat - stateRadiusDeg,
        state.lng - stateRadiusDeg / Math.cos((state.lat * Math.PI) / 180),
        state.lat + stateRadiusDeg,
        state.lng + stateRadiusDeg / Math.cos((state.lat * Math.PI) / 180),
      ]
        .map((n) => n.toFixed(6))
        .join(",");

      const overpassQuery = `
        [out:json][timeout:100];
        (
          node["place"="city"](${bbox});
          node["place"="town"](${bbox});
          node["place"="municipality"](${bbox});
          way["place"="city"](${bbox});
          way["place"="town"](${bbox});
          way["place"="municipality"](${bbox});
        );
        out center 20;
      `;

      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: overpassQuery,
      });

      if (res.ok) {
        const data = await res.json();
        const cities = data.elements
          .filter((el) => el.tags?.name && el.tags.place)
          .map((el) => {
            const lat = el.lat || (el.center && el.center.lat);
            const lon = el.lon || (el.center && el.center.lng);
            return {
              name: el.tags.name,
              fullName: el.tags.name + ", " + state.name,
              lat: lat,
              lon: lon,
            };
          })
          .filter((city) => city.lat && city.lon)
          .slice(0, 15);

        if (cities.length > 0) {
          // Use the first few as suggestions when search is empty
          setCitySuggestions(cities.slice(0, 5));
        }
      }
    } catch (err) {
      console.warn("Could not fetch major cities:", err);
    }
  }

  function selectCity(city) {
    setCenter({ lat: city.lat, lng: city.lon });
    setCitySearch("");
    setCitySuggestions([]);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([city.lat, city.lon], 12, {
        animate: true,
      });

      // Safety: ensure tiles repaint after moving.
      try {
        mapInstanceRef.current.invalidateSize();
      } catch (e) {
        // no-op
      }
    }

    runSearch(city.lat, city.lon);
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0, 0, 17, 0.98)",
        zIndex: 9999,
        overflow: "auto",
      }}
    >
      <div
        style={{
          minHeight: "100vh",
          padding: "24px",
          background:
            "radial-gradient(1000px 600px at 30% 10%, rgba(140,80,255,0.25), transparent 60%), radial-gradient(900px 500px at 80% 20%, rgba(0,200,255,0.18), transparent 60%), #0b0b12",
          color: "#eef",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 12,
            color: "#fff",
            fontSize: "1.5rem",
            width: 48,
            height: 48,
            cursor: "pointer",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(10px)",
          }}
        >
          ✕
        </button>

        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 24, textAlign: "center" }}>
            <h1
              style={{
                fontSize: "2.5rem",
                margin: "0 0 10px 0",
                color: "#FFD700",
              }}
            >
              {state.name}
            </h1>
            <p style={{ fontSize: "1.2rem", color: "#aaa", margin: 0 }}>
              {state.country} • Detailed Explorer
            </p>
          </div>

          {/* City Search */}
          <div
            style={{
              marginBottom: 18,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 18,
              padding: 16,
              position: "relative",
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 20 }}>🔍</span>
              <input
                type="text"
                placeholder="Search any city / region / country…"
                value={citySearch}
                onChange={(e) => {
                  setCitySearch(e.target.value);
                  searchCities(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && citySuggestions.length > 0) {
                    e.preventDefault();
                    selectCity(citySuggestions[0]);
                  }
                }}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  padding: "12px 16px",
                  color: "#fff",
                  fontSize: 15,
                  outline: "none",
                }}
              />
            </div>

            {citySuggestions.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  background: "rgba(0,0,0,0.6)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  overflow: "hidden",
                  backdropFilter: "blur(10px)",
                }}
              >
                {citySuggestions.map((city, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectCity(city)}
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      borderBottom:
                        idx < citySuggestions.length - 1
                          ? "1px solid rgba(255,255,255,0.08)"
                          : "none",
                      transition: "background 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(140,80,255,0.2)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>
                      {city.name}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {city.fullName}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchingCities && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  opacity: 0.7,
                  textAlign: "center",
                }}
              >
                Searching cities...
              </div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.55fr 1fr",
              gap: 18,
              alignItems: "start",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 18,
                padding: 12,
                boxShadow: "0 20px 80px rgba(0,0,0,0.45)",
              }}
            >
              <div
                style={{
                  height: 520,
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <div
                  ref={mapContainerRef}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 18,
                  padding: 14,
                }}
              >
                <div
                  style={{ fontWeight: 900, fontSize: 16, marginBottom: 12 }}
                >
                  Category
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {CATEGORIES.map((c) => (
                    <div
                      key={c.key}
                      onClick={() => {
                        setActiveCat(c.key);
                        setTimeout(() => runSearch(), 100);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "12px 14px",
                        borderRadius: 14,
                        border:
                          c.key === activeCat
                            ? "1px solid rgba(140,80,255,0.65)"
                            : "1px solid rgba(255,255,255,0.10)",
                        background:
                          c.key === activeCat
                            ? "linear-gradient(90deg, rgba(140,80,255,0.28), rgba(0,200,255,0.12))"
                            : "rgba(255,255,255,0.05)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{c.icon}</span>
                      <span style={{ fontWeight: 700 }}>{c.label}</span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      marginBottom: 14,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={useGems}
                      onChange={(e) => {
                        setUseGems(e.target.checked);
                        setTimeout(() => runSearch(), 100);
                      }}
                    />
                    <span style={{ fontWeight: 700 }}>✨ Hidden Gems</span>
                  </label>

                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <span style={{ opacity: 0.75, fontSize: 12 }}>Radius</span>
                    <input
                      type="range"
                      min={2}
                      max={20}
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(Number(e.target.value))}
                      onMouseUp={() => runSearch()}
                      onTouchEnd={() => runSearch()}
                      style={{ flex: 1 }}
                    />
                    <span
                      style={{ width: 44, textAlign: "right", fontWeight: 700 }}
                    >
                      {radiusKm}km
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 14, fontSize: 13, opacity: 0.75 }}>
                  {loading ? "⏳ " : "✓ "}
                  {status}
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 18,
                  padding: 14,
                }}
              >
                <div
                  style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}
                >
                  {places.length ? `Found ${places.length} places` : "Results"}
                </div>

                <div
                  style={{
                    maxHeight: 420,
                    overflow: "auto",
                    display: "grid",
                    gap: 10,
                    paddingRight: 6,
                  }}
                >
                  {places.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => focusPlace(p)}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        cursor: "pointer",
                        border:
                          p.id === selectedId
                            ? "1px solid rgba(140,80,255,0.7)"
                            : "1px solid rgba(255,255,255,0.10)",
                        background:
                          p.id === selectedId
                            ? "linear-gradient(90deg, rgba(140,80,255,0.25), rgba(0,200,255,0.10))"
                            : "rgba(255,255,255,0.04)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div style={{ fontWeight: 900 }}>{p.name}</div>
                        <div style={{ fontWeight: 800, opacity: 0.9 }}>
                          ⭐ {p.rating}
                        </div>
                      </div>
                      <div style={{ opacity: 0.8, marginTop: 6, fontSize: 13 }}>
                        {p.description} • {p.distanceKm.toFixed(1)} km away
                      </div>
                    </div>
                  ))}

                  {!places.length && !loading && (
                    <div
                      style={{
                        opacity: 0.75,
                        fontSize: 13,
                        padding: 10,
                        textAlign: "center",
                      }}
                    >
                      No places found. Try adjusting the radius or category.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              maxWidth: 1200,
              margin: "14px auto 0",
              opacity: 0.65,
              fontSize: 12,
              textAlign: "center",
            }}
          >
            Data: OpenStreetMap via Overpass API • Map: Leaflet
          </div>
        </div>
      </div>
    </div>
  );
}
