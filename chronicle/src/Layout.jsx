import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from "@/api/base44Client";
import { BookOpen, Sparkles, Settings, TrendingUp, Compass } from 'lucide-react';
import MusicPlayer from './components/MusicPlayer';

const themeColors = {
  purple: { primary: '147, 51, 234', name: 'Purple' },
  blue: { primary: '59, 130, 246', name: 'Blue' },
  pink: { primary: '236, 72, 153', name: 'Pink' },
  green: { primary: '34, 197, 94', name: 'Green' },
  orange: { primary: '249, 115, 22', name: 'Orange' },
  red: { primary: '239, 68, 68', name: 'Red' },
  teal: { primary: '20, 184, 166', name: 'Teal' },
  indigo: { primary: '99, 102, 241', name: 'Indigo' }
};

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [themeColor, setThemeColor] = useState('purple');
  const [customColor, setCustomColor] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      if (userData.theme_color) {
        setThemeColor(userData.theme_color);
      }
      if (userData.custom_color) {
        setCustomColor(userData.custom_color);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const getColorRGB = () => {
    if (customColor) {
      const hex = customColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `${r}, ${g}, ${b}`;
    }
    return themeColors[themeColor]?.primary || themeColors.purple.primary;
  };

  const colorRGB = getColorRGB();

  const navItems = [
    { name: 'Journal', icon: BookOpen, page: 'Journal' },
    { name: 'Journey', icon: Compass, page: 'Journey' },
    { name: 'Insights', icon: TrendingUp, page: 'Insights' },
    { name: 'AI Chat', icon: Sparkles, page: 'AIChat' },
    { name: 'Settings', icon: Settings, page: 'Settings' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <style>{`
        :root {
          --theme-color: ${colorRGB};
        }
        
        .glow {
          box-shadow: 0 0 20px rgba(var(--theme-color), 0.3),
                      0 0 40px rgba(var(--theme-color), 0.2),
                      0 0 60px rgba(var(--theme-color), 0.1);
        }
        
        .glow-soft {
          box-shadow: 0 0 15px rgba(var(--theme-color), 0.2),
                      0 0 30px rgba(var(--theme-color), 0.1);
        }
        
        .text-glow {
          text-shadow: 0 0 20px rgba(var(--theme-color), 0.5);
        }
        
        .border-glow {
          border-color: rgba(var(--theme-color), 0.5);
          box-shadow: 0 0 10px rgba(var(--theme-color), 0.3);
        }

        .bg-theme {
          background-color: rgba(var(--theme-color), 0.1);
        }

        .bg-theme-solid {
          background-color: rgb(var(--theme-color));
        }

        .text-theme {
          color: rgb(var(--theme-color));
        }

        .hover-glow {
          transition: all 0.3s ease;
        }

        .hover-glow:hover {
          box-shadow: 0 0 25px rgba(var(--theme-color), 0.4),
                      0 0 50px rgba(var(--theme-color), 0.3);
          transform: translateY(-2px);
        }
      `}</style>

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to={createPageUrl('Journal')} className="flex items-center gap-3 group">
              <div className="glow rounded-xl p-2 bg-theme">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white text-glow">Life Story</h1>
            </Link>
            
            <nav className="flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-theme text-white glow-soft' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:inline">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>

      {/* Ambient glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ background: `radial-gradient(circle, rgb(${colorRGB}), transparent)`, animationDuration: '4s' }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ background: `radial-gradient(circle, rgb(${colorRGB}), transparent)`, animationDuration: '6s' }}
        />
        <div 
          className="absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-10"
          style={{ background: `radial-gradient(circle, rgb(${colorRGB}), transparent)`, transform: 'translate(-50%, -50%)' }}
        />
      </div>

      <MusicPlayer />
    </div>
  );
}