
import React, { useState, useCallback, useRef } from 'react';
import { extractTextFromDocument } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import type { FileData } from '../types';
import { UploadIcon } from './common/Icons';

interface FileUploadProps {
  onFileSelect: (fileData: FileData | null) => void;
  onTextExtracted: (text: string) => void;
  onError: (error: string) => void;
  disabled: boolean;
}

const ACCEPTED_FILES = "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/*,application/vnd.openxmlformats-officedocument.presentationml.presentation";

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onTextExtracted, onError, disabled }) => {
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFileName('');
      onFileSelect(null);
      return;
    }

    setFileName(file.name);
    
    try {
      const base64 = await fileToBase64(file);
      const fileData = { name: file.name, type: file.type, base64 };
      onFileSelect(fileData);
      
      const extractedText = await extractTextFromDocument(fileData);
      onTextExtracted(extractedText);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      onError(`فشل في معالجة الملف: ${errorMessage}`);
      setFileName('');
      onFileSelect(null);
    }
  }, [onFileSelect, onTextExtracted, onError]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <p className="text-lg text-gray-300 mb-4 text-center">يدعم كافة الصيغ: PDF (بما في ذلك الممسوحة ضوئيًا)، DOCX، TXT، الصور، PPTX.</p>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={ACCEPTED_FILES}
        aria-label="اختر ملفًا للرفع"
        disabled={disabled}
      />
      <button
        onClick={handleButtonClick}
        disabled={disabled}
        className="w-full max-w-md flex items-center justify-center gap-3 px-6 py-4 text-xl font-bold text-black bg-yellow-400 rounded-lg shadow-lg hover:bg-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-300 focus:ring-opacity-75 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-300"
      >
        <UploadIcon />
        <span>{fileName || 'اختر ملفًا'}</span>
      </button>
    </div>
  );
};
