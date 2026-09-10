import React, { useState, useEffect } from 'react';
import { User, PeerChallenge, Question } from '../types';
import { fetchPeerChallenges, createPeerChallenge } from '../api';
import { Swords, Trophy, Users, CheckCircle2, Play, Plus, X, Zap } from 'lucide-react';

interface PeerChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onStartQuiz: (questions: Question[], title: string) => void;
}

export function PeerChallengeModal({ isOpen, onClose, currentUser, onStartQuiz }: PeerChallengeModalProps) {
  const [challenges, setChallenges] = useState<PeerChallenge[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('General Science');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadChallenges();
    }
  }, [isOpen]);

  const loadChallenges = async () => {
    try {
      const data = await fetchPeerChallenges();
      setChallenges(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newChal = await createPeerChallenge(
        title || `${subject} 1v1 Battle`,
        subject,
        'usr-demo-1'
      );
      setShowCreate(false);
      setTitle('');
      loadChallenges();
    } catch (err: any) {
      alert(err.message || 'Failed to create challenge');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase">
                <Swords className="w-3.5 h-3.5" /> 1v1 Candidate Battle Arena
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Peer-to-Peer Quiz Duels
              </h2>
            </div>

            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Challenge Aspirant
            </button>
          </div>

          {showCreate && (
            <form onSubmit={handleCreateChallenge} className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-amber-900 text-sm">Issue New 1v1 Duel</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Challenge Title</label>
                  <input
                    type="text"
                    placeholder="e.g. 46th BCS Bangladesh Affairs Duel"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="General Science">General Science</option>
                    <option value="Bangla Language & Literature">Bangla Language & Literature</option>
                    <option value="Bangladesh Affairs">Bangladesh Affairs</option>
                    <option value="English Language & Literature">English Language & Literature</option>
                    <option value="International Affairs">International Affairs</option>
                    <option value="Mathematical Reasoning">Mathematical Reasoning</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-amber-600 text-white font-bold text-xs rounded-lg shadow"
                >
                  {loading ? 'Creating...' : 'Send Challenge'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {challenges.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm bg-slate-50 rounded-2xl border border-dashed">
                No active 1v1 challenges right now. Click 'Challenge Aspirant' to create one!
              </div>
            ) : (
              challenges.map(chal => (
                <div
                  key={chal.id}
                  className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-amber-400 transition flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{chal.title}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                        {chal.subject}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <span>Challenger: <strong>{chal.challengerName}</strong></span>
                      <span>•</span>
                      <span>Opponent: <strong>{chal.opponentName}</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onStartQuiz(chal.questions, `1v1 Duel: ${chal.title}`);
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" /> Enter Duel
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
