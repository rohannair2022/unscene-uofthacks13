import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const presetColors = [
  { id: 'purple', name: 'Purple Dream', color: '#9333ea' },
  { id: 'blue', name: 'Ocean Blue', color: '#3b82f6' },
  { id: 'pink', name: 'Rose Pink', color: '#ec4899' },
  { id: 'green', name: 'Forest Green', color: '#22c55e' },
  { id: 'orange', name: 'Sunset Orange', color: '#f97316' },
  { id: 'red', name: 'Ruby Red', color: '#ef4444' },
  { id: 'teal', name: 'Ocean Teal', color: '#14b8a6' },
  { id: 'indigo', name: 'Deep Indigo', color: '#6366f1' }
];

export default function Settings() {
  const [user, setUser] = useState(null);
  const [selectedColor, setSelectedColor] = useState('purple');
  const [customColor, setCustomColor] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      setSelectedColor(userData.theme_color || 'purple');
      setCustomColor(userData.custom_color || '');
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const saveTheme = async (colorId, customHex = null) => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        theme_color: colorId,
        custom_color: customHex
      });
      toast.success('Theme updated! Refresh to see changes.');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  const handlePresetSelect = (colorId) => {
    setSelectedColor(colorId);
    setCustomColor('');
    saveTheme(colorId, null);
  };

  const handleCustomColor = () => {
    if (customColor && /^#[0-9A-F]{6}$/i.test(customColor)) {
      setSelectedColor('custom');
      saveTheme('custom', customColor);
    } else {
      toast.error('Please enter a valid hex color (e.g., #FF5733)');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold text-white mb-2 text-glow">Settings</h1>
        <p className="text-slate-400 mb-8">Customize your Life Story experience</p>
      </motion.div>

      <Card className="bg-slate-900/50 border-slate-800 glow-soft p-8">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-6 h-6 text-theme" />
          <h2 className="text-2xl font-semibold text-white">Theme Color</h2>
        </div>

        <p className="text-slate-400 mb-6">
          Choose a color that resonates with your journey
        </p>

        {/* Preset Colors */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {presetColors.map((preset) => (
            <motion.button
              key={preset.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePresetSelect(preset.id)}
              className={`relative p-6 rounded-xl border-2 transition-all ${
                selectedColor === preset.id && !customColor
                  ? 'border-white shadow-lg'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
              style={{
                background: `linear-gradient(135deg, ${preset.color}33, ${preset.color}11)`
              }}
              disabled={saving}
            >
              <div
                className="w-12 h-12 rounded-full mx-auto mb-3"
                style={{
                  backgroundColor: preset.color,
                  boxShadow: `0 0 20px ${preset.color}66`
                }}
              />
              <div className="text-white font-medium text-sm">{preset.name}</div>
              {selectedColor === preset.id && !customColor && (
                <div className="absolute top-2 right-2 bg-white rounded-full p-1">
                  <Check className="w-4 h-4 text-slate-900" />
                </div>
              )}
            </motion.button>
          ))}
        </div>

        {/* Custom Color */}
        <div className="border-t border-slate-800 pt-6">
          <Label className="text-slate-300 mb-3 block">Or choose your own color</Label>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value.toUpperCase())}
                placeholder="#FF5733"
                className="bg-slate-800/50 border-slate-700 text-white font-mono"
                maxLength={7}
              />
            </div>
            <div
              className="w-12 h-12 rounded-lg border-2 border-slate-700"
              style={{
                backgroundColor: /^#[0-9A-F]{6}$/i.test(customColor) ? customColor : '#1e293b'
              }}
            />
            <Button
              onClick={handleCustomColor}
              disabled={saving || !customColor}
              className="bg-theme-solid hover-glow text-white"
            >
              Apply
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Enter a hex color code (e.g., #FF5733)
          </p>
        </div>

        {/* User Stats */}
        {user && (
          <div className="border-t border-slate-800 mt-8 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Your Journey</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-theme">{user.total_entries || 0}</div>
                <div className="text-sm text-slate-400">Total Entries</div>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-theme">{user.writing_streak || 0}</div>
                <div className="text-sm text-slate-400">Day Streak</div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}