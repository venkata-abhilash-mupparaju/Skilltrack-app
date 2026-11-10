'use client';

import { useState } from 'react';
import { X, Code2, Plus, ExternalLink, Check } from 'lucide-react';
import { DsaDifficulty, DsaPlatform, DsaProblem } from '@/types';

interface QuickAddDsaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProblem: (problem: Omit<DsaProblem, 'id' | 'user_id' | 'solved_at'>) => void;
}

const COMMON_TAGS = ['Array', 'Two Pointers', 'Sliding Window', 'Binary Search', 'Linked List', 'Tree', 'Graph', 'DP', 'Stack', 'Heap'];

export function QuickAddDsaModal({ isOpen, onClose, onAddProblem }: QuickAddDsaModalProps) {
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<DsaDifficulty>('Medium');
  const [platform, setPlatform] = useState<DsaPlatform>('LeetCode');
  const [url, setUrl] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Array']);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddProblem({
      title: title.trim(),
      difficulty,
      platform,
      problem_url: url.trim() || undefined,
      tags: selectedTags,
      status: 'Solved',
      notes: notes.trim() || undefined,
    });

    setTitle('');
    setUrl('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-surface-200 hover:text-white p-1 rounded-lg"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Quick-Add Solved Problem</h3>
            <p className="text-xs text-surface-200/70">Record DSA problem & maintain your daily count</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-surface-200 mb-1 font-medium">Problem Title *</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. 3Sum, Valid Anagram, Course Schedule"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-white placeholder-surface-200/50 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-surface-200 mb-1 font-medium">Difficulty</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Easy', 'Medium', 'Hard'] as DsaDifficulty[]).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`py-2 rounded-lg font-semibold text-xs transition-all ${
                      difficulty === diff
                        ? diff === 'Easy'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : diff === 'Medium'
                          ? 'bg-amber-600 text-white shadow-md'
                          : 'bg-rose-600 text-white shadow-md'
                        : 'bg-surface-800 text-surface-200 hover:text-white border border-surface-700'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-surface-200 mb-1 font-medium">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as DsaPlatform)}
                className="w-full px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 text-white focus:outline-none focus:border-primary-500"
              >
                <option value="LeetCode">LeetCode</option>
                <option value="Codeforces">Codeforces</option>
                <option value="GeeksforGeeks">GeeksforGeeks</option>
                <option value="HackerRank">HackerRank</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-surface-200 mb-1 font-medium">Topic Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-800 text-surface-200 hover:text-white border border-surface-700/60'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-surface-200 mb-1 font-medium">Problem URL (Optional)</label>
            <input
              type="url"
              placeholder="https://leetcode.com/problems/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-800 border border-surface-700 text-white placeholder-surface-200/50 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-surface-200 mb-1 font-medium">Quick Notes / Complexity</label>
            <input
              type="text"
              placeholder="e.g. O(N) Two Pointers, careful with duplicate checks"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-800 border border-surface-700 text-white placeholder-surface-200/50 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-200 font-medium text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium text-xs shadow-md shadow-primary-600/30 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Log Problem</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
