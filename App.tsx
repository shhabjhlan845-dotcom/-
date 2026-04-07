import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { Controls } from './components/Controls';
import { CommandCenter } from './components/CommandCenter';
import { LiveMode } from './components/LiveMode';
import { StatusDisplay } from './components/StatusDisplay';
import { OutputDisplay } from './components/OutputDisplay';
import type { FileData, OutputFormat, ProcessingState, VoiceOption } from './types';
import { countPagesInText } from './services/geminiService';

export default function App() {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('يرجى رفع ملف للبدء.');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputFileName, setOutputFileName] = useState<string>('');
  const [outputText, setOutputText] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [announcement, setAnnouncement] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const lastAnnouncedProgress = useRef(0);

  useEffect(() => {
    if (announcement) {
        const timer = setTimeout(() => setAnnouncement(''), 1000); // Clear after a delay for re-announcement
        return () => clearTimeout(timer);
    }
  }, [announcement]);
  
  const handleFileSelect = useCallback((data: FileData | null) => {
    setFileData(data);
    setExtractedText('');
    setOutputUrl(null);
    setOutputText(null);
    setTotalPages(0);
    setProgress(0);
    if (data) {
      const msg = `تم اختيار الملف: ${data.name}. جاري استخراج النص...`;
      setStatusMessage(msg);
      setAnnouncement(`جاري معالجة ${data.name}`);
      setProcessingState('processing');
    } else {
      const msg = 'تم إلغاء اختيار الملف.';
      setStatusMessage(msg);
      setAnnouncement(msg);
      setProcessingState('idle');
    }
  }, []);

  const handleTextExtracted = useCallback(async (text: string) => {
    setExtractedText(text);
    setProcessingState('ready');
    const msg = 'تم استخراج النص بنجاح. المستند جاهز للمعالجة.';
    setStatusMessage(msg);
    setAnnouncement('اكتمل استخراج النص. المستند جاهز.');

    try {
        const pages = await countPagesInText(text);
        setTotalPages(pages);
    } catch (e) {
        console.error("Could not count pages", e);
        setTotalPages(1); // Default to 1 on error
    }
  }, []);

  const handleProcessingError = useCallback((error: string) => {
    setProcessingState('error');
    const msg = `خطأ: ${error}`;
    setStatusMessage(msg);
    setAnnouncement(msg);
    setProgress(0);
  }, []);

  const handleOutputGenerated = useCallback((url: string, fileName: string, text?: string) => {
    setOutputUrl(url);
    setOutputFileName(fileName);
    setOutputText(text || null);
    setProcessingState('done');
    const msg = `تم إنشاء الملف "${fileName}" بنجاح وجاهز للتحميل.`;
    setStatusMessage(msg);
    setAnnouncement("اكتملت المعالجة بنجاح.");
    setProgress(0);
  }, []);

  const handleProcessingStart = useCallback(() => {
    setProcessingState('processing');
    setProgress(0);
    lastAnnouncedProgress.current = 0;
    const msg = 'جاري تنفيذ طلبك...';
    setStatusMessage(msg);
    setAnnouncement(msg);
  }, []);

  const handleProgress = useCallback((p: number) => {
    const currentProgress = Math.round(p);
    setProgress(currentProgress);
    // Announce at 25, 50, 75, but not 100 as the final message handles that.
    if (currentProgress < 100 && currentProgress >= lastAnnouncedProgress.current + 25) {
        const roundedProgress = Math.floor(currentProgress / 25) * 25;
        if (roundedProgress > lastAnnouncedProgress.current) {
            setAnnouncement(`اكتمل ${roundedProgress} بالمئة`);
            lastAnnouncedProgress.current = roundedProgress;
        }
    }
  }, []);

  return (
    <div className="bg-black text-white min-h-screen font-sans flex flex-col p-4 md:p-8 selection:bg-yellow-500 selection:text-black">
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcement}
      </div>
      <Header />
      <main className="flex-grow flex flex-col gap-8 mt-8">
        <StatusDisplay message={statusMessage} state={processingState} progress={progress} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-8 p-6 bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-yellow-400 border-b-2 border-yellow-500 pb-2">1. تحميل ومعالجة المستند</h2>
            <FileUpload
              onFileSelect={handleFileSelect}
              onTextExtracted={handleTextExtracted}
              onError={handleProcessingError}
              disabled={processingState === 'processing'}
            />
          </div>

          <div className={`flex flex-col gap-8 p-6 bg-gray-900 border border-gray-700 rounded-lg shadow-lg transition-opacity duration-500 ${!extractedText ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}>
            <h2 className="text-2xl font-bold text-yellow-400 border-b-2 border-yellow-500 pb-2">2. أدوات التحكم والتحويل</h2>
            <Controls
              documentText={extractedText}
              fileName={fileData?.name || 'document'}
              totalPages={totalPages}
              onProcessingStart={handleProcessingStart}
              onOutputGenerated={handleOutputGenerated}
              onError={handleProcessingError}
              onProgress={handleProgress}
              disabled={!extractedText || processingState === 'processing'}
            />
          </div>
        </div>

        <div className={`p-6 bg-gray-900 border border-gray-700 rounded-lg shadow-lg transition-opacity duration-500 ${!extractedText ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}>
           <h2 className="text-2xl font-bold text-yellow-400 border-b-2 border-yellow-500 pb-2 mb-6">3. المساعد الذكي (AI Command Center)</h2>
           <CommandCenter
              documentText={extractedText}
              onProcessingStart={handleProcessingStart}
              onOutputGenerated={handleOutputGenerated}
              onError={handleProcessingError}
              disabled={!extractedText || processingState === 'processing'}
            />
        </div>

        <div className={`p-6 bg-gray-900 border border-gray-700 rounded-lg shadow-lg transition-opacity duration-500 ${!extractedText ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}>
           <h2 className="text-2xl font-bold text-yellow-400 border-b-2 border-yellow-500 pb-2 mb-6">4. وضع المحادثة المباشرة (Live Voice Mode)</h2>
           <LiveMode
              documentText={extractedText}
              disabled={!extractedText || processingState === 'processing'}
            />
        </div>

        {outputUrl && (
          <OutputDisplay 
            outputUrl={outputUrl} 
            fileName={outputFileName}
            outputText={outputText}
            onClose={() => {
              setOutputUrl(null);
              setOutputText(null);
              setProcessingState('ready');
              setStatusMessage('المستند جاهز للمزيد من الأوامر.');
            }}
          />
        )}
      </main>
    </div>
  );
}