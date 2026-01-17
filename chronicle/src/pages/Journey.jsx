import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from 'framer-motion';
import { Compass, Clock } from 'lucide-react';
import IdentityWheel from "../components/journey/IdentityWheel";
import Timeline from "../components/journey/Timeline";

export default function Journey() {
  const [viewMode, setViewMode] = useState('wheel');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['entries'],
    queryFn: () => base44.entities.Entry.list('-date'),
  });

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold text-white mb-2 text-glow">Your Identity Journey</h1>
        <p className="text-slate-400 mb-8">Explore the evolution of your life story</p>
      </motion.div>

      <Tabs value={viewMode} onValueChange={setViewMode} className="mb-6">
        <TabsList className="bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="wheel" className="data-[state=active]:bg-theme data-[state=active]:text-white">
            <Compass className="w-4 h-4 mr-2" />
            Identity Wheel
          </TabsTrigger>
          <TabsTrigger value="timeline" className="data-[state=active]:bg-theme data-[state=active]:text-white">
            <Clock className="w-4 h-4 mr-2" />
            Timeline
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-theme border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 mt-4">Loading your journey...</p>
        </div>
      ) : entries.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800 p-12 text-center">
          <p className="text-slate-400 text-lg">Start writing entries to visualize your journey</p>
        </Card>
      ) : (
        <>
          {viewMode === 'wheel' && <IdentityWheel entries={entries} />}
          {viewMode === 'timeline' && <Timeline entries={entries} />}
        </>
      )}
    </div>
  );
}