import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { auth, database } from '../config/firebase';
import { acceptCall, declineCall, endCall, joinChannel, startCall, type ActiveCall, type CallCredentials } from '../services/callService';
import { CallOverlay } from '../components/CallOverlay';

type CallState = 'idle' | 'calling' | 'ringing' | 'in-call' | 'ended';
type CallSnapshot = { callId: string; orderId: string; channel: string; direction: 'incoming' | 'outgoing'; peerName?: string; status: 'ringing' | 'active' | 'ended' | 'declined' | 'missed'; expiresAt?: number; startedAt?: number; };
type CallContextValue = { callState: CallState; peerName: string; elapsedSeconds: number; formattedTime: string; isMuted: boolean; endedMessage: string | null; startCall: (orderId: string) => Promise<void>; answerCall: () => Promise<void>; declineCall: () => Promise<void>; endCall: () => Promise<void>; toggleMute: () => Promise<void>; };
const CallContext = createContext<CallContextValue | null>(null);
const terminal = new Set(['ended', 'declined', 'missed']);
const formatTime = (seconds: number) => { const s = Math.max(0, seconds); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0'); const rest = (s % 60).toString().padStart(2, '0'); return h ? `${h}:${m}:${rest}` : `${m}:${rest}`; };

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [peerName, setPeerName] = useState('Driver');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [endedMessage, setEndedMessage] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<CallSnapshot | null>(null);
  const offsetRef = useRef(0);
  const activeRef = useRef<ActiveCall | null>(null);
  const seenRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ringTimerRef = useRef<number | null>(null);

  const stopAudio = useCallback(() => { audioRef.current?.pause(); if (audioRef.current) audioRef.current.currentTime = 0; if (ringTimerRef.current) window.clearTimeout(ringTimerRef.current); }, []);
  const leaveAgora = useCallback(async () => { await activeRef.current?.leave(); activeRef.current = null; }, []);
  const showEnded = useCallback((message: string) => { setEndedMessage(message); window.setTimeout(() => setEndedMessage(null), 2500); }, []);

  useEffect(() => {
    const unlock = () => { try { const audio = audioRef.current || new Audio('/sounds/call.mp3'); audioRef.current = audio; audio.loop = true; void audio.play().then(() => { audio.pause(); audio.currentTime = 0; }); } catch { /* optional ringtone */ } };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const offsetUnsub = onValue(ref(database, '.info/serverTimeOffset'), snap => { offsetRef.current = Number(snap.val() || 0); });
    const unsub = onValue(ref(database, `user_calls/${user.uid}`), snap => {
      const next = snap.val() as CallSnapshot | null;
      if (!next || terminal.has(next.status)) { if (seenRef.current && next?.status) { stopAudio(); void leaveAgora(); showEnded(next?.status === 'declined' ? 'Call declined' : next?.status === 'missed' ? 'No answer' : 'Call ended'); setCallState('ended'); } return; }
      if (next.expiresAt && Date.now() + offsetRef.current >= next.expiresAt) return;
      if (callState === 'in-call' && next.direction === 'incoming') return;
      seenRef.current = true; setSnapshot(next); setPeerName(next.peerName || 'Driver');
      if (next.status === 'ringing') { setCallState(next.direction === 'incoming' ? 'ringing' : 'calling'); if (next.direction === 'incoming') { try { const audio = audioRef.current || new Audio('/sounds/call.mp3'); audioRef.current = audio; audio.loop = true; void audio.play().catch(() => undefined); } catch { /* optional ringtone */ } } }
      if (next.status === 'active') { stopAudio(); setCallState('in-call'); }
    });
    return () => { offsetUnsub(); unsub(); };
  }, [callState, leaveAgora, showEnded, stopAudio]);

  useEffect(() => { if (callState !== 'in-call' || !snapshot?.startedAt) return; const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() + offsetRef.current - snapshot.startedAt!) / 1000)), 1000); return () => window.clearInterval(timer); }, [callState, snapshot?.startedAt]);

  const connect = useCallback(async (credentials: CallCredentials) => { activeRef.current = await joinChannel(credentials, () => setCallState('in-call')); }, []);
  const start = useCallback(async (orderId: string) => { setCallState('calling'); setEndedMessage(null); const credentials = await startCall(orderId); setSnapshot({ ...credentials, callId: credentials.callId || '', orderId, direction: 'outgoing', status: 'ringing' }); await connect(credentials); }, [connect]);
  const answer = useCallback(async () => { if (!snapshot?.callId) return; stopAudio(); const credentials = await acceptCall(snapshot.callId); await connect(credentials); }, [connect, snapshot, stopAudio]);
  const decline = useCallback(async () => { if (snapshot?.callId) await declineCall(snapshot.callId); stopAudio(); setCallState('idle'); setSnapshot(null); }, [snapshot, stopAudio]);
  const end = useCallback(async () => { if (snapshot?.callId) await endCall(snapshot.callId); stopAudio(); await leaveAgora(); setCallState('idle'); setSnapshot(null); setElapsedSeconds(0); }, [leaveAgora, snapshot, stopAudio]);
  const mute = useCallback(async () => { const next = !isMuted; await activeRef.current?.setMuted(next); setIsMuted(next); }, [isMuted]);
  const value = useMemo(() => ({ callState, peerName, elapsedSeconds, formattedTime: formatTime(elapsedSeconds), isMuted, endedMessage, startCall: start, answerCall: answer, declineCall: decline, endCall: end, toggleMute: mute }), [answer, callState, decline, elapsedSeconds, end, endedMessage, isMuted, mute, peerName, start]);
  return <CallContext.Provider value={value}><>{children}<CallOverlay /></></CallContext.Provider>;
}
export function useCall() { const value = useContext(CallContext); if (!value) throw new Error('useCall must be used inside CallProvider'); return value; }
