import React, { useState, useEffect } from 'react';
import { User, ChatMessage } from '../types';
import { fetchChatMessages, sendChatMessage } from '../api';
import { MessageSquare, Send, Clock, UserCheck, CheckCircle2, X } from 'lucide-react';

interface ModeratorChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export function ModeratorChatModal({ isOpen, onClose, currentUser }: ModeratorChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [questionId, setQuestionId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen]);

  const loadMessages = async () => {
    try {
      const data = await fetchChatMessages();
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      await sendChatMessage(text, questionId || undefined);
      setText('');
      setQuestionId('');
      loadMessages();
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 relative flex flex-col h-[560px]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-900 text-white">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-300">
              <MessageSquare className="w-3.5 h-3.5" /> Moderator Support Desk
            </span>
            <h2 className="text-lg font-bold mt-0.5">Chat with Subject Moderators</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-indigo-800 text-indigo-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-slate-50">
          {messages.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No previous messages. Ask any question doubt or feedback to our moderators!
            </div>
          ) : (
            messages.map(m => (
              <div
                key={m.id}
                className={`p-3.5 rounded-2xl border max-w-[85%] text-xs space-y-1 ${
                  m.senderId === currentUser?.id
                    ? 'ml-auto bg-indigo-600 text-white border-indigo-500 rounded-tr-none'
                    : 'mr-auto bg-white text-slate-800 border-slate-200 shadow-sm rounded-tl-none'
                }`}
              >
                <div className="flex items-center justify-between gap-2 font-bold opacity-80 text-[10px]">
                  <span>{m.senderName} ({m.senderRole})</span>
                  <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="leading-relaxed">{m.text}</p>
                {m.questionId && (
                  <div className="text-[10px] opacity-75 font-mono pt-1">
                    Question Ref: #{m.questionId}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input area */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Question ID (optional e.g. q-custom-101)"
              value={questionId}
              onChange={e => setQuestionId(e.target.value)}
              className="w-1/3 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
            <input
              type="text"
              placeholder="Type your question or query for moderator..."
              value={text}
              onChange={e => setText(e.target.value)}
              className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1 shrink-0"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
