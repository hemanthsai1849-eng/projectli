import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, History, AlertCircle } from 'lucide-react';

// Interfaces matching our backend State Machine
type RoundState = 'WAITING' | 'LOCKED' | 'RESULT' | 'PAYOUT';

interface GameState {
  state: RoundState;
  timer: number;
  seedHash: string | null;
  serverSeedRevealed: string | null;
}

interface HistoryItem {
  id: string;
  result: { color: string; number: number };
  serverSeedHash: string;
}

export default function BettingDashboard() {
  // Mock WebSocket State
  const [gameState, setGameState] = useState<GameState>({
    state: 'WAITING',
    timer: 60,
    seedHash: '9f86d081884c7d659a2feaa0c55ad015...',
    serverSeedRevealed: null
  });

  const [amount, setAmount] = useState<string>('');
  const [isBetting, setIsBetting] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Derived state
  const isLockedOut = gameState.timer <= 5 || gameState.state !== 'WAITING';

  // Mock WebSocket Loop for visual demonstration
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState((prev) => {
        let newTimer = prev.timer - 1;
        let newState = prev.state;

        if (newTimer <= 5 && newTimer > 0) newState = 'LOCKED';
        if (newTimer === 0) {
          newState = 'RESULT';
          setTimeout(() => setGameState(s => ({ ...s, state: 'PAYOUT' })), 2000);
          newTimer = 60; // Reset loop implicitly
          newState = 'WAITING';
        }

        return { ...prev, timer: newTimer > 0 ? newTimer : 60, state: newState };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleBet = async (color: 'Red' | 'Black' | 'Green') => {
    if (isLockedOut || !amount) return;
    setIsBetting(true);
    // Simulate API POST /api/bets
    setTimeout(() => {
      alert(`Successfully placed $${amount} on ${color}`);
      setIsBetting(false);
      setAmount('');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
      
      {/* Mobile Constraint Wrapper */}
      <div className="w-full max-w-md h-[100dvh] bg-neutral-950 text-neutral-100 flex flex-col relative overflow-hidden shadow-2xl md:rounded-3xl border md:border-neutral-800">
        
        {/* Top App Bar */}
        <header className="bg-[#007AFF] text-white p-4 flex justify-between items-center shadow-md z-10">
          <div className="font-bold tracking-wide">Mantri IT Audit</div>
          <div className="flex gap-2">
            <ShieldCheck size={20} className="text-blue-100" />
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-20">
          
          {/* Referral Banner */}
          <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-3 flex justify-between items-center text-sm">
            <span className="text-yellow-500 font-medium">Your R_Code: 540672</span>
            <span className="bg-yellow-500 text-yellow-950 px-2 py-0.5 rounded text-xs font-bold shadow-sm">Copy Link</span>
          </div>

          <div className="p-4 space-y-4">
            
            {/* Timer & State Panel */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[160px] shadow-lg">
              <div className={`absolute inset-0 opacity-10 transition-colors duration-1000 ${gameState.state === 'WAITING' ? 'bg-[#007AFF]' : gameState.state === 'LOCKED' ? 'bg-amber-500' : 'bg-red-500'}`} />
              <div className="flex justify-between w-full mb-2 z-10">
                <span className="text-neutral-400 text-sm">Period</span>
                <span className="text-neutral-400 text-sm">Valid Count Down</span>
              </div>
              <div className="flex justify-between w-full items-end z-10">
                <span className="text-lg font-bold">20260413098</span>
                <h2 className="text-5xl font-black tabular-nums tracking-tighter text-[#007AFF] drop-shadow-md">
                  00:{gameState.timer.toString().padStart(2, '0')}
                </h2>
              </div>
            </div>

            {/* Voting / Betting Buttons */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button 
                onClick={() => handleBet('Green')}
                disabled={isLockedOut || isBetting}
                className="bg-[#4CAF50] text-white py-3 rounded text-sm font-bold shadow-md transition-transform active:scale-95 disabled:opacity-50"
              >
                Join Green
              </button>
              <button 
                onClick={() => handleBet('Black')}
                disabled={isLockedOut || isBetting}
                className="bg-[#9C27B0] text-white py-3 rounded text-sm font-bold shadow-md transition-transform active:scale-95 disabled:opacity-50"
              >
                Join Violet
              </button>
              <button 
                onClick={() => handleBet('Red')}
                disabled={isLockedOut || isBetting}
                className="bg-[#F44336] text-white py-3 rounded text-sm font-bold shadow-md transition-transform active:scale-95 disabled:opacity-50"
              >
                Join Red
              </button>
            </div>

            {/* Input Overlay Equivalent */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mt-2">
              <label className="text-xs text-neutral-500 mb-1 block">Contract Money</label>
              <input 
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLockedOut || isBetting}
                placeholder="₹100"
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 font-mono text-white focus:outline-none focus:border-[#007AFF] transition-all disabled:opacity-50"
              />
               {isLockedOut && (
                <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                  <AlertCircle size={12} /> Round computing securely.
                </p>
              )}
            </div>

            {/* Provably Fair History Block */}
            <div className="mt-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                 <History size={16} className="text-neutral-400" />
                 <h3 className="font-medium text-neutral-200">Provably Fair Record</h3>
              </div>
              
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-neutral-900 p-3 rounded-lg border border-neutral-800 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Period 202604130{98 - i}</div>
                      <div className="text-[10px] text-neutral-500 font-mono tracking-tighter mt-1">
                        Hash: a2b{i}9...f01{i} <span className="text-[#007AFF] bg-[#007AFF]/10 px-1 rounded ml-1">Verify</span>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full ${i % 3 === 0 ? 'bg-red-500' : 'bg-[#4CAF50]'}`} />
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Navigation (Standard App Style) */}
        <div className="absolute bottom-0 w-full bg-neutral-950 border-t border-neutral-800 grid grid-cols-3 p-2 pb-6 z-20">
            <button className="flex flex-col items-center justify-center text-neutral-500 hover:text-[#007AFF]">
               <div className="text-xl mb-1">🏠</div>
               <span className="text-[10px] font-medium">Home</span>
            </button>
            <button className="flex flex-col items-center justify-center text-[#007AFF]">
               <div className="text-xl mb-1">🎮</div>
               <span className="text-[10px] font-medium">Win</span>
            </button>
            <button className="flex flex-col items-center justify-center text-neutral-500 hover:text-[#007AFF]">
               <div className="text-xl mb-1">👤</div>
               <span className="text-[10px] font-medium">My</span>
            </button>
        </div>

      </div>
    </div>
  );
}
