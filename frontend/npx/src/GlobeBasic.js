import React, { useState, useEffect, useRef } from "react";
import Globe from "react-globe.gl";
import DetailedMapExplorer from "./DetailedMapExplorer";

export default function GlobeExplorer() {
  const globeEl = useRef();
  const [countries, setCountries] = useState({ features: [] });
  const [states, setStates] = useState([]);
  const [altitude, setAltitude] = useState(2.5);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [stateIntel, setStateIntel] = useState(null);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [showDetailedMap, setShowDetailedMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
    )
      .then((res) => res.json())
      .then(setCountries)
      .catch((err) => console.error("Failed to load countries:", err));

    fetch(
      "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/csv/states.csv",
    )
      .then((res) => res.text())
      .then((csvText) => {
        const lines = csvText.split("\n");
        const headers = lines[0].split(",");
        const idIndex = headers.findIndex(
          (h) => h.trim().toLowerCase() === "id",
        );
        const nameIndex = headers.findIndex(
          (h) => h.trim().toLowerCase() === "name",
        );
        const countryNameIndex = headers.findIndex(
          (h) => h.trim().toLowerCase() === "country_name",
        );
        const countryCodeIndex = headers.findIndex(
          (h) => h.trim().toLowerCase() === "country_code",
        );
        const latIndex = headers.findIndex(
          (h) => h.trim().toLowerCase() === "latitude",
        );
        const lngIndex = headers.findIndex(
          (h) => h.trim().toLowerCase() === "longitude",
        );

        const allStates = lines
          .slice(1)
          .filter((line) => line.trim())
          .map((line) => {
            const values = line.split(",");
            return {
              id: values[idIndex]?.replace(/"/g, "").trim(),
              name: values[nameIndex]?.replace(/"/g, "").trim(),
              country: values[countryNameIndex]?.replace(/"/g, "").trim(),
              country_code: values[countryCodeIndex]?.replace(/"/g, "").trim(),
              lat: parseFloat(values[latIndex]),
              lng: parseFloat(values[lngIndex]),
            };
          })
          .filter(
            (state) => state.name && !isNaN(state.lat) && !isNaN(state.lng),
          );

        setStates(allStates);
        console.log(`Loaded ${allStates.length} states/provinces`);
      })
      .catch((err) => console.error("Failed to load states:", err));
  }, []);

  const handleZoom = () => {
    if (globeEl.current) {
      const alt = globeEl.current.pointOfView().altitude;
      setAltitude(alt);
    }
  };

  const handleStateClick = (state) => {
    setSelectedState(state);
    setStateIntel(null);
    setLoadingIntel(true);

    if (globeEl.current) {
      globeEl.current.pointOfView(
        { lat: state.lat, lng: state.lng, altitude: 0.3 },
        1500,
      );
    }

    fetch(
      `http://localhost:3001/api/research?state=${encodeURIComponent(state.name)}&country=${encodeURIComponent(state.country)}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error("Backend unavailable");
        return res.json();
      })
      .then((data) => {
        setStateIntel(data);
        setLoadingIntel(false);
      })
      .catch((err) => {
        console.error("Failed to fetch state intel:", err);
        setStateIntel({
          summary: `${state.name} is a state/province in ${state.country}. Connect to backend server for detailed insights.`,
          spots: [],
        });
        setLoadingIntel(false);
      });
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = [];

    // Search countries
    countries.features.forEach((country) => {
      const name = country.properties.ADMIN || country.properties.NAME || "";
      if (name.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: "country",
          name: name,
          data: country,
        });
      }
    });

    // Search states
    states.forEach((state) => {
      if (
        state.name.toLowerCase().includes(lowerQuery) ||
        state.country.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          type: "state",
          name: `${state.name}, ${state.country}`,
          data: state,
        });
      }
    });

    setSearchResults(results.slice(0, 10));
    setShowResults(true);
  };

  const handleResultClick = (result) => {
    if (result.type === "country") {
      const d = result.data;
      let lat = 0,
        lng = 0;
      if (d.properties?.LAT && d.properties?.LON) {
        lat = d.properties.LAT;
        lng = d.properties.LON;
      } else if (d.geometry) {
        const coords = [];
        const extractCoords = (geom) => {
          if (geom.type === "Polygon") {
            geom.coordinates[0].forEach((c) => coords.push(c));
          } else if (geom.type === "MultiPolygon") {
            geom.coordinates.forEach((poly) => {
              poly[0].forEach((c) => coords.push(c));
            });
          }
        };
        extractCoords(d.geometry);
        if (coords.length > 0) {
          lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
          lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
        }
      }
      if (globeEl.current) {
        globeEl.current.pointOfView({ lat, lng, altitude: 0.8 }, 1000);
      }
    } else if (result.type === "state") {
      handleStateClick(result.data);
    }
    setShowResults(false);
    setSearchQuery("");
  };

  const showCountries = altitude < 2.0;
  const showStates = altitude < 1.2;

  return (
    <>
      {showDetailedMap && selectedState && (
        <DetailedMapExplorer
          state={selectedState}
          onClose={() => setShowDetailedMap(false)}
        />
      )}

      {/* Search Bar */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          width: "90%",
          maxWidth: "500px",
        }}
      >
        <input
          type="text"
          placeholder="Search countries, states, cities..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          style={{
            width: "100%",
            padding: "12px 20px",
            fontSize: "1rem",
            border: "2px solid rgba(140,80,255,0.5)",
            borderRadius: "25px",
            background: "rgba(0, 0, 0, 0.8)",
            color: "#fff",
            outline: "none",
            backdropFilter: "blur(10px)",
          }}
        />
        {showResults && searchResults.length > 0 && (
          <div
            style={{
              marginTop: "8px",
              background: "rgba(0, 0, 0, 0.9)",
              border: "2px solid rgba(140,80,255,0.5)",
              borderRadius: "12px",
              maxHeight: "300px",
              overflowY: "auto",
              backdropFilter: "blur(10px)",
            }}
          >
            {searchResults.map((result, idx) => (
              <div
                key={idx}
                onClick={() => handleResultClick(result)}
                style={{
                  padding: "12px 20px",
                  cursor: "pointer",
                  borderBottom:
                    idx < searchResults.length - 1
                      ? "1px solid rgba(140,80,255,0.2)"
                      : "none",
                  transition: "background 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "rgba(140,80,255,0.2)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div style={{ color: "#fff", fontSize: "0.95rem" }}>
                  {result.name}
                </div>
                <div
                  style={{
                    color: "#aaa",
                    fontSize: "0.75rem",
                    marginTop: "2px",
                  }}
                >
                  {result.type === "country" ? "Country" : "State/Province"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        polygonsData={showCountries ? countries.features : []}
        polygonAltitude={0.01}
        polygonCapColor={(d) =>
          d === hoveredCountry ? "rgba(100, 200, 255, 0.2)" : "rgba(0,0,0,0)"
        }
        polygonSideColor={() => "rgba(255, 255, 255, 0.05)"}
        polygonStrokeColor={() => "#559"}
        onPolygonHover={setHoveredCountry}
        onPolygonClick={(d) => {
          if (globeEl.current) {
            let lat = 0,
              lng = 0;
            if (d.properties?.LAT && d.properties?.LON) {
              lat = d.properties.LAT;
              lng = d.properties.LON;
            } else if (d.geometry) {
              const coords = [];
              const extractCoords = (geom) => {
                if (geom.type === "Polygon") {
                  geom.coordinates[0].forEach((c) => coords.push(c));
                } else if (geom.type === "MultiPolygon") {
                  geom.coordinates.forEach((poly) => {
                    poly[0].forEach((c) => coords.push(c));
                  });
                }
              };
              extractCoords(d.geometry);
              if (coords.length > 0) {
                lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
                lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
              }
            }
            globeEl.current.pointOfView({ lat, lng, altitude: 0.8 }, 1000);
          }
        }}
        pointsData={showStates ? states : []}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => "yellow"}
        pointRadius={0.15}
        pointAltitude={0.01}
        pointLabel="name"
        onPointClick={handleStateClick}
        onZoom={handleZoom}
      />

      {hoveredCountry && showCountries && !showStates && (
        <div
          style={{
            position: "absolute",
            top: "100px",
            left: "20px",
            background: "rgba(0, 0, 0, 0.8)",
            padding: "20px",
            borderRadius: "12px",
            color: "#fff",
            fontSize: "0.9rem",
            maxWidth: "300px",
            border: "1px solid rgba(140,80,255,0.5)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              fontSize: "1.2rem",
              fontWeight: "bold",
              marginBottom: "8px",
            }}
          >
            {hoveredCountry.properties.ADMIN || hoveredCountry.properties.NAME}
          </div>
          {hoveredCountry.properties.REGION_UN && (
            <div style={{ color: "#aaa", marginBottom: "6px" }}>
              Region {hoveredCountry.properties.REGION_UN}
            </div>
          )}
          {hoveredCountry.properties.POP_EST && (
            <div style={{ color: "#aaa" }}>
              Population{" "}
              {(hoveredCountry.properties.POP_EST / 1000000).toFixed(1)} M
            </div>
          )}
        </div>
      )}

      {selectedState && (
        <div
          style={{
            position: "absolute",
            top: "100px",
            right: "20px",
            width: "400px",
            maxHeight: "80vh",
            overflowY: "auto",
            background: "rgba(0, 0, 0, 0.85)",
            padding: "24px",
            borderRadius: "16px",
            color: "#fff",
            fontSize: "0.9rem",
            border: "1px solid rgba(140,80,255,0.5)",
            backdropFilter: "blur(15px)",
          }}
        >
          <button
            onClick={() => setSelectedState(null)}
            style={{
              float: "right",
              background: "transparent",
              border: "none",
              color: "#667",
              fontSize: "1.5rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
          <div style={{ color: "#667", marginBottom: "4px" }}>
            {selectedState.country}
          </div>
          <div
            style={{
              fontSize: "1.8rem",
              fontWeight: "bold",
              marginBottom: "20px",
            }}
          >
            {selectedState.name}
          </div>

          <button
            onClick={() => setShowDetailedMap(true)}
            style={{
              width: "100%",
              padding: "16px",
              marginBottom: "20px",
              background:
                "linear-gradient(135deg, rgba(140,80,255,0.4), rgba(0,200,255,0.3))",
              border: "1px solid rgba(140,80,255,0.6)",
              borderRadius: "12px",
              color: "#fff",
              fontSize: "1.1rem",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              transition: "all 0.3s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background =
                "linear-gradient(135deg, rgba(140,80,255,0.6), rgba(0,200,255,0.5))";
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background =
                "linear-gradient(135deg, rgba(140,80,255,0.4), rgba(0,200,255,0.3))";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            🗺️ Explore Detailed Map
          </button>

          <div style={{ color: "#667", marginBottom: "8px" }}>
            📍 {selectedState.lat.toFixed(2)}°, {selectedState.lng.toFixed(2)}°
          </div>
          <div style={{ color: "#667", marginBottom: "20px" }}>
            🌍 {selectedState.country_code}
          </div>

          {loadingIntel ? (
            <div
              style={{ textAlign: "center", padding: "40px 0", color: "#667" }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🕵️</div>
              <div>Connecting to local agent...</div>
              <div style={{ fontSize: "0.8rem", marginTop: "8px" }}>
                Scouring forums for niche spots...
              </div>
            </div>
          ) : stateIntel ? (
            <>
              <div
                style={{
                  background: "rgba(140,80,255,0.15)",
                  padding: "16px",
                  borderRadius: "10px",
                  marginBottom: "20px",
                  fontStyle: "italic",
                  borderLeft: "3px solid rgba(140,80,255,0.6)",
                }}
              >
                "{stateIntel.summary}"
              </div>

              {stateIntel.sources && stateIntel.sources.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: "bold",
                      marginBottom: "12px",
                      color: "#8c50ff",
                    }}
                  >
                    Sources Analyzed
                  </div>
                  {stateIntel.sources.map((source, i) => (
                    <div
                      key={i}
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        padding: "12px",
                        borderRadius: "8px",
                        marginBottom: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div style={{ fontSize: "1.5rem" }}>
                        {source.name === "Reddit Sentiment" ? (
                          <span>🔴</span>
                        ) : source.name === "Tripadvisor Sentiment" ? (
                          <span>🦉</span>
                        ) : (
                          source.icon
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{ fontWeight: "bold", marginBottom: "2px" }}
                        >
                          {source.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#667" }}>
                          {source.type} • {source.reliability}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {stateIntel.spots && stateIntel.spots.length > 0 && (
                <>
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: "bold",
                      marginBottom: "12px",
                      color: "#8c50ff",
                    }}
                  >
                    Local Secrets
                  </div>
                  {stateIntel.spots.map((spot, i) => (
                    <div
                      key={i}
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        padding: "16px",
                        borderRadius: "10px",
                        marginBottom: "12px",
                        border: "1px solid rgba(140,80,255,0.2)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: "bold",
                          marginBottom: "8px",
                        }}
                      >
                        {spot.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#8c50ff",
                          marginBottom: "8px",
                        }}
                      >
                        {spot.category}
                      </div>
                      <div style={{ marginBottom: "8px", lineHeight: "1.5" }}>
                        {spot.why_cool}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#e57373" }}>
                        Skip: {spot.avoid}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "#667",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "12px" }}>💡</div>
              <div>Agent unavailable. Start backend server on port 3001.</div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
