'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CopyToClipboard } from './copy-to-clipboard';

interface JsonViewerProps {
  data: any;
}

export function JsonViewer({ data }: JsonViewerProps) {
  return (
    <div className="rounded-lg border bg-slate-950 p-4 text-slate-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-mono">JSON</span>
        <CopyToClipboard text={JSON.stringify(data, null, 2)} />
      </div>
      <pre className="text-sm overflow-auto max-h-96">
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
    </div>
  );
}

interface JsonTreeViewerProps {
  data: any;
  level?: number;
}

export function JsonTreeViewer({ data, level = 0 }: JsonTreeViewerProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderValue = (key: string, value: any, path: string) => {
    if (value === null) {
      return <span className="text-slate-500">null</span>;
    }
    if (typeof value === 'boolean') {
      return <span className="text-amber-500">{value.toString()}</span>;
    }
    if (typeof value === 'number') {
      return <span className="text-emerald-500">{value}</span>;
    }
    if (typeof value === 'string') {
      return <span className="text-sky-500">&quot;{value}&quot;</span>;
    }
    if (Array.isArray(value)) {
      const isExpanded = expanded[path];
      return (
        <div>
          <button
            onClick={() => toggleExpand(path)}
            className="inline-flex items-center hover:bg-slate-800 rounded px-1"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <span className="text-slate-400 ml-1">[{value.length}]</span>
          </button>
          {isExpanded && (
            <div className="ml-4 border-l border-slate-700 pl-2 mt-1">
              {value.map((item, index) => (
                <div key={index} className="py-0.5">
                  <span className="text-slate-400">{index}: </span>
                  {renderValue(index.toString(), item, `${path}.${index}`)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      const isExpanded = expanded[path];
      return (
        <div>
          <button
            onClick={() => toggleExpand(path)}
            className="inline-flex items-center hover:bg-slate-800 rounded px-1"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <span className="text-slate-400 ml-1">{`{${keys.length}}`}</span>
          </button>
          {isExpanded && (
            <div className="ml-4 border-l border-slate-700 pl-2 mt-1">
              {keys.map(k => (
                <div key={k} className="py-0.5">
                  <span className="text-purple-400">{k}</span>
                  <span className="text-slate-500">: </span>
                  {renderValue(k, value[k], `${path}.${k}`)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return <span>{String(value)}</span>;
  };

  return (
    <div className="rounded-lg border bg-slate-950 p-4 text-slate-50 font-mono text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">JSON</span>
        <CopyToClipboard text={JSON.stringify(data, null, 2)} />
      </div>
      <div className="overflow-auto max-h-96">
        {renderValue('root', data, 'root')}
      </div>
    </div>
  );
}
