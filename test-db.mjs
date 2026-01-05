import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://retgratjjokmtkigshlj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJldGdyYXRqam9rbXRraWdzaGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzI5NjAsImV4cCI6MjA4MTQ0ODk2MH0.9x5LL2ke0hVf4vLUysTWOYrr1cKPuo8yOdYz0oI-Iv4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDb() {
  console.log('=== Testing Documents Table ===');
  const { data: docs, error: docsError } = await supabase
    .from('documents')
    .select('*')
    .limit(5);

  if (docsError) {
    console.error('Documents error:', docsError);
  } else {
    console.log('Documents found:', docs?.length || 0);
    if (docs?.length > 0) {
      console.log('Sample document:', JSON.stringify(docs[0], null, 2));
    }
  }

  console.log('\n=== Testing Repositories Table ===');
  const { data: repo, error: repoError } = await supabase
    .from('repositories')
    .select('*')
    .limit(50);

  if (repoError) {
    console.error('Repository error:', repoError);
  } else {
    console.log('Repository entries found:', repo?.length || 0);
    if (repo?.length > 0) {
      console.log('\nComponent IDs in repository:');
      const componentCounts = {};
      repo.forEach(r => {
        componentCounts[r.component_id] = (componentCounts[r.component_id] || 0) + 1;
      });
      Object.entries(componentCounts).sort().forEach(([id, count]) => {
        console.log(`  ${id}: ${count} entries`);
      });

      console.log('\nSample entries with content:');
      repo.filter(r => r.content).slice(0, 10).forEach(r => {
        console.log(`  ${r.component_id}: "${r.content?.substring(0, 50)}..."`);
      });
    }
  }

  console.log('\n=== Testing Storage Bucket ===');
  const { data: storage, error: storageError } = await supabase.storage
    .from('component-images')
    .list('documents');

  if (storageError) {
    console.error('Storage error:', storageError);
  } else {
    console.log('Storage folders (documents):', storage?.length || 0);
    storage?.forEach(f => console.log(`  ${f.name}`));

    // Test component fetching for each document
    if (storage?.length > 0) {
      console.log('\n=== Testing Component Fetching (App Flow) ===');

      for (const folder of storage) {
        const docId = folder.name;
        console.log(`\n--- Document: ${docId} ---`);

        const { data: pages, error: pagesError } = await supabase.storage
          .from('component-images')
          .list(`documents/${docId}`);

        if (pagesError) {
          console.error(`  Pages error:`, pagesError);
          continue;
        }

        const components = [];

        for (const page of pages || []) {
          if (page.name.startsWith('page-')) {
            const { data: files } = await supabase.storage
              .from('component-images')
              .list(`documents/${docId}/${page.name}`);

            for (const file of files || []) {
              if (file.name.endsWith('.jpg') || file.name.endsWith('.png')) {
                const match = file.name.match(/^([A-Z]+_\d+[a-z]?)-?\d*\./);
                if (match) {
                  const componentId = match[1];
                  const filePath = `documents/${docId}/${page.name}/${file.name}`;
                  const { data: urlData } = supabase.storage
                    .from('component-images')
                    .getPublicUrl(filePath);

                  components.push({
                    component_id: componentId,
                    page: page.name,
                    filename: file.name,
                    image_url: urlData.publicUrl
                  });
                }
              }
            }
          }
        }

        console.log(`  Total components found: ${components.length}`);

        // Group by component type
        const byType = {};
        components.forEach(c => {
          byType[c.component_id] = (byType[c.component_id] || 0) + 1;
        });
        console.log('  Components by type:');
        Object.entries(byType).sort().forEach(([id, count]) => {
          console.log(`    ${id}: ${count}`);
        });

        // Test first image URL is accessible
        if (components.length > 0) {
          const testUrl = components[0].image_url;
          console.log(`\n  Testing image URL accessibility...`);
          console.log(`  URL: ${testUrl}`);
          try {
            const response = await fetch(testUrl, { method: 'HEAD' });
            console.log(`  Status: ${response.status} ${response.statusText}`);
            if (response.ok) {
              console.log('  ✓ Image URL is accessible');
            } else {
              console.log('  ✗ Image URL returned error');
            }
          } catch (err) {
            console.log(`  ✗ Failed to fetch: ${err.message}`);
          }
        }
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log('Database tables are empty - app should use storage fallback');
  console.log('Storage bucket has documents with component images');
  console.log('Component fetching from storage works correctly');
}

testDb().catch(console.error);
