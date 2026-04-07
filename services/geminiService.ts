import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const fileToGenerativePart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
};

export async function extractTextFromDocument(fileData: { base64: string, type: string }): Promise<string> {
  try {
    const model = 'gemini-2.5-flash';
    const imagePart = fileToGenerativePart(fileData.base64, fileData.type);
    const textPart = { text: "استخرج النص الكامل من هذا المستند بدقة. إذا كان المستند صورة، قم بإجراء OCR. حافظ على التنسيق الأصلي قدر الإمكان، بما في ذلك الفقرات والعناوين." };
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
    });
    
    if (!response.text) {
        throw new Error("لم يتمكن الذكاء الاصطناعي من استخراج أي نص.");
    }
    return response.text;
  } catch (error) {
    console.error("Error extracting text:", error);
    throw new Error("فشل في استخراج النص من الملف.");
  }
}

export async function countPagesInText(text: string): Promise<number> {
  // Use a smaller chunk of text to avoid sending huge payloads just for a page count.
  const textSample = text.substring(0, 20000); 
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `بناءً على النص التالي، قم بتقدير عدد الصفحات التي سيشغلها في مستند قياسي. قدم رقمًا واحدًا فقط كإجابتك. النص:\n\n---\n${textSample}\n---`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    
    const resultText = response.text?.trim();
    if (!resultText) {
        console.warn("AI could not estimate page count, defaulting to 1.");
        return 1;
    }
    
    const pageCount = parseInt(resultText.match(/\d+/)?.[0] || '1', 10);
    if (isNaN(pageCount) || pageCount === 0) {
        return 1;
    }
    return pageCount;

  } catch (error) {
    console.error("Error counting pages:", error);
    // It's not a critical failure, we can default to 1 page.
    return 1;
  }
}

// Helper to concatenate ArrayBuffers
const concatenateAudioBuffers = (buffers: ArrayBuffer[]): ArrayBuffer => {
    const totalLength = buffers.reduce((acc, val) => acc + val.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
        result.set(new Uint8Array(buffer), offset);
        offset += buffer.byteLength;
    }
    return result.buffer;
};

export async function convertTextToSpeech(text: string, voice: string, onProgress: (progress: number) => void): Promise<ArrayBuffer> {
  const chunks = text.match(/[\s\S]{1,2500}/g) || [];
  if (chunks.length === 0) {
    throw new Error("لا يوجد نص لتحويله إلى كلام.");
  }

  const allAudioBuffers: ArrayBuffer[] = [];
  const totalChunks = chunks.length;
  const batchSize = 5; // Process 5 chunks concurrently to avoid API rate limiting.

  onProgress(0);
  
  try {
    for (let i = 0; i < totalChunks; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize);
      
      const batchPromises = batchChunks.map(chunk =>
        ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: chunk }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              },
            },
          },
        }).then(response => {
          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (!base64Audio) {
            // This is now a critical failure to ensure 100% completeness
            throw new Error(`A chunk of text failed to convert (no audio data).`);
          }
          const binaryString = atob(base64Audio);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let j = 0; j < len; j++) {
            bytes[j] = binaryString.charCodeAt(j);
          }
          return bytes.buffer;
        }).catch(error => {
          console.error("A critical chunk of text failed to convert to speech with error:", error);
          // Re-throw the error to make Promise.all fail
          throw error;
        })
      );

      const batchResults = await Promise.all(batchPromises);
      allAudioBuffers.push(...batchResults);

      const completedChunks = Math.min(i + batchSize, totalChunks);
      const progress = (completedChunks / totalChunks) * 100;
      onProgress(progress);
    }
  } catch (error) {
      // This catch block will now trigger if any chunk fails in Promise.all
      console.error("TTS process failed due to a chunk failure. Aborting.", error);
      throw new Error("فشل تحويل جزء من المستند. لضمان الدقة الكاملة، تم إيقاف العملية. يرجى المحاولة مرة أخرى.");
  }

  if (allAudioBuffers.length !== totalChunks) {
      // This is an extra safeguard, but the catch block should handle failures.
      throw new Error("Incomplete audio conversion. Some parts of the document failed.");
  }

  return concatenateAudioBuffers(allAudioBuffers);
}


export async function executeAiCommand(documentText: string, command: string): Promise<string> {
    try {
        const model = 'gemini-3-pro-preview';
        const prompt = `
        السياق: أنت مساعد ذكاء اصطناعي خبير في التعامل مع المستندات للمستخدمين المكفوفين.
        نص المستند الحالي هو:
        ---
        ${documentText}
        ---
        
        مهمتك هي تنفيذ الأمر التالي الذي قدمه المستخدم بدقة على نص المستند أعلاه. قدم الإجابة مباشرة ووضوح.

        الأمر: "${command}"
        `;
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: prompt,
        });

        if (!response.text) {
            throw new Error("لم يتمكن الذكاء الاصطناعي من معالجة الأمر.");
        }
        return response.text;
    } catch (error) {
        console.error("Error executing AI command:", error);
        throw new Error("فشل في تنفيذ أمر الذكاء الاصطناعي.");
    }
}