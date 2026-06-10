import { useState } from 'react';


export const getNvidiaConfig = () => {
  const envKey = import.meta.env.VITE_NVIDIA_API_KEY || '';
  const envModel = import.meta.env.VITE_NVIDIA_MODEL || 'meta/llama3-70b-instruct'; // Fallback default
  
  return {
    apiKey: envKey,
    model: envModel,
    isConfigured: !!envKey
  };
};

export const useNvidiaChat = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveNvidiaConfig = (_apiKey: string, _model: string) => {
    // Stub: env loaded configuration
  };

  const getChatResponseStream = async (
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    onChunk: (text: string) => void,
    onComplete: (fullText: string) => void
  ) => {
    const { apiKey, model, isConfigured } = getNvidiaConfig();
    
    if (!isConfigured) {
      throw new Error("NVIDIA API Key is missing. Please configure it in Settings.");
    }

    setLoading(true);
    setError(null);
    let fullContent = '';

    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const baseUrl = isLocal ? '/nvidia-api' : 'https://integrate.api.nvidia.com';
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          top_p: 0.7,
          max_tokens: 1024,
          stream: true
        })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error?.message || `API error (HTTP ${response.status})`);
      }

      if (!response.body) {
        throw new Error("ReadableStream is not supported by this browser/connection.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Save the last partial line back to the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;
          if (cleanLine === 'data: [DONE]') continue;

          if (cleanLine.startsWith('data: ')) {
            try {
              const jsonStr = cleanLine.substring(6);
              const parsed = JSON.parse(jsonStr);
              const content = parsed?.choices?.[0]?.delta?.content || '';
              if (content) {
                fullContent += content;
                onChunk(content);
              }
            } catch (e) {
              // Ignore lines that are partial or not valid JSON
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer && buffer.startsWith('data: ')) {
        try {
          const jsonStr = buffer.substring(6).trim();
          if (jsonStr && jsonStr !== '[DONE]') {
            const parsed = JSON.parse(jsonStr);
            const content = parsed?.choices?.[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              onChunk(content);
            }
          }
        } catch (e) {}
      }

      onComplete(fullContent);
    } catch (err: any) {
      console.error("NVIDIA API stream error:", err);
      setError(err.message || "An error occurred while streaming the response.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    saveNvidiaConfig,
    getChatResponseStream,
    config: getNvidiaConfig()
  };
};
