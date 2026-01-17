import { useCallback, useRef } from 'react';

type SoundType = 'alert' | 'success' | 'warning' | 'error';

// Base64 encoded short beep sounds
const SOUNDS: Record<SoundType, string> = {
  alert: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1sbm5sbm5sbG5wcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBw',
  success: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1sbJCVnZ2dnZ2YkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKS',
  warning: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1sbG5ubm5sbG5wcHBwcG5sbG5wcHBwcG5sbG5wcHBwcG5sbG5wcHBwcG5sbG5wcHBwcG5sbG5wcHBwcG5sbG5wcHBwcG5sbG5wcHBwcG5sbG5wcHBwcG5sbG5wcHBwcG5sbG5wcHBwcG5sbG5wcHBwcG5sbG5wcHBwcG5sbG5wcHBwcG5sbG5wcHBwcG5sbG5wcHBwcG5sbG5wcHBwcG5sbG5wcHBwcG5sbG5wcHBwcG5sbG5w',
  error: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1sbG5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5u',
};

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback((type: SoundType = 'alert') => {
    try {
      // Create new audio element each time for overlapping sounds
      const audio = new Audio(SOUNDS[type]);
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore autoplay restrictions
        console.log('Sound autoplay blocked - user interaction required');
      });
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  }, []);

  const playAlertSound = useCallback(() => playSound('alert'), [playSound]);
  const playSuccessSound = useCallback(() => playSound('success'), [playSound]);
  const playWarningSound = useCallback(() => playSound('warning'), [playSound]);
  const playErrorSound = useCallback(() => playSound('error'), [playSound]);

  return {
    playSound,
    playAlertSound,
    playSuccessSound,
    playWarningSound,
    playErrorSound,
  };
}
