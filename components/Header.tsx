
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="w-full text-center p-4 bg-gray-900 border-b-4 border-yellow-500 rounded-lg shadow-lg">
      <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-wider" tabIndex={0}>
        مساعد الوصول الرقمي
      </h1>
      <p className="text-lg text-yellow-400 mt-2" tabIndex={0}>
        تم تصميمه بواسطة شهاب
      </p>
    </header>
  );
};
