import React, { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Music, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ambientTracks = [
  { name: 'Peaceful Flow', url: 'https://assets.mixkit.co/music/preview/mixkit-piano-reflections-125.mp3' },
  { name: 'Meditation', url: 'https://assets.mixkit.co/music/preview/mixkit-meditation-flute-melody-125.mp3' },
  { name: 'Dreamy', url: 'https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3' },
];

export default function MusicPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [volume, setVolume] = useState(30);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const changeTrack = (index) => {
    setCurrentTrack(index);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.load();
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={ambientTracks[currentTrack].url}
        loop
        onEnded={() => setIsPlaying(false)}
      />

      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="mb-4"
            >
              <Card className="bg-slate-900/95 border-slate-800 backdrop-blur-xl p-4 w-64 glow-soft">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-medium">Ambient Music</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsMuted(!isMuted)}
                      className="h-8 w-8"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {ambientTracks.map((track, idx) => (
                      <button
                        key={idx}
                        onClick={() => changeTrack(idx)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                          currentTrack === idx
                            ? 'bg-theme text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {track.name}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-slate-400">Volume</div>
                    <Slider
                      value={[volume]}
                      onValueChange={([v]) => setVolume(v)}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 rounded-full bg-theme flex items-center justify-center glow hover-glow shadow-2xl"
        >
          <Music className="w-6 h-6 text-white" />
        </motion.button>

        {!isOpen && (
          <motion.button
            onClick={togglePlay}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-slate-900 border-2 border-theme flex items-center justify-center"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-white ml-0.5" />
            )}
          </motion.button>
        )}
      </motion.div>
    </>
  );
}