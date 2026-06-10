import { getNvidiaConfig } from './useNvidiaChat';

export const useNvidiaEmbeddings = () => {
  const getEmbedding = async (text: string): Promise<number[]> => {
    const { apiKey, isConfigured } = getNvidiaConfig();
    
    if (!isConfigured) {
      throw new Error("NVIDIA API Key is missing. Please configure it in .env.");
    }

    try {
      const baseUrl = '/nvidia-api';
      const response = await fetch(`${baseUrl}/v1/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: [text],
          model: 'nvidia/nv-embedqa-e5-v5',
          encoding_format: 'float'
        })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error?.message || `API error (HTTP ${response.status})`);
      }

      const resData = await response.json();
      const embedding = resData?.data?.[0]?.embedding;
      
      if (!Array.isArray(embedding)) {
        throw new Error("Invalid response format from NVIDIA Embeddings API.");
      }

      return embedding;
    } catch (err: any) {
      console.error("NVIDIA Embeddings API error:", err);
      throw err;
    }
  };

  return { getEmbedding };
};
