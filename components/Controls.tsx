import React, { useState, useEffect } from 'react';
import { convertTextToSpeech } from '../services/geminiService';
import { type OutputFormat, VOICE_OPTIONS } from '../types';
import { ConvertIcon } from './common/Icons';

// TypeScript declaration for the lamejs library loaded from CDN
declare const lamejs: any;

interface ControlsProps {
  documentText: string;
  fileName: string;
  totalPages: number;
  onProcessingStart: () => void;
  onOutputGenerated: (url: string, fileName:string, text?: string) => void;
  onError: (error: string) => void;
  onProgress: (progress: number) => void;
  disabled: boolean;
}

// Function to encode raw PCM data to a valid WAV file
const encodeWAV = (samples: Int16Array, sampleRate: number): ArrayBuffer => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, samples[i], true);
  }

  return buffer;
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// Function to encode raw PCM data to a valid MP3 file
const encodeMP3 = (pcmBuffer: ArrayBuffer): Uint8Array => {
    const pcm = new Int16Array(pcmBuffer);
    const mp3encoder = new lamejs.Mp3Encoder(1, 24000, 128); // 1 channel, 24000 sample rate, 128kbps bitrate
    const mp3Data = [];

    const sampleBlockSize = 1152; // Encoder internal sample block size
    for (let i = 0; i < pcm.length; i += sampleBlockSize) {
        const sampleChunk = pcm.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(new Uint8Array(mp3buf));
        }
    }
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf));
    }

    const totalLength = mp3Data.reduce((acc, buf) => acc + buf.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for(const buf of mp3Data) {
        result.set(buf, offset);
        offset += buf.length;
    }
    return result;
};


export const Controls: React.FC<ControlsProps> = ({ documentText, fileName, totalPages, onProcessingStart, onOutputGenerated, onError, onProgress, disabled }) => {
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('mp3');
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
  const [startPage, setStartPage] = useState('');
  const [endPage, setEndPage] = useState('');

  useEffect(() => {
    if (totalPages > 0) {
      setStartPage('1');
      setEndPage(String(totalPages));
    } else {
      setStartPage('');
      setEndPage('');
    }
  }, [totalPages]);
  
  const handleExecute = async () => {
    onProcessingStart();
    try {
        let textToProcess = documentText;
        if (startPage && endPage && (startPage !== '1' || endPage !== String(totalPages))) {
            textToProcess = `من النص الكامل التالي، يرجى التركيز فقط على المحتوى الذي يتوافق مع الصفحات من ${startPage} إلى ${endPage} عند إنشاء الإخراج المطلوب:\n\n${documentText}`;
        } else if (startPage && startPage !== '1') {
            textToProcess = `من النص الكامل التالي، يرجى التركيز فقط على المحتوى الذي يبدأ من الصفحة ${startPage} عند إنشاء الإخراج المطلوب:\n\n${documentText}`;
        }

        if (outputFormat === 'txt' || outputFormat === 'docx') {
            const blob = new Blob([documentText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            onOutputGenerated(url, `${fileName.split('.')[0]}.${outputFormat}`);
        } else if (outputFormat === 'mp3' || outputFormat === 'wav') {
            const rawPcmBuffer = await convertTextToSpeech(textToProcess, selectedVoice, onProgress);
            let audioBlob: Blob;

            if (outputFormat === 'mp3') {
                const mp3Data = encodeMP3(rawPcmBuffer);
                audioBlob = new Blob([mp3Data], { type: 'audio/mpeg' });
            } else { // wav
                const wavData = encodeWAV(new Int16Array(rawPcmBuffer), 24000);
                audioBlob = new Blob([wavData], { type: 'audio/wav' });
            }
            
            const url = URL.createObjectURL(audioBlob);
            onOutputGenerated(url, `${fileName.split('.')[0]}.${outputFormat}`);
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
        onError(`فشل في التنفيذ: ${errorMessage}`);
    }
  };

  return (
    <div className="space-y-6" aria-disabled={disabled}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="start-page" className="block text-lg font-medium text-gray-300 mb-2">من صفحة:</label>
          <input
            type="number"
            id="start-page"
            value={startPage}
            onChange={(e) => setStartPage(e.target.value)}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 text-white"
            placeholder="مثال: 1"
            disabled={disabled}
            min="1"
          />
        </div>
        <div>
          <label htmlFor="end-page" className="block text-lg font-medium text-gray-300 mb-2">إلى صفحة:</label>
          <input
            type="number"
            id="end-page"
            value={endPage}
            onChange={(e) => setEndPage(e.target.value)}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 text-white"
            placeholder={`مثال: ${totalPages || 10}`}
            disabled={disabled}
            min={startPage || "1"}
          />
        </div>
      </div>
      <div>
        <label htmlFor="output-format" className="block text-lg font-medium text-gray-300 mb-2">صيغة الإخراج:</label>
        <select
          id="output-format"
          value={outputFormat}
          onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
          className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 text-white"
          disabled={disabled}
          aria-disabled={disabled}
        >
          <option value="mp3">ملف صوتي MP3</option>
          <option value="wav">ملف صوتي WAV</option>
          <option value="txt">ملف نصي TXT</option>
          <option value="docx">مستند Word DOCX</option>
        </select>
      </div>
      {(outputFormat === 'mp3' || outputFormat === 'wav') && (
        <div>
          <label htmlFor="voice-select" className="block text-lg font-medium text-gray-300 mb-2">اختر نبرة الصوت:</label>
          <select
            id="voice-select"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md focus:ring-yellow-500 focus:border-yellow-500 text-white"
            disabled={disabled}
            aria-disabled={disabled}
          >
            {VOICE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.name}</option>)}
          </select>
        </div>
      )}
      <button
        onClick={handleExecute}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 text-xl font-bold text-black bg-yellow-400 rounded-lg shadow-lg hover:bg-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-300 focus:ring-opacity-75 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-300"
      >
        <ConvertIcon />
        <span>تنفيذ</span>
      </button>
    </div>
  );
};