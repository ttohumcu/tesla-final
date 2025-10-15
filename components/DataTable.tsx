import React from 'react';

// FIX: Made Column properties readonly to better align with immutable patterns
// and to be compatible with `as const` assertions used in parent components.
interface Column<T> {
  readonly accessor: keyof T;
  readonly header: string;
}

// FIX: Changed `columns` prop to accept a readonly array, resolving type conflicts
// when passing arrays defined with `as const`.
interface DataTableProps<T> {
  readonly columns: readonly Column<T>[];
  data: T[];
}

export function DataTable<T,>({ columns, data }: DataTableProps<T>): React.ReactElement {
  if (!data || data.length === 0) {
    return <p className="text-center p-4 text-tesla-gray-400">No data available.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-tesla-gray-200 dark:border-tesla-gray-500">
      <table className="min-w-full divide-y divide-tesla-gray-200 dark:divide-tesla-gray-500">
        <thead className="bg-tesla-gray-100 dark:bg-tesla-gray-500/50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.accessor as string}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-tesla-gray-500 dark:text-tesla-gray-300 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-tesla-gray-600 divide-y divide-tesla-gray-200 dark:divide-tesla-gray-500">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-tesla-gray-100/50 dark:hover:bg-tesla-gray-500/30">
              {columns.map((column) => (
                <td key={column.accessor as string} className="px-6 py-4 whitespace-nowrap text-sm text-tesla-dark dark:text-tesla-gray-100">
                  {String(row[column.accessor])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}