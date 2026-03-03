import React, { useState } from 'react';
import { Search, Loader2, BookOpen, Quote, Plus, ChevronRight } from 'lucide-react';
import api from '../api';
import { useEditorStore } from '../store';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

export default function NexusSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const addElement = useEditorStore((state) => state.addElement);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSummary(null);
    try {
      const { data } = await api.post('/research/search', { query });
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!results?.text) return;
    setSummarizing(true);
    try {
      const { data } = await api.post('/research/summarize', { content: results.text });
      setSummary(data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setSummarizing(false);
    }
  };

  const handleInsertToEditor = (content: string) => {
    addElement({
      type: 'text',
      content,
      fontSize: 14,
      width: 400
    });
  };

  return (
    <div className="h-full flex flex-col bg-stone-50 border-r border-stone-200 overflow-hidden">
      <div className="p-6 border-bottom border-stone-200 bg-white shadow-sm">
        <h2 className="text-2xl font-serif italic mb-4 text-stone-900">NEXUSSEARCH</h2>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Research anything..."
            className="w-full pl-10 pr-4 py-3 bg-stone-100 border-none rounded-xl focus:ring-2 focus:ring-stone-400 transition-all outline-none text-stone-800"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
          <button 
            type="submit" 
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-64 text-stone-400"
            >
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p className="text-sm font-mono uppercase tracking-widest">Scanning Global Data...</p>
            </motion.div>
          ) : results ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-stone-500">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-xs font-mono uppercase tracking-wider">AI Synthesis</span>
                  </div>
                  <button 
                    onClick={handleSummarize}
                    disabled={summarizing}
                    className="text-xs bg-stone-100 px-3 py-1.5 rounded-full hover:bg-stone-200 transition-colors flex items-center gap-2"
                  >
                    {summarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Quote className="w-3 h-3" />}
                    Summarize
                  </button>
                </div>
                
                <div className="prose prose-stone prose-sm max-w-none mb-4">
                  <ReactMarkdown>{results.text}</ReactMarkdown>
                </div>

                <button 
                  onClick={() => handleInsertToEditor(results.text)}
                  className="w-full py-2 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Insert to Editor
                </button>
              </div>

              {summary && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100"
                >
                  <h3 className="text-emerald-900 font-serif italic mb-3">AI Summary</h3>
                  <div className="prose prose-emerald prose-sm max-w-none text-emerald-800">
                    <ReactMarkdown>{summary}</ReactMarkdown>
                  </div>
                </motion.div>
              )}

              {results.sources?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-stone-400 px-1">Sources</h3>
                  {results.sources.map((source: any, idx: number) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-stone-100 hover:border-stone-300 transition-all group">
                      <a 
                        href={source.web?.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-sm font-medium text-stone-900 group-hover:text-stone-600 block mb-1"
                      >
                        {source.web?.title || 'Source Link'}
                      </a>
                      <p className="text-xs text-stone-400 truncate">{source.web?.uri}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-stone-300">
              <Search className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm italic font-serif">Enter a topic to begin your research</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
