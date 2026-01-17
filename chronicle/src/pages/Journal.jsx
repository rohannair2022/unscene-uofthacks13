import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import EntryCard from "../components/journal/EntryCard";
import WriteEntry from "../components/journal/WriteEntry";
import { motion, AnimatePresence } from "framer-motion";

export default function Journal() {
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMood, setFilterMood] = useState('all');
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['entries'],
    queryFn: () => base44.entities.Entry.list('-date'),
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const createEntry = useMutation({
    mutationFn: (data) => base44.entities.Entry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['entries']);
      queryClient.invalidateQueries(['user']);
      setShowWriteForm(false);
    },
  });

  const updateEntry = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Entry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['entries']);
      setShowWriteForm(false);
      setEditingEntry(null);
    },
  });

  const deleteEntry = useMutation({
    mutationFn: (id) => base44.entities.Entry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['entries']);
    },
  });

  const handleSave = async (entryData) => {
    if (editingEntry) {
      await updateEntry.mutateAsync({ id: editingEntry.id, data: entryData });
    } else {
      await createEntry.mutateAsync(entryData);
      
      // Update user's total entries count
      if (user) {
        await base44.auth.updateMe({
          total_entries: (user.total_entries || 0) + 1
        });
      }
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setShowWriteForm(true);
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMood = filterMood === 'all' || entry.mood === filterMood;
    return matchesSearch && matchesMood;
  });

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold text-white mb-4 text-glow"
        >
          Your Life Story
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-slate-400 text-lg"
        >
          Document your journey, one memory at a time
        </motion.p>
        
        {user && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-8 mt-6"
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-theme">{user.total_entries || 0}</div>
              <div className="text-sm text-slate-500">Entries</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-theme">{user.writing_streak || 0}</div>
              <div className="text-sm text-slate-500">Day Streak</div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <Button 
          onClick={() => {
            setEditingEntry(null);
            setShowWriteForm(!showWriteForm);
          }}
          className="bg-theme-solid hover-glow text-white font-semibold px-6 py-6 text-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Write New Entry
        </Button>
        
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your memories..."
            className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 h-12"
          />
        </div>

        <select
          value={filterMood}
          onChange={(e) => setFilterMood(e.target.value)}
          className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white"
        >
          <option value="all">All Moods</option>
          <option value="joyful">Joyful</option>
          <option value="peaceful">Peaceful</option>
          <option value="reflective">Reflective</option>
          <option value="challenged">Challenged</option>
          <option value="grateful">Grateful</option>
          <option value="uncertain">Uncertain</option>
        </select>
      </div>

      {/* Write Form */}
      <AnimatePresence>
        {showWriteForm && (
          <WriteEntry
            entry={editingEntry}
            onSave={handleSave}
            onCancel={() => {
              setShowWriteForm(false);
              setEditingEntry(null);
            }}
            isProcessing={createEntry.isPending || updateEntry.isPending}
          />
        )}
      </AnimatePresence>

      {/* Entries Timeline */}
      <div className="space-y-6 mt-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-theme border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 mt-4">Loading your memories...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
            <Calendar className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">No entries yet</p>
            <p className="text-slate-600">Start documenting your life story today!</p>
          </div>
        ) : (
          filteredEntries.map((entry, index) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onEdit={handleEdit}
              onDelete={() => deleteEntry.mutate(entry.id)}
              index={index}
            />
          ))
        )}
      </div>
    </div>
  );
}