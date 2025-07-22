import React, { useState } from 'react';

interface AccordionItem {
  title: string;
  content: React.ReactNode;
}

interface BigActionCardProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  accordions: AccordionItem[];
  onBack: () => void;
  style?: React.CSSProperties;
}

const BigActionCard: React.FC<BigActionCardProps> = ({ icon, title, description, accordions, onBack, style }) => {
  const [openIndexes, setOpenIndexes] = useState<number[]>([]);

  const toggleAccordion = (idx: number) => {
    setOpenIndexes((prev) =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  return (
    <div className="w-full mx-auto bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl shadow-2xl p-4 border border-blue-100 animate-fade-in" style={style}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
          {icon}
        </div>
        <div>
          <div className="text-xl font-extrabold text-gray-900 mb-1">{title}</div>
          {description && <div className="text-xs text-gray-600 font-medium">{description}</div>}
        </div>
        <button onClick={onBack} className="ml-auto px-3 py-1 bg-gray-200 hover:bg-blue-100 rounded-lg text-gray-700 font-bold text-xs shadow transition-all">Скрыть</button>
      </div>
      <div className="flex flex-col gap-2">
        {accordions.map((item, idx) => (
          <div key={idx} className="mb-1">
            <button
              onClick={() => toggleAccordion(idx)}
              className={`w-full flex items-center gap-3 text-base font-bold text-gray-900 py-2 px-3 rounded-lg bg-gradient-to-r from-white/90 to-blue-50/90 shadow border-l-4 ${openIndexes.includes(idx) ? 'border-l-blue-600' : 'border-l-blue-400'} hover:border-l-blue-600 hover:shadow-md transition-all duration-200 group relative focus:outline-none`}
            >
              <span>{item.title}</span>
              <span className={`ml-auto transition-transform duration-200 ${openIndexes.includes(idx) ? 'rotate-90' : ''}`}>▶</span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${openIndexes.includes(idx) ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-3 bg-white/90 rounded-xl shadow mb-1 border border-gray-100 animate-fade-in text-xs max-h-[320px] overflow-y-auto">
                {item.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BigActionCard; 