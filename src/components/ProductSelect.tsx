import { useState, useEffect } from 'react';
import { isSupabaseConfigured } from '../services/supabaseClient';
import type { ComponentData, Document } from '../services/componentService';
import { getProducts, getComponentsForProduct, loadComponentImages, COMPONENT_METADATA, getMissingMandatoryComponents } from '../services/componentService';
import { getComponentSummary } from '../utils/promptBuilder';

interface ProductSelectProps {
  onProductSelect: (product: Document, components: ComponentData[]) => void;
  isDarkMode?: boolean;
}

// Helper to get display name for document
function getDocumentDisplayName(doc: Document): string {
  return doc.name || doc.title || doc.brand_name || `Document ${doc.id.substring(0, 8)}`;
}

export function ProductSelect({ onProductSelect, isDarkMode = false }: ProductSelectProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [components, setComponents] = useState<ComponentData[] | null>(null);
  const [summary, setSummary] = useState<ReturnType<typeof getComponentSummary> | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageLoadProgress, setImageLoadProgress] = useState({ loaded: 0, total: 0 });

  // Fetch documents on mount
  useEffect(() => {
    async function fetchDocuments() {
      if (!isSupabaseConfigured()) {
        setError('Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
        setLoadingDocs(false);
        return;
      }

      try {
        const data = await getProducts();
        setDocuments(data);
        console.log('Documents loaded:', data);
      } catch (err) {
        setError('Failed to load documents');
        console.error(err);
      } finally {
        setLoadingDocs(false);
      }
    }

    fetchDocuments();
  }, []);

  // Fetch components when document is selected
  const handleDocumentChange = async (docId: string) => {
    setSelectedDocId(docId);
    setComponents(null);
    setSummary(null);

    if (!docId) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Get component metadata
      const data = await getComponentsForProduct(docId);
      setComponents(data);
      setSummary(getComponentSummary(data));

      // Step 2: Load actual image data (convert URLs to base64)
      setLoadingImages(true);
      setImageLoadProgress({ loaded: 0, total: data.filter(c => c.image_path).length });

      const dataWithImages = await loadComponentImages(data, (loaded, total) => {
        setImageLoadProgress({ loaded, total });
      });

      setComponents(dataWithImages);
      setSummary(getComponentSummary(dataWithImages));
      setLoadingImages(false);

      // Step 3: Pass to parent with loaded images
      const doc = documents.find(d => d.id === docId);
      if (doc) {
        onProductSelect(doc, dataWithImages);
      }
    } catch (err) {
      setError('Failed to load components');
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingImages(false);
    }
  };

  const missingMandatory = components ? getMissingMandatoryComponents(components) : [];

  return (
    <div className="space-y-4">
      {/* Document Dropdown */}
      <div>
        <label className={`block text-xs font-medium mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Select Document
        </label>
        <select
          value={selectedDocId}
          onChange={(e) => handleDocumentChange(e.target.value)}
          disabled={loading || loadingDocs}
          className={`w-full px-3 py-2.5 border rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400
                     transition-all duration-150 cursor-pointer
                     ${isDarkMode
                       ? 'bg-slate-700 border-slate-600 text-slate-200'
                       : 'bg-white border-slate-200 text-slate-800'
                     }
                     ${loading || loadingDocs ? 'opacity-50' : ''}`}
        >
          <option value="">{loadingDocs ? 'Loading documents...' : '-- Select a document --'}</option>
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {getDocumentDisplayName(doc)}
            </option>
          ))}
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className={`p-3 rounded-lg text-sm ${
          isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'
        }`}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && !loadingImages && (
        <div className={`p-4 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2"></div>
          Loading components...
        </div>
      )}

      {/* Image Loading Progress */}
      {loadingImages && (
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
            <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Loading images... {imageLoadProgress.loaded}/{imageLoadProgress.total}
            </span>
          </div>
          <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${imageLoadProgress.total > 0 ? (imageLoadProgress.loaded / imageLoadProgress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Component Summary */}
      {summary && !loading && (
        <div className={`p-4 rounded-lg border ${
          isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'
        }`}>
          <h4 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Components Loaded
          </h4>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className={`text-center p-2 rounded ${isDarkMode ? 'bg-slate-600' : 'bg-white'}`}>
              <div className={`text-lg font-bold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                {summary.total}
              </div>
              <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total</div>
            </div>
            <div className={`text-center p-2 rounded ${isDarkMode ? 'bg-slate-600' : 'bg-white'}`}>
              <div className={`text-lg font-bold ${
                summary.mandatory.present === summary.mandatory.total
                  ? isDarkMode ? 'text-green-300' : 'text-green-600'
                  : isDarkMode ? 'text-amber-300' : 'text-amber-600'
              }`}>
                {summary.mandatory.present}/{summary.mandatory.total}
              </div>
              <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Mandatory</div>
            </div>
            <div className={`text-center p-2 rounded ${isDarkMode ? 'bg-slate-600' : 'bg-white'}`}>
              <div className={`text-lg font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                {summary.hasImages}
              </div>
              <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Images</div>
            </div>
          </div>

          {/* Section Breakdown */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            {Object.entries(summary.bySection).map(([section, count]) => (
              <div key={section} className={`flex items-center justify-between px-2 py-1 rounded ${
                isDarkMode ? 'bg-slate-600' : 'bg-white'
              }`}>
                <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{section}</span>
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{count}</span>
              </div>
            ))}
          </div>

          {/* Missing Mandatory Warning */}
          {missingMandatory.length > 0 && (
            <div className={`mt-3 p-2 rounded text-xs ${
              isDarkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-700'
            }`}>
              <strong>Missing mandatory:</strong>{' '}
              {missingMandatory.map(id => COMPONENT_METADATA[id].name).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Component Details (Expandable) */}
      {components && components.length > 0 && !loading && (
        <details className={`rounded-lg border ${
          isDarkMode ? 'border-slate-600' : 'border-slate-200'
        }`}>
          <summary className={`px-4 py-2 cursor-pointer text-sm font-medium ${
            isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'
          }`}>
            View Component Details ({components.length})
          </summary>
          <div className={`px-4 py-2 max-h-60 overflow-y-auto border-t ${
            isDarkMode ? 'border-slate-600' : 'border-slate-200'
          }`}>
            <div className="space-y-2">
              {components.map((comp) => {
                const meta = COMPONENT_METADATA[comp.component_id];
                return (
                  <div key={comp.id} className={`flex items-start gap-2 text-xs p-2 rounded ${
                    isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'
                  }`}>
                    <span className={`px-1.5 py-0.5 rounded font-mono ${
                      meta.criticality === 'MANDATORY'
                        ? isDarkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'
                        : isDarkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {comp.component_id}
                    </span>
                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                      {meta.name}
                    </span>
                    {comp.content && (
                      <span className={`flex-1 truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {comp.content.substring(0, 50)}...
                      </span>
                    )}
                    {(comp.image_path || comp.image_base64) && (
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        isDarkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                      }`}>
                        IMG
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

export default ProductSelect;
