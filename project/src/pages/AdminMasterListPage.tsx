import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, Search, ExternalLink, Table2, Download, Plus,
  Trash2, Save, X, Check, AlertCircle, Upload, RotateCw, ChevronLeft, ChevronRight,
  LayoutGrid, FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/14PSrS1Jve37kI_3eNEr-9IojbzhyaLFEU3iqMRtiI-Q/edit';
const SHEET_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sheet-proxy`;
const SHEET_IMPORT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sheet-proxy?action=import`;

interface MasterRow {
  id: string;
  review_no: string;
  timestamp: string;
  name: string;
  email: string;
  contact_required: string;
  instagram: string;
  website: string;
  book_title: string;
  author: string;
  genre: string;
  series: string;
  book_number: string;
  language: string;
  translated_in: string;
  reviewers_rating: string;
  goodreads_rating: string;
  amazon_rating: string;
  traits: string;
  book_cover: string;
  review: string;
  amazon_link: string;
  review_date: string;
  heard_from: string;
  agreement: string;
  form_rating: string;
  suggestions: string;
  status: string;
  blogger_draft: string;
}

type ColumnKey = keyof Omit<MasterRow, 'id'>;

const COLUMNS: { key: ColumnKey; label: string; width: number }[] = [
  { key: 'review_no', label: 'Review No.', width: 80 },
  { key: 'name', label: 'Name', width: 120 },
  { key: 'email', label: 'Email', width: 180 },
  { key: 'instagram', label: 'Instagram', width: 140 },
  { key: 'website', label: 'Website', width: 120 },
  { key: 'book_title', label: 'Book Title', width: 180 },
  { key: 'author', label: 'Author', width: 140 },
  { key: 'genre', label: 'Genre', width: 100 },
  { key: 'series', label: 'Series', width: 100 },
  { key: 'book_number', label: 'Book #', width: 60 },
  { key: 'language', label: 'Language', width: 80 },
  { key: 'translated_in', label: 'Translated In', width: 90 },
  { key: 'reviewers_rating', label: 'R/W Rating', width: 80 },
  { key: 'goodreads_rating', label: 'Goodreads', width: 80 },
  { key: 'amazon_rating', label: 'Amazon', width: 70 },
  { key: 'traits', label: 'Traits', width: 160 },
  { key: 'book_cover', label: 'Cover URL', width: 120 },
  { key: 'review', label: 'Review', width: 280 },
  { key: 'amazon_link', label: 'Amazon Link', width: 120 },
  { key: 'review_date', label: 'Review Date', width: 90 },
  { key: 'heard_from', label: 'Heard From', width: 100 },
  { key: 'status', label: 'Status', width: 80 },
];

const EMPTY_ROW: Omit<MasterRow, 'id'> = {
  review_no: '', timestamp: '', name: '', email: '', contact_required: '',
  instagram: '', website: '', book_title: '', author: '', genre: '',
  series: '', book_number: '', language: '', translated_in: '',
  reviewers_rating: '', goodreads_rating: '', amazon_rating: '',
  traits: '', book_cover: '', review: '', amazon_link: '',
  review_date: '', heard_from: '', agreement: '', form_rating: '',
  suggestions: '', status: '', blogger_draft: '',
};

interface MasterListPageProps {
  navigate: (path: string) => void;
}

export function AdminMasterListPage({ navigate }: MasterListPageProps) {
  const { isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<MasterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingCell, setEditingCell] = useState<{ rowId: string; col: ColumnKey } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dirtyRows, setDirtyRows] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [showAllCols, setShowAllCols] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'sheet'>('grid');
  const pageSize = 25;
  const editRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('master_list')
        .select('*')
        .order('created_at', { ascending: true });
      if (fetchError) throw fetchError;
      setRows((data ?? []) as MasterRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) return;
    fetchRows();
  }, [authLoading, isAdmin, fetchRows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.book_title.toLowerCase().includes(q) ||
      r.author.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.genre.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.instagram.toLowerCase().includes(q) ||
      r.review_no.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const visibleColumns = showAllCols
    ? COLUMNS
    : COLUMNS.filter((c) => !['contact_required', 'agreement', 'form_rating', 'suggestions', 'blogger_draft', 'website', 'translated_in', 'book_number'].includes(c.key));

  const startEdit = (rowId: string, col: ColumnKey, currentValue: string) => {
    setEditingCell({ rowId, col });
    setEditValue(currentValue || '');
    setTimeout(() => {
      if (editRef.current) {
        editRef.current.focus();
        editRef.current.select();
      }
    }, 0);
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const { rowId, col } = editingCell;
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, [col]: editValue } : r
      )
    );
    setDirtyRows((prev) => new Set(prev).add(rowId));
    setEditingCell(null);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveRow = async (rowId: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const { id, ...updates } = row;
      void id;
      const { error: updateError } = await supabase
        .from('master_list')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', rowId);
      if (updateError) throw updateError;
      setDirtyRows((prev) => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
      setSaveMsg('Row saved');
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save row');
    } finally {
      setSaving(false);
    }
  };

  const addRow = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const { data, error: insertError } = await supabase
        .from('master_list')
        .insert(EMPTY_ROW)
        .select()
        .single();
      if (insertError) throw insertError;
      setRows((prev) => [...prev, data as MasterRow]);
      setSaveMsg('New row added');
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add row');
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (rowId: string) => {
    if (!confirm('Delete this row permanently?')) return;
    try {
      const { error: deleteError } = await supabase
        .from('master_list')
        .delete()
        .eq('id', rowId);
      if (deleteError) throw deleteError;
      setRows((prev) => prev.filter((r) => r.id !== rowId));
      setDirtyRows((prev) => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete row');
    }
  };

  const importFromSheet = async () => {
    if (!confirm('This will import ALL data from the Google Sheet into the editable table. Existing rows will NOT be modified — new rows will be appended. Continue?')) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const res = await fetch(SHEET_IMPORT_URL, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      if (!res.ok) throw new Error(`Import failed (${res.status})`);
      const result = await res.json();
      setImportMsg(`Imported ${result.imported} rows from Google Sheets`);
      await fetchRows();
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const saveAllDirty = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const dirtyIds = Array.from(dirtyRows);
      for (const rowId of dirtyIds) {
        const row = rows.find((r) => r.id === rowId);
        if (!row) continue;
        const { id, ...updates } = row;
        void id;
        const { error: updateError } = await supabase
          .from('master_list')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', rowId);
        if (updateError) throw updateError;
      }
      setDirtyRows(new Set());
      setSaveMsg(`Saved ${dirtyIds.length} row(s)`);
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!authLoading && !isAdmin) {
    return (
      <div className="pt-32 container-prose text-center">
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>Admin access required.</p>
        <button onClick={() => navigate('/admin')} className="btn-primary">Back to Admin</button>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 container-prose animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <button onClick={() => navigate('/admin')} className="inline-flex items-center gap-1.5 text-sm mb-3 transition-colors" style={{ color: 'var(--color-text-muted)' }}>
            <ArrowLeft className="w-4 h-4" /> Admin Dashboard
          </button>
          <div className="flex items-center gap-2">
            <Table2 className="w-5 h-5" style={{ color: 'var(--color-teal-dark)' }} />
            <h1 className="font-serif text-3xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>Master NL BR List</h1>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {rows.length > 0 ? `${filtered.length} rows — click any cell to edit` : 'Editable spreadsheet — synced with Google Sheets'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors"
              style={{
                background: viewMode === 'grid' ? 'var(--color-teal-dark)' : 'var(--color-surface)',
                color: viewMode === 'grid' ? 'white' : 'var(--color-text-muted)',
              }}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grid
            </button>
            <button
              onClick={() => setViewMode('sheet')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors"
              style={{
                background: viewMode === 'sheet' ? 'var(--color-teal-dark)' : 'var(--color-surface)',
                color: viewMode === 'sheet' ? 'white' : 'var(--color-text-muted)',
              }}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Sheet
            </button>
          </div>
          <a href={SHEET_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">
            <ExternalLink className="w-4 h-4" /> Open Sheet
          </a>
          {viewMode === 'grid' && (
            <button onClick={importFromSheet} disabled={importing} className="btn-ghost text-sm">
              <Upload className="w-4 h-4" /> {importing ? 'Importing...' : 'Import from Sheet'}
            </button>
          )}
          {dirtyRows.size > 0 && viewMode === 'grid' && (
            <button onClick={saveAllDirty} disabled={saving} className="btn-primary text-sm">
              <Save className="w-4 h-4" /> Save All ({dirtyRows.size})
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#ef4444' }} />
          <p className="text-sm flex-1" style={{ color: '#ef4444' }}>{error}</p>
          <button onClick={() => setError(null)} style={{ color: '#ef4444' }}><X className="w-4 h-4" /></button>
        </div>
      )}

      {saveMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: 'rgba(20, 184, 166, 0.08)', border: '1px solid rgba(20, 184, 166, 0.2)' }}>
          <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-teal-dark)' }} />
          <p className="text-sm" style={{ color: 'var(--color-teal-dark)' }}>{saveMsg}</p>
        </div>
      )}

      {importMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: 'rgba(13, 148, 136, 0.08)', border: '1px solid rgba(13, 148, 136, 0.2)' }}>
          <Upload className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-teal-dark)' }} />
          <p className="text-sm" style={{ color: 'var(--color-teal-dark)' }}>{importMsg}</p>
          <button onClick={() => setImportMsg(null)} style={{ color: 'var(--color-teal-dark)' }}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search title, author, name, genre..."
            className="input-field pl-10"
          />
        </div>
        <button
          onClick={() => setShowAllCols(!showAllCols)}
          className="btn-ghost text-xs whitespace-nowrap"
          style={{ padding: '8px 12px' }}
        >
          {showAllCols ? 'Hide Extra Columns' : 'Show All Columns'}
        </button>
        <button onClick={fetchRows} disabled={loading} className="btn-ghost text-xs whitespace-nowrap" style={{ padding: '8px 12px' }}>
          <RotateCw className="w-3.5 h-3.5" /> Refresh
        </button>
        <button onClick={addRow} disabled={saving} className="btn-primary text-xs whitespace-nowrap" style={{ padding: '8px 12px' }}>
          <Plus className="w-3.5 h-3.5" /> Add Row
        </button>
      </div>

      {viewMode === 'sheet' && (
        <div className="surface-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <FileSpreadsheet className="w-4 h-4" style={{ color: 'var(--color-teal-dark)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Google Sheet — Editable</span>
            <a href={SHEET_URL} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs hover:underline" style={{ color: 'var(--color-cyan-dark)' }}>
              Open in full screen
            </a>
          </div>
          <iframe
            src="https://docs.google.com/spreadsheets/d/14PSrS1Jve37kI_3eNEr-9IojbzhyaLFEU3iqMRtiI-Q/edit?widget=true&headers=false&rm=minimal"
            title="Master NL BR List — Google Sheet"
            className="w-full"
            style={{ border: 'none', height: '70vh' }}
            allowFullScreen
          />
        </div>
      )}

      {viewMode === 'grid' && loading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--color-paper)' }} />
          ))}
        </div>
      )}

      {viewMode === 'grid' && !loading && (
        <>
          <div className="surface-card overflow-hidden">
            <div className="overflow-x-auto" style={{ maxHeight: '65vh' }}>
              <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
                <thead className="sticky top-0 z-20">
                  <tr style={{ background: 'var(--color-paper)' }}>
                    <th style={{ width: 50, minWidth: 50 }} className="text-center px-2 py-2 border-b-2" >
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Edit</span>
                    </th>
                    {visibleColumns.map((col) => (
                      <th
                        key={col.key}
                        className="text-left px-3 py-2 font-semibold whitespace-nowrap border-b-2"
                        style={{ color: 'var(--color-text)', width: col.width, minWidth: col.width, borderColor: 'var(--color-border)' }}
                      >
                        <span className="text-xs">{col.label}</span>
                      </th>
                    ))}
                    <th style={{ width: 50, minWidth: 50 }} className="text-center px-2 py-2 border-b-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Del</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={visibleColumns.length + 2} className="text-center py-12">
                        <Table2 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-text-muted)', opacity: 0.2 }} />
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          No rows yet. Click "Import from Sheet" to load your Google Sheet data, or "Add Row" to create one manually.
                        </p>
                      </td>
                    </tr>
                  )}
                  {pageRows.map((row, rowIdx) => (
                    <tr
                      key={row.id}
                      className="transition-colors"
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: dirtyRows.has(row.id) ? 'rgba(245, 158, 11, 0.04)' : rowIdx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                      }}
                    >
                      <td className="text-center px-2 py-1">
                        {dirtyRows.has(row.id) ? (
                          <button
                            onClick={() => saveRow(row.id)}
                            disabled={saving}
                            className="p-1 rounded transition-colors"
                            style={{ background: 'rgba(20, 184, 166, 0.1)', color: 'var(--color-teal-dark)' }}
                            title="Save this row"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.3 }}>
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                      {visibleColumns.map((col) => {
                        const isEditing = editingCell?.rowId === row.id && editingCell?.col === col.key;
                        const value = row[col.key];
                        return (
                          <td
                            key={col.key}
                            className="px-3 py-1 cursor-text"
                            style={{ minWidth: col.width, maxWidth: col.width }}
                            onClick={() => !isEditing && startEdit(row.id, col.key, value)}
                          >
                            {isEditing ? (
                              col.key === 'review' ? (
                                <textarea
                                  ref={editRef as React.RefObject<HTMLTextAreaElement>}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={commitEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') cancelEdit();
                                    if (e.key === 'Enter' && e.ctrlKey) commitEdit();
                                  }}
                                  className="w-full text-xs p-1 rounded outline-none resize-y"
                                  style={{
                                    background: 'var(--color-bg)',
                                    border: '2px solid var(--color-teal-dark)',
                                    minHeight: '60px',
                                    color: 'var(--color-text)',
                                  }}
                                  rows={3}
                                />
                              ) : (
                                <input
                                  ref={editRef as React.RefObject<HTMLInputElement>}
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={commitEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') cancelEdit();
                                    if (e.key === 'Enter') commitEdit();
                                  }}
                                  className="w-full text-xs p-1 rounded outline-none"
                                  style={{
                                    background: 'var(--color-bg)',
                                    border: '2px solid var(--color-teal-dark)',
                                    color: 'var(--color-text)',
                                  }}
                                />
                              )
                            ) : (
                              renderCellValue(value, col.key)
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center px-2 py-1">
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="p-1 rounded transition-colors hover:bg-red-50"
                          style={{ color: 'rgba(239, 68, 68, 0.4)' }}
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filtered.length > pageSize && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Showing {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="btn-ghost text-xs"
                  style={{ padding: '6px 10px', opacity: currentPage === 0 ? 0.4 : 1 }}
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="btn-ghost text-xs"
                  style={{ padding: '6px 10px', opacity: currentPage >= totalPages - 1 ? 0.4 : 1 }}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function renderCellValue(value: string, col: ColumnKey): React.ReactNode {
  if (!value) return <span style={{ color: 'var(--color-text-muted)', opacity: 0.2 }}>—</span>;

  if (col === 'instagram' && value) {
    const handle = value.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
    return (
      <a href={value.startsWith('http') ? value : `https://instagram.com/${handle}`} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline truncate block" style={{ color: 'var(--color-cyan-dark)' }}>
        {handle}
      </a>
    );
  }

  if (col === 'amazon_link' && value) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: 'var(--color-cyan-dark)' }}>
        Link
      </a>
    );
  }

  if (col === 'book_cover' && value) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: 'var(--color-cyan-dark)' }}>
        View
      </a>
    );
  }

  if (col === 'review') {
    return (
      <span className="text-xs block truncate" style={{ color: 'var(--color-text-muted)', maxWidth: 280 }} title={value}>
        {value.slice(0, 120)}{value.length > 120 ? '...' : ''}
      </span>
    );
  }

  if (col === 'reviewers_rating' && value) {
    return <span className="text-xs font-bold" style={{ color: 'var(--color-teal-dark)' }}>{value}/10</span>;
  }

  if (col === 'status' && value) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(13, 148, 136, 0.1)', color: 'var(--color-teal-dark)' }}>
        {value}
      </span>
    );
  }

  return <span className="text-xs truncate block" style={{ color: 'var(--color-text)' }}>{value}</span>;
}
