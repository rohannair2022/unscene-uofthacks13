import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { Sparkles, TrendingUp } from 'lucide-react';

const moodColors = {
  joyful: '#22c55e',
  peaceful: '#3b82f6',
  reflective: '#8b5cf6',
  challenged: '#f97316',
  grateful: '#ec4899',
  uncertain: '#64748b'
};

export default function IdentityWheel({ entries }) {
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [hoveredSegment, setHoveredSegment] = useState(null);

  // Calculate theme distribution
  const getThemeData = () => {
    const themeCount = {};
    const themeMoods = {};
    
    entries.forEach(entry => {
      entry.themes?.forEach(theme => {
        themeCount[theme] = (themeCount[theme] || 0) + 1;
        if (!themeMoods[theme]) themeMoods[theme] = [];
        themeMoods[theme].push(entry.mood);
      });
    });

    const themes = Object.entries(themeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8);

    return themes.map(([theme, count]) => ({
      theme: theme,
      frequency: count,
      fullMark: Math.max(...Object.values(themeCount)),
      moods: themeMoods[theme]
    }));
  };

  const getMoodDistribution = (theme) => {
    const moodCount = {};
    entries.forEach(entry => {
      if (entry.themes?.includes(theme) && entry.mood) {
        moodCount[entry.mood] = (moodCount[entry.mood] || 0) + 1;
      }
    });
    return Object.entries(moodCount).sort(([,a], [,b]) => b - a);
  };

  const themeData = getThemeData();

  // Calculate overall mood balance
  const getMoodBalance = () => {
    const moodCount = {};
    entries.forEach(entry => {
      if (entry.mood) {
        moodCount[entry.mood] = (moodCount[entry.mood] || 0) + 1;
      }
    });
    return Object.entries(moodCount).map(([mood, count]) => ({
      mood,
      count,
      percentage: ((count / entries.length) * 100).toFixed(1)
    }));
  };

  const moodBalance = getMoodBalance();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="grid lg:grid-cols-2 gap-6"
    >
      {/* Radar Chart */}
      <Card className="bg-slate-900/50 border-slate-800 glow-soft p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-theme" />
          <h2 className="text-xl font-semibold text-white">Life Dimensions</h2>
        </div>
        
        {themeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={themeData}>
              <PolarGrid stroke="#475569" />
              <PolarAngleAxis 
                dataKey="theme" 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
              />
              <PolarRadiusAxis angle={90} domain={[0, 'dataMax']} tick={{ fill: '#64748b' }} />
              <Radar
                name="Frequency"
                dataKey="frequency"
                stroke="rgb(var(--theme-color))"
                fill="rgb(var(--theme-color))"
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-slate-500">
            No theme data yet
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {themeData.map(({ theme, frequency }) => (
            <button
              key={theme}
              onClick={() => setSelectedTheme(selectedTheme === theme ? null : theme)}
              onMouseEnter={() => setHoveredSegment(theme)}
              onMouseLeave={() => setHoveredSegment(null)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all capitalize ${
                selectedTheme === theme || hoveredSegment === theme
                  ? 'bg-theme text-white glow-soft'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {theme} <span className="text-xs opacity-70">({frequency})</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Theme Details / Mood Balance */}
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {selectedTheme ? (
            <motion.div
              key="theme-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-slate-900/50 border-slate-800 glow-soft p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white capitalize">{selectedTheme}</h3>
                  <Badge className="bg-theme text-white">
                    {entries.filter(e => e.themes?.includes(selectedTheme)).length} entries
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-slate-400 mb-3">Emotional Journey</div>
                    {getMoodDistribution(selectedTheme).map(([mood, count]) => (
                      <div key={mood} className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-slate-300 capitalize">{mood}</span>
                          <span className="text-sm text-slate-500">{count}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${(count / entries.filter(e => e.themes?.includes(selectedTheme)).length) * 100}%`,
                              backgroundColor: moodColors[mood] || '#8b5cf6'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                    <div className="text-sm text-slate-400 mb-2">Recent Insights</div>
                    <div className="space-y-2">
                      {entries
                        .filter(e => e.themes?.includes(selectedTheme) && e.ai_insights)
                        .slice(0, 2)
                        .map((entry, idx) => (
                          <div key={idx} className="text-xs text-slate-400 italic bg-slate-800/30 p-3 rounded-lg">
                            "{entry.ai_insights}"
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="mood-balance"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-slate-900/50 border-slate-800 glow-soft p-6">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-theme" />
                  <h3 className="text-xl font-semibold text-white">Emotional Balance</h3>
                </div>

                <div className="space-y-4">
                  {moodBalance.map(({ mood, count, percentage }) => (
                    <div key={mood}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-300 capitalize">{mood}</span>
                        <span className="text-theme font-semibold">{percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-3">
                        <div
                          className="h-3 rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: moodColors[mood] || '#8b5cf6',
                            boxShadow: `0 0 10px ${moodColors[mood]}66`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-theme/10 border border-glow rounded-lg">
                  <div className="text-sm text-slate-400">
                    Click on a theme above to explore its emotional journey
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Milestones Summary */}
        <Card className="bg-slate-900/50 border-slate-800 glow-soft p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Milestone Moments</h3>
          <div className="space-y-3">
            {entries
              .filter(e => e.milestone)
              .slice(0, 3)
              .map((entry, idx) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-slate-800/30 rounded-lg p-3"
                >
                  <div className="text-sm font-medium text-white mb-1">{entry.title || 'Untitled'}</div>
                  <div className="text-xs text-slate-500">{new Date(entry.date).toLocaleDateString()}</div>
                </motion.div>
              ))}
            {entries.filter(e => e.milestone).length === 0 && (
              <div className="text-slate-500 text-sm text-center py-4">
                No milestones marked yet
              </div>
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}