import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, User, Mic, MicOff, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

export default function AIChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your Life Story companion. I can help you reflect on your journey, explore patterns in your entries, or guide you through meaningful writing prompts. What would you like to talk about?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadEntries();
    initSpeech();
  }, []);

  const initSpeech = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error('Speech recognition error');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text) => {
    if (!synthRef.current) return;

    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const loadEntries = async () => {
    try {
      const data = await base44.entities.Entry.list('-date', 5);
      setEntries(data);
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    const userInput = input;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const entriesContext = entries.length > 0 
        ? entries.slice(0, 3).map(e => 
            `${e.mood || 'reflective'} entry about ${e.themes?.join(', ') || 'life'}`
          ).join('; ')
        : 'their life journey';

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a supportive life story journal companion. Context: User has written about ${entriesContext}.

User: ${userInput}

Provide brief, thoughtful guidance (2-3 sentences). Be warm and supportive.`,
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      speakText(response);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm having trouble connecting right now. Please try again in a moment." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)]">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-4xl font-bold text-white mb-2 text-glow">AI Reflection Guide</h1>
        <p className="text-slate-400">Chat with your personal reflection companion</p>
      </motion.div>

      <Card className="bg-slate-900/50 border-slate-800 glow-soft h-full flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-theme flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-theme-solid text-white'
                      : 'bg-slate-800/50 text-slate-200'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-theme flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-800/50 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex gap-2 mb-3">
            <Button
              onClick={toggleListening}
              variant="outline"
              size="sm"
              className={`border-slate-700 ${isListening ? 'bg-red-500 text-white border-red-500' : 'text-slate-400'}`}
            >
              {isListening ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
              {isListening ? 'Stop' : 'Voice'}
            </Button>
            {isSpeaking && (
              <Button
                onClick={stopSpeaking}
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-400"
              >
                <Volume2 className="w-4 h-4 mr-2 animate-pulse" />
                Stop Speaking
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask me anything about your journey..."
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 resize-none"
              rows={2}
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-theme-solid hover-glow text-white self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}