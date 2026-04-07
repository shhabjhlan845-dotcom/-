
import React from 'react';
import { DownloadIcon, CloseIcon } from './common/Icons';

interface OutputDisplayProps {
  outputUrl: string;
  fileName: string;
  outputText: string | null;
  onClose: () => void;
}

export const OutputDisplay: React.FC<OutputDisplayProps> = ({ outputUrl, fileName, outputText, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="output-heading">
      <div className="bg-gray-900 border-2 border-yellow-500 rounded-lg shadow-2xl w-full max-w-2xl p-6 relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 left-4 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded-full p-1"
          aria-label="إغلاق"
        >
          <CloseIcon />
        </button>
        <h2 id="output-heading" className="text-2xl font-bold text-yellow-400 text-center mb-6">النتيجة جاهزة</h2>
        
        {outputText && (
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">نص النتيجة:</h3>
                <div className="p-4 bg-gray-800 border border-gray-700 rounded-md max-h-60 overflow-y-auto text-gray-200">
                    <p style={{ whiteSpace: 'pre-wrap' }}>{outputText}</p>
                </div>
            </div>
        )}

        <div className="text-center">
            <p className="text-lg text-gray-300 mb-4">ملفك <strong className="text-yellow-300">{fileName}</strong> جاهز للتحميل.</p>
            <a
              href={outputUrl}
              download={fileName}
              className="inline-flex items-center justify-center gap-3 px-8 py-4 text-xl font-bold text-black bg-yellow-400 rounded-lg shadow-lg hover:bg-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-300 focus:ring-opacity-75 transition-colors duration-300"
            >
              <DownloadIcon />
              <span>تحميل الملف</span>
            </a>
        </div>
      </div>
    </div>
  );
};
