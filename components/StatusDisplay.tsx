import React from 'react';
import type { ProcessingState } from '../types';
import { Spinner } from './common/Spinner';

interface StatusDisplayProps {
  message: string;
  state: ProcessingState;
  progress?: number;
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({ message, state, progress = 0 }) => {
  const getStatusColor = () => {
    switch (state) {
      case 'processing':
        return 'border-blue-500 text-blue-300';
      case 'ready':
      case 'done':
        return 'border-green-500 text-green-300';
      case 'error':
        return 'border-red-500 text-red-300';
      case 'idle':
      default:
        return 'border-gray-600 text-gray-300';
    }
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 ${getStatusColor()} bg-gray-800 shadow-md`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center justify-center gap-4">
        {state === 'processing' && <Spinner />}
        <p className="text-lg font-semibold text-center">{message}</p>
      </div>
      {state === 'processing' && progress > 0 && (
        <div className="mt-4" aria-live="off">
          <div className="flex justify-between mb-1">
            <span className="text-base font-medium text-yellow-300">التقدم</span>
            <span className="text-sm font-medium text-yellow-300">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-yellow-400 h-2.5 rounded-full transition-width duration-300 ease-linear"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`نسبة التقدم ${Math.round(progress)}%`}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};