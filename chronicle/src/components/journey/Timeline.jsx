import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { Award, Calendar } from 'lucide-react';

const moodEmojis = {
  joyful: '😊',
  peaceful: '😌',
  reflective: '🤔',
  challenged: '💪',
  grateful: '🙏',
  uncertain: '😕'
};

const moodColors = {
  joyful: 'bg-green-500',
  peaceful: 'bg-blue-500',
  reflective: 'bg-purple-500',
  challenged: 'bg-orange-500',
  grateful: 'bg-pink-500',
  uncertain: 'bg-slate-500'
};

export default function Timeline({ entries }) {
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  // Group entries by month
  const groupByMonth = () => {
    const grouped = {};
    entries.forEach(entry => {
      const monthKey = format(parseISO(entry.date), 'MMMM yyyy');
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(entry);
    });
    return Object.entries(grouped).reverse();
  };

  // Get timeline stats
  const getStats = () => {
    if (entries.length === 0) return { duration: 0, avgPerMonth: 0 };
    
    const dates = entries.map(e => parseISO(e.date));
    const earliest = new Date(Math.min(...dates));
    const latest = new Date(Math.max(...dates));
    const duration = differenceInDays(latest, earliest);
    
    const months = eachMonthOfInterval({ start: earliest, end: latest }).length;
    const avgPerMonth = (entries.length / Math.max(months, 1)).toFixed(1);
    
    return { duration, avgPerMonth };
  };

  const monthlyGroups = groupByMonth();
  const stats = getStats();

  // Filter entries by period
  const filterByPeriod = (entries) => {
    if (selectedPeriod === 'all') return entries;
    
    const now = new Date();
    const monthsAgo = parseInt(selectedPeriod);
    const cutoff = new Date(now.setMonth(now.getMonth() - monthsAgo));
    
    return entries.filter(e => parseISO(e.date) >= cutoff);
  };

  const filteredGroups = monthlyGroups
    .map(([month, entries]) => [month, filterByPeriod(entries)])
    .filter(([, entries]) => entries.length > 0);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Timeline */}
      <div className="lg:col-span-2 space-y-6">
        {/* Filters */}
        <Card className="bg-slate-900/50 border-slate-800 p-4">
          <div className="flex flex-wrap gap-2">
            {['all', '3', '6', '12'].map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  selectedPeriod === period
                    ? 'bg-theme text-white glow-soft'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {period === 'all' ? 'All Time' : `Last ${period} months`}
              </button>
            ))}
          </div>
        </Card>

        {/* Timeline Events */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-theme/50 to-transparent" />

          <div className="space-y-8">
            {filteredGroups.map(([month, monthEntries], monthIdx) => (
              <motion.div
                key={month}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: monthIdx * 0.05 }}
              >
                {/* Month header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-theme flex items-center justify-center glow-soft relative z-10">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{month}</h3>
                    <p className="text-sm text-slate-500">{monthEntries.length} entries</p>
                  </div>
                </div>

                {/* Entries */}
                <div className="ml-16 space-y-3">
                  {monthEntries.map((entry, idx) => (
                    <motion.button
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      whileHover={{ scale: 1.02 }}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        selectedEntry?.id === entry.id
                          ? 'bg-theme/20 border-glow'
                          : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{moodEmojis[entry.mood] || '📝'}</span>
                          <span className="text-sm text-slate-500">
                            {format(parseISO(entry.date), 'MMM d')}
                          </span>
                          {entry.milestone && (
                            <Award className="w-4 h-4 text-yellow-400" />
                          )}
                        </div>
                        <div className={`w-2 h-2 rounded-full ${moodColors[entry.mood] || 'bg-slate-500'}`} />
                      </div>
                      
                      {entry.title && (
                        <div className="font-medium text-white mb-1">{entry.title}</div>
                      )}
                      
                      <p className="text-sm text-slate-400 line-clamp-2">
                        {entry.content}
                      </p>

                      {entry.themes && entry.themes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {entry.themes.slice(0, 3).map(theme => (
                            <Badge key={theme} variant="outline" className="border-slate-600 text-slate-400 text-xs">
                              {theme}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Stats */}
        <Card className="bg-slate-900/50 border-slate-800 glow-soft p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Journey Stats</h3>
          <div className="space-y-4">
            <div>
              <div className="text-2xl font-bold text-theme">{entries.length}</div>
              <div className="text-sm text-slate-500">Total Entries</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-theme">{stats.duration}</div>
              <div className="text-sm text-slate-500">Days Documented</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-theme">{stats.avgPerMonth}</div>
              <div className="text-sm text-slate-500">Avg. per Month</div>
            </div>
          </div>
        </Card>

        {/* Selected Entry Detail */}
        {selectedEntry ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-slate-900/50 border-slate-800 glow-soft p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Entry Details</h3>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Date</div>
                  <div className="text-white">
                    {format(parseISO(selectedEntry.date), 'MMMM d, yyyy')}
                  </div>
                </div>

                {selectedEntry.title && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Title</div>
                    <div className="text-white font-medium">{selectedEntry.title}</div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-slate-500 mb-1">Mood</div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{moodEmojis[selectedEntry.mood]}</span>
                    <span className="text-white capitalize">{selectedEntry.mood}</span>
                  </div>
                </div>

                {selectedEntry.lessons_learned && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Lessons Learned</div>
                    <div className="text-slate-300 text-sm">{selectedEntry.lessons_learned}</div>
                  </div>
                )}

                {selectedEntry.ai_insights && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">AI Insights</div>
                    <div className="text-slate-300 text-sm italic bg-theme/10 p-3 rounded-lg">
                      {selectedEntry.ai_insights}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ) : (
          <Card className="bg-slate-900/50 border-slate-800 p-6">
            <div className="text-center text-slate-500 py-8">
              Click on an entry to view details
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}