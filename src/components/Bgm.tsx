'use client';
import { useEffect, useRef } from 'react';
import { basePath } from '../lib/api';

export function Bgm({ inBattle }: { inBattle: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const src = basePath + (inBattle ? '/audio/bgm-battle.mp3' : '/audio/bgm-lobby.mp3');
  useEffect(() => {
    const track = audio.current!;
    track.volume = .55; // Leaves headroom so synthesized SFX (lib/sfx.ts) stay audible over the BGM.
    const start = () => {
      if (!document.hidden && track.paused) void track.play().catch(() => { /* Retry on the next user gesture if autoplay is blocked. */ });
    };
    const visibility = () => { if (document.hidden) track.pause(); else start(); };
    document.addEventListener('click', start);
    document.addEventListener('keydown', start);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('click', start);
      document.removeEventListener('keydown', start);
      document.removeEventListener('visibilitychange', visibility);
      track.pause();
    };
  }, []);
  useEffect(() => {
    const track = audio.current!;
    const wasPlaying = !track.paused;
    track.load();
    if (wasPlaying && !document.hidden) void track.play().catch(() => { /* Retry on the next user gesture if autoplay is blocked. */ });
  }, [src]);
  return <audio ref={audio} src={src} loop preload="none" />;
}
