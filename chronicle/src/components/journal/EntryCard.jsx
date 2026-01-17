import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Award, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

const moodEmojis = {
  joyful: '😊',
  peaceful: '😌',
  reflective: '🤔',
  challenged: '💪',
  grateful: '🙏',
  uncertain: '😕'
};

export default function EntryCard({ entry, onEdit, onDelete, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="bg-slate-900/50 border-slate-800 hover-glow overflow-hidden">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{moodEmojis[entry.mood] || '📝'}</span>
                {entry.milestone && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                    <Award className="w-3 h-3 mr-1" />
                    Milestone
                  </Badge>
                )}
                <span className="text-sm text-slate-500">
                  {format(new Date(entry.date), 'MMMM d, yyyy')}
                </span>
              </div>
              
              {entry.title && (
                <h3 className="text-xl font-semibold text-white mb-2">{entry.title}</h3>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(entry)}
                className="text-slate-400 hover:text-theme"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this entry?')) {
                    onDelete();
                  }
                }}
                className="text-slate-400 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Themes */}
          {entry.themes && entry.themes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {entry.themes.map(theme => (
                <Badge key={theme} variant="outline" className="border-slate-700 text-slate-400">
                  {theme}
                </Badge>
              ))}
            </div>
          )}

          {/* Content Preview */}
          <div className="text-slate-300 mb-4">
            <p className={expanded ? '' : 'line-clamp-3'}>
              {entry.content}
            </p>
          </div>

          {entry.content && entry.content.length > 200 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-theme hover:text-theme/80 mb-4"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Read more
                </>
              )}
            </Button>
          )}

          {/* Lessons Learned */}
          {entry.lessons_learned && expanded && (
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 mb-4">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Lessons Learned</div>
              <p className="text-slate-300">{entry.lessons_learned}</p>
            </div>
          )}

          {/* AI Insights */}
          {entry.ai_insights && expanded && (
            <div className="bg-theme/10 border border-glow rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-theme" />
                <div className="text-xs text-theme uppercase tracking-wider">AI Insights</div>
              </div>
              <p className="text-slate-300 italic">{entry.ai_insights}</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}