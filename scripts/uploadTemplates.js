#!/usr/bin/env node
/**
 * uploadTemplates.js
 * Batch-uploads all LWC components from the Galaxy library into Supabase.
 *
 * Usage: node scripts/uploadTemplates.js
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ─── Config ────────────────────────────────────────────────────────────────

const GALAXY_ROOT = '/Users/rohithpavan/Desktop/Galaxy/LWC';
const BATCH_SIZE = 50;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function readFile(filePath) {
  try {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf-8');
  } catch { /* ignore */ }
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Component Reader ──────────────────────────────────────────────────────

function readComponent(categoryDir, componentFolder) {
  const compDir = path.join(categoryDir, componentFolder);
  const metaPath = path.join(compDir, 'metadata.json');

  const metaRaw = readFile(metaPath);
  if (!metaRaw) return null;

  let meta;
  try {
    meta = JSON.parse(metaRaw);
  } catch {
    return null;
  }

  // Skip components flagged for manual review
  if (meta.needsManualReview) return null;

  const name = meta.name || meta.componentName || componentFolder;

  // Read LWC source files
  const lwcHtml = readFile(path.join(compDir, `${name}.html`));
  const lwcJs = readFile(path.join(compDir, `${name}.js`));
  const lwcCss = readFile(path.join(compDir, `${name}.css`));
  const lwcMetaXml = readFile(path.join(compDir, `${name}.js-meta.xml`));

  // Read preview HTML (used for iframe srcdoc rendering)
  const htmlContent = readFile(path.join(compDir, 'preview', 'index.html'));

  // At minimum we need the preview HTML to be useful
  if (!htmlContent && !lwcHtml) return null;

  return {
    name,
    component_name: name,
    category: meta.category || path.basename(categoryDir),
    tags: meta.tags || [],
    complexity: meta.complexity || 'beginner',
    has_animation: meta.hasAnimation || false,
    has_interaction: meta.hasInteraction || false,
    has_javascript: meta.hasJavaScript || false,
    needs_manual_review: false,
    original_folder: meta.originalFolder || componentFolder,
    original_author: meta.originalAuthor || null,
    description: meta.description || null,
    html_content: htmlContent,
    lwc_html: lwcHtml,
    lwc_js: lwcJs,
    lwc_css: lwcCss,
    lwc_meta_xml: lwcMetaXml,
    is_active: true,
    is_featured: false,
    view_count: 0,
    use_count: 0,
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀  LWC Studio — Template Upload Script');
  console.log(`📁  Source: ${GALAXY_ROOT}\n`);

  if (!fs.existsSync(GALAXY_ROOT)) {
    console.error(`❌  Galaxy root not found: ${GALAXY_ROOT}`);
    process.exit(1);
  }

  // Collect all components
  const categories = fs.readdirSync(GALAXY_ROOT).filter((d) =>
    fs.statSync(path.join(GALAXY_ROOT, d)).isDirectory()
  );

  const allComponents = [];
  const skipped = [];

  for (const category of categories) {
    const categoryDir = path.join(GALAXY_ROOT, category);
    const componentFolders = fs.readdirSync(categoryDir).filter((d) =>
      fs.statSync(path.join(categoryDir, d)).isDirectory()
    );

    let catCount = 0;
    for (const folder of componentFolders) {
      const comp = readComponent(categoryDir, folder);
      if (comp) {
        allComponents.push(comp);
        catCount++;
      } else {
        skipped.push(`${category}/${folder}`);
      }
    }
    console.log(`  📂  ${category}: ${catCount} components ready`);
  }

  console.log(`\n✅  Total: ${allComponents.length} components to upload`);
  if (skipped.length > 0) {
    console.log(`⚠️   Skipped: ${skipped.length} (missing metadata or flagged for review)`);
  }

  // Batch upsert
  const totalBatches = Math.ceil(allComponents.length / BATCH_SIZE);
  let successCount = 0;
  let errorCount = 0;

  console.log(`\n⬆️   Uploading in ${totalBatches} batches of ${BATCH_SIZE}...\n`);

  for (let i = 0; i < allComponents.length; i += BATCH_SIZE) {
    const batch = allComponents.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    try {
      const { error } = await supabase
        .from('templates')
        .upsert(batch, { onConflict: 'component_name', ignoreDuplicates: false });

      if (error) {
        console.error(`  ❌  Batch ${batchNum}/${totalBatches} FAILED: ${error.message}`);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        const pct = Math.round((successCount / allComponents.length) * 100);
        const first = batch[0].component_name;
        const last = batch[batch.length - 1].component_name;
        console.log(`  ✅  Batch ${batchNum}/${totalBatches} [${first} → ${last}] — ${pct}% complete`);
      }
    } catch (err) {
      console.error(`  💥  Batch ${batchNum}/${totalBatches} crashed: ${err.message}`);
      errorCount += batch.length;
    }

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < allComponents.length) await sleep(200);
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`🎯  Upload complete!`);
  console.log(`   ✅  Success: ${successCount}`);
  if (errorCount > 0) console.log(`   ❌  Errors: ${errorCount}`);
  console.log('─────────────────────────────────────────\n');

  if (errorCount === 0) {
    console.log('🏆  All components uploaded successfully! Your gallery is ready.\n');
  } else {
    console.log('⚠️  Some components failed — re-run the script to retry (upsert is idempotent).\n');
  }
}

main().catch((err) => {
  console.error('💥  Fatal error:', err);
  process.exit(1);
});
