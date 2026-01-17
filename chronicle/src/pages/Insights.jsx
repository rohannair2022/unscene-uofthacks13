import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { TrendingUp, Heart, Star, Calendar, Tag, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Insights() {
  const { data: entries = [] } = useQuery({
    queryKey: ['entries'],
    queryFn: () => base44.entities.Entry.list('-date'),
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const getThemeStats = () => {
    const themeCount = {};
    entries.forEach(entry => {
      entry.themes?.forEach(theme => {
        themeCount[theme] = (themeCount[theme] || 0) + 1;
      });
    });
    return Object.entries(themeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  const getMoodStats = () => {
    const moodCount = {};
    entries.forEach(entry => {
      if (entry.mood) {
        moodCount[entry.mood] = (moodCount[entry.mood] || 0) + 1;
      }
    });
    return Object.entries(moodCount).sort(([,a], [,b]) => b - a);
  };

  const getMilestones = () => {
    return entries.filter(e => e.milestone).length;
  };

  const getRecentMood = () => {
    const recent = entries.slice(0, 5);
    const moods = recent.map(e => e.mood).filter(Boolean);
    if (moods.length === 0) return null;
    
    const counts = {};
    moods.forEach(m => counts[m] = (counts[m] || 0) + 1);
    return Object.entries(counts).sort(([,a], [,b]) => b - a)[0][0];
  };

  const themeStats = getThemeStats();
  const moodStats = getMoodStats();
  const milestones = getMilestones();
  const recentMood = getRecentMood();

  const moodEmojis = {
    joyful: '😊',
    peaceful: '😌',
    reflective: '🤔',
    challenged: '💪',
    grateful: '🙏',
    uncertain: '😕'
  };

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold text-white mb-2 text-glow">Your Insights</h1>
        <p className="text-slate-400 mb-8">Patterns and discoveries from your journey</p>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Entries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 hover-glow p-6">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-8 h-8 text-theme" />
              <div className="text-3xl font-bold text-white">{entries.length}</div>
            </div>
            <div className="text-slate-400">Total Entries</div>
          </Card>
        </motion.div>

        {/* Milestones */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 hover-glow p-6">
            <div className="flex items-center justify-between mb-4">
              <Star className="w-8 h-8 text-yellow-400" />
              <div className="text-3xl font-bold text-white">{milestones}</div>
            </div>
            <div className="text-slate-400">Milestone Moments</div>
          </Card>
        </motion.div>

        {/* Writing Streak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 hover-glow p-6">
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-8 h-8 text-orange-400" />
              <div className="text-3xl font-bold text-white">{user?.writing_streak || 0}</div>
            </div>
            <div className="text-slate-400">Day Streak</div>
          </Card>
        </motion.div>
      </div>

      {/* Top Themes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-slate-900/50 border-slate-800 glow-soft p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Tag className="w-6 h-6 text-theme" />
            <h2 className="text-xl font-semibold text-white">Top Themes</h2>
          </div>
          {themeStats.length > 0 ? (
            <div className="space-y-4">
              {themeStats.map(([theme, count], index) => (
                <div key={theme}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300 capitalize">{theme}</span>
                    <span className="text-theme font-semibold">{count} entries</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-theme-solid h-2 rounded-full transition-all"
                      style={{ width: `${(count / entries.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">Start writing to see your themes</p>
          )}
        </Card>
      </motion.div>

      {/* Mood Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-slate-900/50 border-slate-800 glow-soft p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Heart className="w-6 h-6 text-theme" />
            <h2 className="text-xl font-semibold text-white">Emotional Journey</h2>
          </div>
          {recentMood && (
            <div className="mb-6 p-4 bg-theme/10 border border-glow rounded-lg">
              <div className="text-sm text-slate-400 mb-1">Recent Mood Trend</div>
              <div className="text-2xl">
                {moodEmojis[recentMood]} {recentMood}
              </div>
            </div>
          )}
          {moodStats.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {moodStats.map(([mood, count]) => (
                <div key={mood} className="bg-slate-800/30 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">{moodEmojis[mood] || '📝'}</div>
                  <div className="text-slate-300 capitalize mb-1">{mood}</div>
                  <div className="text-sm text-slate-500">{count} entries</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">Start writing to track your moods</p>
          )}
        </Card>
      </motion.div>

      {/* Growth Indicator */}
      {entries.length >= 5 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-gradient-to-br from-theme/20 to-theme/5 border-glow p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-theme" />
              <h2 className="text-xl font-semibold text-white">Keep Going!</h2>
            </div>
            <p className="text-slate-300">
              You've documented {entries.length} moments of your life. Every entry is a step toward understanding yourself better.
            </p>
          </Card>
        </motion.div>
      )}
    </div>
  );
}