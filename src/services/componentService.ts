import { supabase, isSupabaseConfigured } from './supabaseClient';

// Component sections based on SOMA 53 component spec
export type ComponentSection =
  | 'INIT'  // Brand (9 components)
  | 'INS'   // Insight (4 components)
  | 'SOL'   // Solution (7 components)
  | 'EVID'  // Evidence (10 components)
  | 'SAFE'  // Safety (5 components)
  | 'SERV'  // Services (4 components)
  | 'COMM'  // Commerce (5 components)
  | 'REG';  // Regulatory (9 components)

export type ComponentType = 'Text' | 'Image' | 'Data' | 'Image+Data';

export type Criticality = 'MANDATORY' | 'IMPORTANT' | 'CORE' | 'SUPPORTING' | 'OPTIONAL' | 'CONDITIONAL';

// All 53 component IDs
export const COMPONENT_IDS = [
  // Brand (INIT) - 9
  'INIT_01a', 'INIT_01b', 'INIT_02', 'INIT_03', 'INIT_04', 'INIT_05', 'INIT_06', 'INIT_07', 'INIT_08', 'INIT_09',
  // Insight (INS) - 4
  'INS_01', 'INS_02', 'INS_03', 'INS_04',
  // Solution (SOL) - 7
  'SOL_01', 'SOL_02', 'SOL_03', 'SOL_04', 'SOL_05', 'SOL_06', 'SOL_07',
  // Evidence (EVID) - 10
  'EVID_01', 'EVID_02', 'EVID_03', 'EVID_04', 'EVID_05', 'EVID_06', 'EVID_07', 'EVID_08', 'EVID_09', 'EVID_10',
  // Safety (SAFE) - 5
  'SAFE_01', 'SAFE_02', 'SAFE_03', 'SAFE_04', 'SAFE_05',
  // Services (SERV) - 4
  'SERV_01', 'SERV_02', 'SERV_03', 'SERV_04',
  // Commerce (COMM) - 5
  'COMM_01', 'COMM_02', 'COMM_03', 'COMM_04', 'COMM_05',
  // Regulatory (REG) - 9
  'REG_01', 'REG_02', 'REG_03', 'REG_04', 'REG_05', 'REG_06', 'REG_07', 'REG_08', 'REG_09',
] as const;

export type ComponentId = typeof COMPONENT_IDS[number];

// Component metadata (name, criticality, type)
export const COMPONENT_METADATA: Record<ComponentId, { name: string; criticality: Criticality; type: ComponentType; section: ComponentSection }> = {
  // Brand (INIT)
  INIT_01a: { name: 'Brand Root Name', criticality: 'MANDATORY', type: 'Text', section: 'INIT' },
  INIT_01b: { name: 'Brand Variant', criticality: 'MANDATORY', type: 'Text', section: 'INIT' },
  INIT_02: { name: 'Brand Logo', criticality: 'MANDATORY', type: 'Image', section: 'INIT' },
  INIT_03: { name: 'Main Headline', criticality: 'CORE', type: 'Text', section: 'INIT' },
  INIT_04: { name: 'Key Visual (Patient)', criticality: 'CORE', type: 'Image', section: 'INIT' },
  INIT_05: { name: 'Key Visual (Abstract)', criticality: 'SUPPORTING', type: 'Image', section: 'INIT' },
  INIT_06: { name: 'Tagline/Slogan', criticality: 'CORE', type: 'Text', section: 'INIT' },
  INIT_07: { name: 'Campaign Logo', criticality: 'OPTIONAL', type: 'Image', section: 'INIT' },
  INIT_08: { name: 'HCP Image', criticality: 'SUPPORTING', type: 'Image', section: 'INIT' },
  INIT_09: { name: 'Heritage Statement', criticality: 'OPTIONAL', type: 'Text', section: 'INIT' },
  // Insight (INS)
  INS_01: { name: 'Target Patient Profile', criticality: 'SUPPORTING', type: 'Text', section: 'INS' },
  INS_02: { name: 'Disease Overview', criticality: 'SUPPORTING', type: 'Text', section: 'INS' },
  INS_03: { name: 'Risk Factors', criticality: 'SUPPORTING', type: 'Text', section: 'INS' },
  INS_04: { name: 'Indication Statement', criticality: 'MANDATORY', type: 'Text', section: 'INS' },
  // Solution (SOL)
  SOL_01: { name: 'USP/Claims', criticality: 'MANDATORY', type: 'Text', section: 'SOL' },
  SOL_02: { name: 'Generic Name/Composition', criticality: 'MANDATORY', type: 'Text', section: 'SOL' },
  SOL_03: { name: 'MOA Diagram', criticality: 'CORE', type: 'Image', section: 'SOL' },
  SOL_04: { name: 'MOA Text', criticality: 'SUPPORTING', type: 'Text', section: 'SOL' },
  SOL_05: { name: 'Formulation Technology', criticality: 'SUPPORTING', type: 'Text', section: 'SOL' },
  SOL_06: { name: 'Route/Dosage Form', criticality: 'CORE', type: 'Text', section: 'SOL' },
  SOL_07: { name: 'Mnemonic', criticality: 'OPTIONAL', type: 'Text', section: 'SOL' },
  // Evidence (EVID)
  EVID_01: { name: 'Efficacy Claims', criticality: 'IMPORTANT', type: 'Text', section: 'EVID' },
  EVID_02: { name: 'Chart Data', criticality: 'IMPORTANT', type: 'Image+Data', section: 'EVID' },
  EVID_03: { name: 'Study Summary', criticality: 'IMPORTANT', type: 'Text', section: 'EVID' },
  EVID_04: { name: 'Comparative Table', criticality: 'SUPPORTING', type: 'Image+Data', section: 'EVID' },
  EVID_05: { name: 'Guideline Text', criticality: 'CORE', type: 'Text', section: 'EVID' },
  EVID_06: { name: 'Guideline Logo', criticality: 'SUPPORTING', type: 'Image', section: 'EVID' },
  EVID_07: { name: 'Expert Quote', criticality: 'OPTIONAL', type: 'Text', section: 'EVID' },
  EVID_08: { name: 'Case Study', criticality: 'OPTIONAL', type: 'Text', section: 'EVID' },
  EVID_09: { name: 'Certification Badge', criticality: 'OPTIONAL', type: 'Image', section: 'EVID' },
  EVID_10: { name: 'Treatment Algorithm', criticality: 'SUPPORTING', type: 'Image', section: 'EVID' },
  // Safety (SAFE)
  SAFE_01: { name: 'Dosage Information', criticality: 'MANDATORY', type: 'Text', section: 'SAFE' },
  SAFE_02: { name: 'Strength/Forms', criticality: 'MANDATORY', type: 'Text', section: 'SAFE' },
  SAFE_03: { name: 'Safety Claims', criticality: 'CORE', type: 'Text', section: 'SAFE' },
  SAFE_04: { name: 'Side Effects', criticality: 'CORE', type: 'Text', section: 'SAFE' },
  SAFE_05: { name: 'Contraindications', criticality: 'CORE', type: 'Text', section: 'SAFE' },
  // Services (SERV)
  SERV_01: { name: 'Digital Service Name', criticality: 'OPTIONAL', type: 'Text', section: 'SERV' },
  SERV_02: { name: 'QR Code', criticality: 'SUPPORTING', type: 'Image', section: 'SERV' },
  SERV_03: { name: 'Digital Avatar', criticality: 'OPTIONAL', type: 'Image', section: 'SERV' },
  SERV_04: { name: 'Service Tagline', criticality: 'OPTIONAL', type: 'Text', section: 'SERV' },
  // Commerce (COMM)
  COMM_01: { name: 'Price/MRP', criticality: 'OPTIONAL', type: 'Text', section: 'COMM' },
  COMM_02: { name: 'Packshot', criticality: 'CORE', type: 'Image', section: 'COMM' },
  COMM_03: { name: 'Company Name', criticality: 'MANDATORY', type: 'Text', section: 'COMM' },
  COMM_04: { name: 'Company Logo', criticality: 'MANDATORY', type: 'Image', section: 'COMM' },
  COMM_05: { name: 'Division Name', criticality: 'SUPPORTING', type: 'Text', section: 'COMM' },
  // Regulatory (REG)
  REG_01: { name: 'Abbreviated PI', criticality: 'MANDATORY', type: 'Text', section: 'REG' },
  REG_02: { name: 'References', criticality: 'MANDATORY', type: 'Text', section: 'REG' },
  REG_03: { name: 'Citation Markers', criticality: 'MANDATORY', type: 'Data', section: 'REG' },
  REG_04: { name: 'Schedule Warning', criticality: 'CONDITIONAL', type: 'Image', section: 'REG' },
  REG_05: { name: 'RMP Disclaimer', criticality: 'MANDATORY', type: 'Text', section: 'REG' },
  REG_06: { name: 'Batch Reference', criticality: 'OPTIONAL', type: 'Text', section: 'REG' },
  REG_07: { name: 'Document Code', criticality: 'SUPPORTING', type: 'Text', section: 'REG' },
  REG_08: { name: 'Address', criticality: 'SUPPORTING', type: 'Text', section: 'REG' },
  REG_09: { name: 'Abbreviations', criticality: 'SUPPORTING', type: 'Data', section: 'REG' },
};

// Component data from Supabase repository table
export interface ComponentData {
  id: string;
  product_id: string;
  component_id: ComponentId;
  content: string | null;        // Text content
  image_path: string | null;     // Image URL/path
  image_base64: string | null;   // Base64 image data
  bbox: number[] | null;         // Bounding box [ymin, xmin, ymax, xmax]
  metadata: Record<string, unknown> | null;  // Additional fields per component spec
  created_at: string;
  updated_at: string;
}

// Document info (from Supabase documents table)
export interface Document {
  id: string;
  name?: string;
  title?: string;
  brand_name?: string;
  company_name?: string;
  created_at?: string;
  // Additional fields will be discovered at runtime
  [key: string]: unknown;
}

/**
 * Fetch all documents from Supabase
 */
export async function getDocuments(): Promise<Document[]> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured');
    return [];
  }

  console.log('Fetching documents from Supabase...');

  const { data, error, status, statusText } = await supabase
    .from('documents')
    .select('*');

  console.log('Documents query result:', { status, statusText, dataLength: data?.length, error });

  if (error) {
    console.error('Error fetching documents:', error);
    // Don't throw - return empty array so UI still works
    return [];
  }

  // Log schema for debugging
  if (data && data.length > 0) {
    console.log('Document schema:', Object.keys(data[0]));
    console.log('Sample document:', data[0]);
  } else {
    console.log('No documents found in table');
  }

  return data || [];
}

/**
 * Fallback: List documents from Storage bucket if documents table is empty
 */
export async function getDocumentsFromStorage(): Promise<Document[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  console.log('Listing documents from Storage...');

  const { data: folders, error } = await supabase.storage
    .from('component-images')
    .list('documents');

  if (error) {
    console.error('Error listing documents from storage:', error);
    return [];
  }

  console.log('Storage folders found:', folders);

  // Convert folder names to document objects
  // Folders have id: null but have a name (the UUID)
  const documents: Document[] = (folders || [])
    .filter(f => f.name && !f.name.includes('.')) // Filter out files, keep folders
    .map(folder => ({
      id: folder.name,
      name: `Document ${folder.name.substring(0, 8)}...`,
      created_at: folder.created_at || undefined,
    }));

  console.log('Converted to documents:', documents);
  return documents;
}

// Legacy alias for compatibility
export type Product = Document;

// Smart getProducts - try database first, then storage
export async function getProducts(): Promise<Document[]> {
  // Try database first
  const dbDocs = await getDocuments();
  if (dbDocs.length > 0) {
    return dbDocs;
  }

  // Fallback to storage listing
  console.log('No documents in DB, trying storage...');
  return getDocumentsFromStorage();
}

/**
 * Fetch all components for a specific document from Storage
 * Components are stored in: component-images/documents/{docId}/page-{n}/{COMPONENT_ID}-{index}.jpg
 */
export async function getComponentsForProduct(documentId: string): Promise<ComponentData[]> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn('Supabase not configured');
    return [];
  }

  const components: ComponentData[] = [];
  const bucket = 'component-images';

  try {
    // List all pages for this document
    const { data: pages, error: pagesError } = await supabase.storage
      .from(bucket)
      .list(`documents/${documentId}`);

    if (pagesError) {
      console.error('Error listing pages:', pagesError);
      throw pagesError;
    }

    console.log('Pages found:', pages);

    // For each page folder, list the component images
    for (const page of pages || []) {
      if (page.name.startsWith('page-')) {
        const { data: files, error: filesError } = await supabase.storage
          .from(bucket)
          .list(`documents/${documentId}/${page.name}`);

        if (filesError) {
          console.error(`Error listing files in ${page.name}:`, filesError);
          continue;
        }

        console.log(`Files in ${page.name}:`, files);

        // Parse component images
        for (const file of files || []) {
          if (file.name.endsWith('.jpg') || file.name.endsWith('.png')) {
            // Parse component ID from filename (e.g., "INIT_03-1.jpg" -> "INIT_03")
            const match = file.name.match(/^([A-Z]+_\d+[a-z]?)-?\d*\./);
            if (match) {
              const componentId = match[1] as ComponentId;
              const filePath = `documents/${documentId}/${page.name}/${file.name}`;

              // Get public URL for the image
              const { data: urlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

              components.push({
                id: `${documentId}-${page.name}-${file.name}`,
                product_id: documentId,
                component_id: componentId,
                content: null,
                image_path: urlData.publicUrl,
                image_base64: null,
                bbox: null,
                metadata: { page: page.name, filename: file.name },
                created_at: file.created_at || '',
                updated_at: file.updated_at || file.created_at || '',
              });
            }
          }
        }
      }
    }

    console.log('Components found:', components.length);
    return components;
  } catch (err) {
    console.error('Error fetching components:', err);
    throw err;
  }
}

/**
 * Fetch specific component by ID for a product
 */
export async function getComponent(productId: string, componentId: ComponentId): Promise<ComponentData | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('repositories')
    .select('*')
    .eq('product_id', productId)
    .eq('component_id', componentId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Not found is ok
      console.error('Error fetching component:', error);
    }
    return null;
  }

  return data;
}

/**
 * Get components grouped by section
 */
export function groupComponentsBySection(components: ComponentData[]): Record<ComponentSection, ComponentData[]> {
  const grouped: Record<ComponentSection, ComponentData[]> = {
    INIT: [], INS: [], SOL: [], EVID: [], SAFE: [], SERV: [], COMM: [], REG: []
  };

  for (const comp of components) {
    const meta = COMPONENT_METADATA[comp.component_id];
    if (meta) {
      grouped[meta.section].push(comp);
    }
  }

  return grouped;
}

/**
 * Get mandatory components that are missing
 */
export function getMissingMandatoryComponents(components: ComponentData[]): ComponentId[] {
  const presentIds = new Set(components.map(c => c.component_id));
  const missing: ComponentId[] = [];

  for (const [id, meta] of Object.entries(COMPONENT_METADATA)) {
    if (meta.criticality === 'MANDATORY' && !presentIds.has(id as ComponentId)) {
      missing.push(id as ComponentId);
    }
  }

  return missing;
}

/**
 * Fetch image from URL and convert to base64
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch image: ${url}`);
      return null;
    }

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Error fetching image ${url}:`, error);
    return null;
  }
}

/**
 * Load base64 image data for all components that have image_path but no image_base64
 * Call this after getComponentsForProduct to populate image data
 */
export async function loadComponentImages(
  components: ComponentData[],
  onProgress?: (loaded: number, total: number) => void
): Promise<ComponentData[]> {
  const componentsWithImages = components.filter(c => c.image_path && !c.image_base64);
  const total = componentsWithImages.length;
  let loaded = 0;

  console.log(`Loading ${total} component images...`);

  // Process in batches to avoid overwhelming the browser
  const batchSize = 5;
  const results = [...components];

  for (let i = 0; i < componentsWithImages.length; i += batchSize) {
    const batch = componentsWithImages.slice(i, i + batchSize);

    await Promise.all(batch.map(async (comp) => {
      const base64 = await fetchImageAsBase64(comp.image_path!);
      if (base64) {
        // Find and update the component in results
        const idx = results.findIndex(c => c.id === comp.id);
        if (idx !== -1) {
          results[idx] = { ...results[idx], image_base64: base64 };
        }
      }
      loaded++;
      onProgress?.(loaded, total);
    }));
  }

  console.log(`Loaded ${loaded} images`);
  return results;
}
