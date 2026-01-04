/**
 * useTextOverlay Hook
 * Easy integration for text overlay functionality
 */

import { useState, useCallback } from 'react';

export interface TextRegion {
  id: string;
  englishText: string;
  translatedText?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor?: string;
  backgroundPadding?: number;
  lineHeight?: number;
  maxLines?: number;
}

interface UseTextOverlayOptions {
  apiUrl?: string;
}

interface OverlayResult {
  success: boolean;
  imageBase64?: string;
  error?: string;
}

interface UseTextOverlayReturn {
  applyOverlay: (
    imageBase64: string,
    language: 'Hindi' | 'Tamil' | 'English',
    layoutId?: string
  ) => Promise<OverlayResult>;
  isProcessing: boolean;
  error: string | null;
}

const DEFAULT_API_URL = 'http://localhost:3001';

export function useTextOverlay(options: UseTextOverlayOptions = {}): UseTextOverlayReturn {
  const { apiUrl = DEFAULT_API_URL } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyOverlay = useCallback(async (
    imageBase64: string,
    language: 'Hindi' | 'Tamil' | 'English',
    layoutId?: string
  ): Promise<OverlayResult> => {
    // Skip overlay for English
    if (language === 'English') {
      return { success: true, imageBase64 };
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/overlay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          language,
          layoutId: layoutId || 'nebzmart-horizontal'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error');
      }

      const data = await response.json();
      return { success: true, imageBase64: data.imageBase64 };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Overlay failed';
      setError(errorMsg);
      return { success: false, error: errorMsg, imageBase64 };
    } finally {
      setIsProcessing(false);
    }
  }, [apiUrl]);

  return {
    applyOverlay,
    isProcessing,
    error
  };
}

export default useTextOverlay;
