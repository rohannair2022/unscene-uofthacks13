const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

const API_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = "http://localhost:3000";
const SITE_NAME = "WorldView";

// Validate API key on startup
if (!API_KEY) {
  console.error("❌ ERROR: OPENROUTER_API_KEY not found in .env file");
  console.log(
    "📝 Please create a .env file with: OPENROUTER_API_KEY=your_key_here",
  );
  console.log("🔑 Get your key at: https://openrouter.ai/keys");
  process.exit(1);
}

console.log("✅ API Key loaded:", API_KEY.substring(0, 10) + "...");

// --- CACHE LAYER ---
const cityCache = new Map();

// --- AGENT PROMPT GENERATOR ---
const generatePrompt = (location, country) => `
You are a knowledgeable local guide for ${location}${country ? ", " + country : ""}. 
Provide insider recommendations that tourists typically don't know about.

TASK:
Provide 3-4 specific local recommendations. Focus on:
- Hidden gems, local favorites, neighborhood spots
- Authentic experiences that locals enjoy
- Be specific with names when possible
- If this is an obscure location, make reasonable suggestions based on the region

RETURN ONLY valid JSON (no markdown, no code blocks):
{
  "summary": "One sentence about what makes this place special",
  "spots": [
    {
      "name": "Specific place name",
      "category": "Food/Bar/Park/Culture/Nature",
      "why_cool": "Why locals love it",
      "avoid": "Tourist trap to skip instead"
    }
  ]
}
`;

app.get("/api/research", async (req, res) => {
  const { state, country } = req.query;

  console.log("📨 Received request:", { state, country, fullQuery: req.query });

  if (!state) {
    console.log("❌ Missing state parameter");
    return res.status(400).json({ error: "State required" });
  }

  const cacheKey = `${state}, ${country || "Unknown"}`;

  // 1. Check Cache
  if (cityCache.has(cacheKey)) {
    console.log(`[CACHE HIT] Returning data for ${cacheKey}`);
    return res.json(cityCache.get(cacheKey));
  }

  console.log(`[AGENT] Contacting Gemini via OpenRouter for: ${cacheKey}...`);

  try {
    // 2. Call OpenRouter (Gemini Model)
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "HTTP-Referer": SITE_URL,
          "X-Title": SITE_NAME,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash", // Free Gemini model
          messages: [
            {
              role: "user",
              content: generatePrompt(state, country),
            },
          ],
          temperature: 0.8,
          max_tokens: 1500,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "❌ OpenRouter Response Error:",
        response.status,
        errorText,
      );
      throw new Error(
        `OpenRouter API returned ${response.status}: ${errorText}`,
      );
    }

    const data = await response.json();

    // Error handling for the API response
    if (data.error) {
      console.error("❌ OpenRouter API Error:", data.error);
      throw new Error(data.error.message || JSON.stringify(data.error));
    }

    // 3. Parse and Clean Response
    let rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error(
        "❌ No content in response:",
        JSON.stringify(data, null, 2),
      );
      throw new Error("No content returned from API");
    }

    console.log("📦 Raw response:", rawContent.substring(0, 200) + "...");

    // Remove markdown code blocks if the model adds them
    rawContent = rawContent
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsedData = JSON.parse(rawContent);

    // 4. Validate response structure
    if (!parsedData.summary || !Array.isArray(parsedData.spots)) {
      throw new Error("Invalid response structure from AI");
    }

    // 5. Cache and Return
    cityCache.set(cacheKey, parsedData);
    console.log(`✅ Successfully processed ${cacheKey}`);
    res.json(parsedData);
  } catch (error) {
    console.error("❌ Agent Failed:", error.message);
    console.error("Stack:", error.stack);

    // Return more helpful error message
    res.status(500).json({
      summary: `Unable to fetch local insights for ${state}. The agent might be taking a break.`,
      spots: [],
      error: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    apiKeyConfigured: !!API_KEY,
    cacheSize: cityCache.size,
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🕵️  WorldView Agent running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
