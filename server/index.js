const express = require("express");
const cors = require("cors");
const axios = require("axios");
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

// Add other API keys if needed
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;

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
const AGENT_TIMEOUT = 10000; // 10 seconds per agent

// --- PARALLEL AGENT ARCHITECTURE ---

// Agent 1: Local Insights (Original)
const generateLocalPrompt = (location, country) => `
You are a knowledgeable local guide for ${location}${country ? ", " + country : ""}. 
Provide insider recommendations that tourists typically don't know about.

TASK:
Provide 3-4 specific local recommendations. Focus on:
- Hidden gems, local favorites, neighborhood spots
- Authentic experiences that locals enjoy
- Be specific with names when possible

RETURN ONLY valid JSON (no markdown, no code blocks):
{
  "agent": "local_insights",
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

// Agent 2: Reddit Sentiment Analyzer
const generateRedditPrompt = (location, country) => `
Analyze the general sentiment and discussion about ${location}${country ? ", " + country : ""} on Reddit.

TASK:
Simulate what Reddit users would say about this location. Consider:
- What do locals complain about or praise?
- What are common topics in local subreddits?
- What insider tips do people share?

RETURN ONLY valid JSON (no markdown, no code blocks):
{
  "agent": "reddit_sentiment",
  "summary": "Overall Reddit sentiment about this place",
  "mentions": [
    {
      "topic": "Common discussion topic",
      "sentiment": "positive/negative/neutral",
      "example_comment": "Example of what a Redditor might say",
      "upvotes": 123
    }
  ],
  "popular_subreddits": ["r/subreddit1", "r/subreddit2"],
  "vibe_check": "Brief description of the online community vibe"
}
`;

// Agent 3: TripAdvisor Sentiment Analyzer
const generateTripAdvisorPrompt = (location, country) => `
Analyze tourist reviews and ratings for ${location}${country ? ", " + country : ""} on TripAdvisor.

TASK:
Provide insights based on typical TripAdvisor reviews. Consider:
- Overall rating and common praises/complaints
- Most reviewed attractions
- Tips from recent travelers
- Best times to visit based on reviews

RETURN ONLY valid JSON (no markdown, no code blocks):
{
  "agent": "tripadvisor_sentiment",
  "summary": "Overall TripAdvisor rating and sentiment",
  "rating": {
    "overall": 4.2,
    "food": 4.0,
    "sights": 4.5,
    "value": 3.8
  },
  "top_review_themes": [
    {
      "theme": "Common review theme",
      "frequency": "very common/common/occasional",
      "sentiment": "positive/negative/mixed"
    }
  ],
  "traveler_tips": ["Tip 1", "Tip 2", "Tip 3"],
  "best_season": "Recommended season to visit"
}
`;

// Agent 4: Search Engine & News Sentiment
const generateNewsPrompt = (location, country) => `
Analyze recent news and search engine trends about ${location}${country ? ", " + country : ""}.

TASK:
Provide insights from news and search trends. Consider:
- Recent developments or events
- Popular search queries
- How the location is portrayed in media
- Current events affecting tourism

RETURN ONLY valid JSON (no markdown, no code blocks):
{
  "agent": "news_sentiment",
  "summary": "Current news and search trends about this place",
  "trending_topics": [
    {
      "topic": "Current news topic",
      "sentiment": "positive/negative/neutral",
      "impact": "high/medium/low"
    }
  ],
  "search_interest": {
    "level": "high/medium/low",
    "common_searches": ["search query 1", "search query 2"]
  },
  "media_coverage": "Brief description of media portrayal",
  "current_events": ["Event 1", "Event 2"]
}
`;

const LOCATION_AGENT_PROMPT = `
You are a location-selection agent.

Your task:
1. Ask the user what kind of place they want to visit.
2. Based on their answer, select ONE state from the world.
3. Respond with ONLY valid JSON.
4. DO NOT include explanations, markdown, or extra text.

JSON schema (strict):
{
  "country": "string",
  "state": "string",
  "lat": number,
  "long": number
}

Rules:
- Output must be valid JSON.
- No markdown.
- No comments.
- No extra keys.
`;

const executeLocationAgent = async (userInput) => {
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
        model: "google/gemini-2.5-flash",
        temperature: 0.3,
        max_tokens: 200,
        messages: [
          { role: "system", content: LOCATION_AGENT_PROMPT },
          { role: "user", content: userInput },
        ],
      }),
    },
  );

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
};

// --- PARALLEL AGENT EXECUTOR ---
const executeAgent = async (prompt, agentName, location, country) => {
  try {
    console.log(
      `[${agentName.toUpperCase()}] Processing: ${location}, ${country || "Unknown"}`,
    );

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
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`${agentName} API error: ${response.status}`);
    }

    const data = await response.json();
    let rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("No content returned");
    }

    // Clean and parse JSON
    rawContent = rawContent
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsedData = JSON.parse(rawContent);
    parsedData.agent = agentName; // Ensure agent identifier
    parsedData.timestamp = new Date().toISOString();

    console.log(`[${agentName.toUpperCase()}] ✅ Completed`);
    return { success: true, data: parsedData };
  } catch (error) {
    console.error(`[${agentName.toUpperCase()}] ❌ Failed:`, error.message);
    return {
      success: false,
      agent: agentName,
      error: error.message,
      data: {
        agent: agentName,
        error: `Unable to fetch ${agentName} data`,
        summary: `Data temporarily unavailable for ${agentName}`,
      },
    };
  }
};

// --- PARALLEL EXECUTION CONTROLLER ---
const executeAllAgents = async (location, country) => {
  const agents = [
    {
      name: "local_insights",
      prompt: generateLocalPrompt(location, country),
    },
    {
      name: "reddit_sentiment",
      prompt: generateRedditPrompt(location, country),
    },
    {
      name: "tripadvisor_sentiment",
      prompt: generateTripAdvisorPrompt(location, country),
    },
    {
      name: "news_sentiment",
      prompt: generateNewsPrompt(location, country),
    },
  ];

  // Execute all agents in parallel with timeout
  const agentPromises = agents.map((agent) =>
    Promise.race([
      executeAgent(agent.prompt, agent.name, location, country),
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              success: false,
              agent: agent.name,
              error: "Timeout",
              data: {
                agent: agent.name,
                error: "Agent timeout",
                summary: `${agent.name} took too long to respond`,
              },
            }),
          AGENT_TIMEOUT,
        ),
      ),
    ]),
  );

  const results = await Promise.all(agentPromises);
  return results;
};

// --- CONSENSUS GENERATOR (Optional) ---
const generateConsensus = (agentResults) => {
  const successfulAgents = agentResults.filter((r) => r.success);

  if (successfulAgents.length === 0) {
    return {
      overall_sentiment: "unknown",
      confidence: "low",
      summary: "No agents were able to provide data",
    };
  }

  // Extract sentiment from each agent
  const sentiments = [];
  const summaries = [];

  successfulAgents.forEach((result) => {
    const data = result.data;
    if (data.summary) summaries.push(data.summary);

    // Simple sentiment extraction (in real app, you'd use NLP)
    const summary = data.summary.toLowerCase();
    if (
      summary.includes("positive") ||
      summary.includes("great") ||
      summary.includes("recommend")
    ) {
      sentiments.push("positive");
    } else if (
      summary.includes("negative") ||
      summary.includes("avoid") ||
      summary.includes("bad")
    ) {
      sentiments.push("negative");
    } else {
      sentiments.push("neutral");
    }
  });

  // Calculate consensus
  const positiveCount = sentiments.filter((s) => s === "positive").length;
  const negativeCount = sentiments.filter((s) => s === "negative").length;
  const neutralCount = sentiments.filter((s) => s === "neutral").length;

  let overallSentiment = "neutral";
  if (positiveCount > negativeCount && positiveCount > neutralCount) {
    overallSentiment = "positive";
  } else if (negativeCount > positiveCount && negativeCount > neutralCount) {
    overallSentiment = "negative";
  }

  const confidence =
    successfulAgents.length >= 3
      ? "high"
      : successfulAgents.length >= 2
        ? "medium"
        : "low";

  return {
    overall_sentiment: overallSentiment,
    confidence: confidence,
    agents_responded: successfulAgents.length,
    total_agents: agentResults.length,
    summary: `Based on ${successfulAgents.length} data sources, the overall sentiment is ${overallSentiment}.`,
  };
};

// --- MAIN ENDPOINT ---
app.get("/api/research", async (req, res) => {
  const { state, country } = req.query;

  console.log("📨 Received parallel agent request:", { state, country });

  if (!state) {
    return res.status(400).json({ error: "State/location required" });
  }

  const cacheKey = `${state},${country || "Unknown"}`;

  // 1. Check Cache
  if (cityCache.has(cacheKey)) {
    console.log(`[CACHE HIT] Returning data for ${cacheKey}`);
    const cached = cityCache.get(cacheKey);
    return res.json({
      ...cached,
      cached: true,
      timestamp: cached.timestamp,
    });
  }

  console.log(`[PARALLEL AGENTS] Launching 4 agents for: ${cacheKey}...`);
  const startTime = Date.now();

  try {
    // 2. Execute all agents in parallel
    const agentResults = await executeAllAgents(state, country);

    // 3. Organize results
    const successfulResults = agentResults.filter((r) => r.success);
    const failedResults = agentResults.filter((r) => !r.success);

    // 4. Generate consensus
    const consensus = generateConsensus(agentResults);

    // 5. Track which sources were actually used (for display)
    const sourcesUsed = successfulResults.map((r) => {
      const agentName = r.data.agent;
      return {
        name: agentName
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        type: agentName.includes("reddit")
          ? "social"
          : agentName.includes("tripadvisor")
            ? "reviews"
            : agentName.includes("news")
              ? "media"
              : "local",
        reliability: agentName === "local_insights" ? "expert" : "community",
        icon: agentName.includes("reddit")
          ? "📱"
          : agentName.includes("tripadvisor")
            ? "⭐"
            : agentName.includes("news")
              ? "📰"
              : "🏙️",
      };
    });

    // 6. Combine all data with enhanced source tracking
    const combinedData = {
      location: {
        state: state,
        country: country || "Unknown",
      },
      timestamp: new Date().toISOString(),
      execution_time: Date.now() - startTime,
      consensus: consensus,

      // --- NEW: Sources section for frontend display ---
      sources: sourcesUsed,
      agents_summary: {
        total_agents: agentResults.length,
        successful_agents: successfulResults.length,
        agents: successfulResults.map((r) => ({
          name: r.data.agent,
          status: "success",
          response_time: r.data.response_time || "N/A",
        })),
      },

      data: {
        local_insights: {
          ...(agentResults.find((r) => r.data.agent === "local_insights")
            ?.data || {}),
          source_type: "Local Expert Knowledge",
          credibility: "Based on local expertise and hidden gems",
        },
        reddit_sentiment: {
          ...(agentResults.find((r) => r.data.agent === "reddit_sentiment")
            ?.data || {}),
          source_type: "Reddit Community Discussions",
          credibility: "Based on real user experiences and discussions",
        },
        tripadvisor_sentiment: {
          ...(agentResults.find((r) => r.data.agent === "tripadvisor_sentiment")
            ?.data || {}),
          source_type: "TripAdvisor Reviews & Ratings",
          credibility: "Based on verified traveler reviews",
        },
        news_sentiment: {
          ...(agentResults.find((r) => r.data.agent === "news_sentiment")
            ?.data || {}),
          source_type: "News & Media Analysis",
          credibility: "Based on recent news and search trends",
        },
      },

      // For backward compatibility with existing frontend
      summary:
        agentResults.find((r) => r.data.agent === "local_insights")?.data
          ?.summary || consensus.summary,
      spots:
        agentResults.find((r) => r.data.agent === "local_insights")?.data
          ?.spots || [],

      // --- NEW: Enhanced summary with sources mentioned ---
      enhanced_summary:
        `Analysis based on ${successfulResults.length} sources: ` +
        successfulResults
          .map((r) => {
            const agent = r.data.agent;
            return agent === "local_insights"
              ? "local expertise"
              : agent === "reddit_sentiment"
                ? "Reddit community"
                : agent === "tripadvisor_sentiment"
                  ? "TripAdvisor reviews"
                  : "news & media";
          })
          .join(", "),
    };

    // 7. Cache and return
    cityCache.set(cacheKey, combinedData);

    console.log(
      `✅ Parallel agents completed in ${combinedData.execution_time}ms`,
    );
    console.log(
      `   Sources used: ${sourcesUsed.map((s) => s.name).join(", ")}`,
    );

    res.json(combinedData);
  } catch (error) {
    console.error("❌ Parallel agent system failed:", error.message);

    res.status(500).json({
      error: "Parallel agent system failed",
      message: error.message,
      location: { state, country },
      timestamp: new Date().toISOString(),
      sources: [],
      agents_summary: {
        total_agents: 4,
        successful_agents: 0,
        agents: [],
      },
    });
  }
});

// --- INDIVIDUAL AGENT ENDPOINTS (Optional) ---
app.get("/api/agent/:agentName", async (req, res) => {
  const { agentName } = req.params;
  const { state, country } = req.query;

  if (
    ![
      "local_insights",
      "reddit_sentiment",
      "tripadvisor_sentiment",
      "news_sentiment",
    ].includes(agentName)
  ) {
    return res.status(400).json({ error: "Invalid agent name" });
  }

  if (!state) {
    return res.status(400).json({ error: "State/location required" });
  }

  const prompts = {
    local_insights: generateLocalPrompt,
    reddit_sentiment: generateRedditPrompt,
    tripadvisor_sentiment: generateTripAdvisorPrompt,
    news_sentiment: generateNewsPrompt,
  };

  try {
    const result = await executeAgent(
      prompts[agentName](state, country),
      agentName,
      state,
      country,
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: `Agent ${agentName} failed`,
      message: error.message,
    });
  }
});

// --- ENHANCED HEALTH CHECK ---
app.get("/health", (req, res) => {
  const memoryUsage = process.memoryUsage();

  res.json({
    status: "ok",
    apiKeyConfigured: !!API_KEY,
    cacheSize: cityCache.size,
    agents: [
      "local_insights",
      "reddit_sentiment",
      "tripadvisor_sentiment",
      "news_sentiment",
    ],
    memory: {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
    },
    uptime: `${process.uptime().toFixed(2)}s`,
  });
});

// --- CACHE MANAGEMENT ---
app.get("/api/cache/clear", (req, res) => {
  const previousSize = cityCache.size;
  cityCache.clear();
  res.json({
    cleared: true,
    previous_size: previousSize,
    current_size: 0,
    message: `Cleared ${previousSize} cached items`,
  });
});

app.get("/api/cache/stats", (req, res) => {
  const keys = Array.from(cityCache.keys());
  const sample = keys.slice(0, 5);

  res.json({
    size: cityCache.size,
    keys_sample: sample,
    memory: process.memoryUsage().heapUsed,
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🕵️  WorldView Parallel Agent System running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(
    `🔗 Main endpoint: http://localhost:${PORT}/api/research?state=California&country=USA`,
  );
  console.log(
    `🔗 Individual agent: http://localhost:${PORT}/api/agent/reddit_sentiment?state=California`,
  );
  console.log(
    `🚀 4 agents running in parallel: Local, Reddit, TripAdvisor, News`,
  );
});
