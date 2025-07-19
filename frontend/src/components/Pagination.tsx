import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number; // сколько страниц показывать вокруг текущей
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, siblingCount = 1 }) => {
  if (totalPages <= 1) return null;

  const range = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const DOTS = '...';
  let pages: (number | string)[] = [];

  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);

  if (leftSibling > 2) {
    pages.push(1, DOTS);
  } else {
    pages.push(...range(1, leftSibling));
  }

  pages.push(...range(leftSibling, rightSibling));

  if (rightSibling < totalPages - 1) {
    pages.push(DOTS, totalPages);
  } else if (rightSibling < totalPages) {
    pages.push(...range(rightSibling + 1, totalPages));
  }

  return (
    <div className="flex items-center gap-1 select-none">
      <button
        className="px-2 py-1 rounded border bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        title="Первая страница"
      >
        «
      </button>
      <button
        className="px-2 py-1 rounded border bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        title="Назад"
      >
        ←
      </button>
      {pages.map((page, idx) =>
        page === DOTS ? (
          <span key={idx} className="px-2 py-1 text-gray-400">...</span>
        ) : (
          <button
            key={page as number}
            className={`px-2 py-1 rounded border ${currentPage === page ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-blue-50 border-gray-300'}`}
            onClick={() => onPageChange(page as number)}
            disabled={currentPage === page}
          >
            {page}
          </button>
        )
      )}
      <button
        className="px-2 py-1 rounded border bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        title="Вперёд"
      >
        →
      </button>
      <button
        className="px-2 py-1 rounded border bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        title="Последняя страница"
      >
        »
      </button>
    </div>
  );
};

export default Pagination; 