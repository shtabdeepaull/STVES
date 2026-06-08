// ============================================================
// Data Table Component
// Reusable table with sorting, pagination, and search
// ============================================================
import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
export default function DataTable({ data, columns, keyField, searchable = false, searchFields = [], pageSize = 10, emptyMessage = 'No data found', emptyIcon, onRowClick, className = '', }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
    const [currentPage, setCurrentPage] = useState(1);
    // Filter data based on search
    const filteredData = useMemo(() => {
        if (!searchQuery || searchFields.length === 0)
            return data;
        const query = searchQuery.toLowerCase();
        return data.filter(item => searchFields.some(field => {
            const value = item[field];
            return value && String(value).toLowerCase().includes(query);
        }));
    }, [data, searchQuery, searchFields]);
    // Sort data
    const sortedData = useMemo(() => {
        if (!sortKey)
            return filteredData;
        return [...filteredData].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (aVal === bVal)
                return 0;
            if (aVal === null || aVal === undefined)
                return 1;
            if (bVal === null || bVal === undefined)
                return -1;
            const comparison = aVal < bVal ? -1 : 1;
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [filteredData, sortKey, sortDirection]);
    // Paginate data
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, currentPage, pageSize]);
    const totalPages = Math.ceil(sortedData.length / pageSize);
    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        }
        else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };
    const getValue = (item, key) => {
        const keys = key.split('.');
        let value = item;
        for (const k of keys) {
            value = value?.[k];
        }
        return value;
    };
    return (<div className={`bg-white rounded-2xl border border-gray-100 overflow-hidden ${className}`}>
      {/* Search */}
      {searchable && (<div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#0f4c81]"/>
          </div>
        </div>)}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {columns.map(col => (<th key={String(col.key)} className={`text-left px-5 py-3 font-semibold text-gray-600 ${col.className || ''}`}>
                  {col.sortable ? (<button onClick={() => handleSort(String(col.key))} className="flex items-center gap-1 hover:text-gray-800">
                      {col.label}
                      <span className="flex flex-col">
                        <ChevronUp size={12} className={sortKey === col.key && sortDirection === 'asc' ? 'text-[#0f4c81]' : 'text-gray-300'}/>
                        <ChevronDown size={12} className={`-mt-1 ${sortKey === col.key && sortDirection === 'desc' ? 'text-[#0f4c81]' : 'text-gray-300'}`}/>
                      </span>
                    </button>) : (col.label)}
                </th>))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginatedData.length === 0 ? (<tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-gray-400">
                  {emptyIcon && <div className="mb-3">{emptyIcon}</div>}
                  <p>{emptyMessage}</p>
                </td>
              </tr>) : (paginatedData.map(item => (<tr key={String(item[keyField])} onClick={() => onRowClick?.(item)} className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}>
                  {columns.map(col => (<td key={String(col.key)} className={`px-5 py-3 ${col.className || ''}`}>
                      {col.render ? col.render(item) : getValue(item, String(col.key))}
                    </td>))}
                </tr>)))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (<div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft size={16}/>
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                    pageNum = i + 1;
                }
                else if (currentPage <= 3) {
                    pageNum = i + 1;
                }
                else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                }
                else {
                    pageNum = currentPage - 2 + i;
                }
                return (<button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`w-8 h-8 rounded-lg text-xs font-medium ${currentPage === pageNum
                        ? 'bg-[#0f4c81] text-white'
                        : 'hover:bg-gray-100 text-gray-600'}`}>
                  {pageNum}
                </button>);
            })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight size={16}/>
            </button>
          </div>
        </div>)}
    </div>);
}
