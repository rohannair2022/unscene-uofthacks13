import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, X, Sparkles } from 'lucide-react';
import { base44 } from "@/api/base44Client";

const moods = ['joyful', 'peaceful', 'reflective', 'challenged', 'grateful', 'uncertain'];
const commonThemes = ['career', 'family', 'health', 'relationships', 'growth', 'travel', 'creativity', 'spirituality'];

export default function WriteEntry({ entry, onSave, onCancel, isProcessing }) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0],
    mood: 'reflective',
    themes: [],
    milestone: false,
    lessons_learned: '',
    ai_insights: ''
  });
  const [generatingInsights, setGeneratingInsights] = useState(false);

  useEffect(() => {
    if (entry) {
      setFormData({
        title: entry.title || '',
        content: entry.content || '',
        date: entry.date || new Date().toISOString().split('T')[0],
        mood: entry.mood || 'reflective',
        themes: entry.themes || [],
        milestone: entry.milestone || false,
        lessons_learned: entry.lessons_learned || '',
        ai_insights: entry.ai_insights || ''
      });
    }
  }, [entry]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTheme = (theme) => {
    setFormData(prev => ({
      ...prev,
      themes: prev.themes.includes(theme)
        ? prev.themes.filter(t => t !== theme)
        : [...prev.themes, theme]
    }));
  };

  const generateAIInsights = async () => {
    if (!formData.content || formData.content.length < 50) return;
    
    setGeneratingInsights(true);
    try {
      const { data } = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this journal entry and provide brief, meaningful insights (2-3 sentences). Focus on patterns, growth opportunities, or hidden themes:\n\n${formData.content}`,
      });
      handleChange('ai_insights', data);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setGeneratingInsights(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-8"
    >
      <Card className="bg-slate-900/50 border-slate-800 glow-soft p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {entry ? 'Edit Entry' : 'New Entry'}
            </h2>
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-300">Title (Optional)</Label>
              <Input
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Give this entry a title..."
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">What's on your mind?</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="Write about your day, your thoughts, your dreams... This is your space."
              rows={10}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 resize-none"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">How are you feeling?</Label>
            <div className="flex flex-wrap gap-2">
              {moods.map(mood => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => handleChange('mood', mood)}
                  className={`px-4 py-2 rounded-lg capitalize transition-all ${
                    formData.mood === mood
                      ? 'bg-theme text-white glow-soft'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Themes</Label>
            <div className="flex flex-wrap gap-2">
              {commonThemes.map(theme => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => toggleTheme(theme)}
                  className={`px-3 py-1.5 rounded-lg capitalize text-sm transition-all ${
                    formData.themes.includes(theme)
                      ? 'bg-theme text-white border-glow'
                      : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Lessons Learned (Optional)</Label>
            <Textarea
              value={formData.lessons_learned}
              onChange={(e) => handleChange('lessons_learned', e.target.value)}
              placeholder="What did you learn from this experience?"
              rows={3}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">AI Insights</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateAIInsights}
                disabled={generatingInsights || !formData.content}
                className="border-slate-700 text-theme hover:bg-theme/10"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generatingInsights ? 'Generating...' : 'Generate Insights'}
              </Button>
            </div>
            {formData.ai_insights && (
              <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 text-slate-300 italic">
                {formData.ai_insights}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="milestone"
              checked={formData.milestone}
              onChange={(e) => handleChange('milestone', e.target.checked)}
              className="w-5 h-5 rounded bg-slate-800 border-slate-700"
            />
            <Label htmlFor="milestone" className="text-slate-300 cursor-pointer">
              Mark as milestone moment
            </Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isProcessing}
              className="bg-theme-solid hover-glow text-white flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {isProcessing ? 'Saving...' : entry ? 'Update Entry' : 'Save Entry'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-slate-700 text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}