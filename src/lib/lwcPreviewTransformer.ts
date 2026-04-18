export interface LWCFiles {
  html: string;
  js: string;
  css: string;
}

export interface PreviewResult {
  html: string;
  warnings: string[];
}

export function transformLWCToPreview(files: LWCFiles): PreviewResult {
  const warnings: string[] = [];

  // Step 9: Extract and preserve JS state for initial bindings mappings
  const state = extractState(files.js, warnings);

  // Steps 1 to 8: Transform HTML template tags & bindings
  const transformedHtml = transformHTML(files.html, state);

  // Safe JS Extraction (Minimal environment bounds for the preview iframe)
  const safeJs = `
    // Minimal safe environment initialized via LivePreview
    console.log('LWC Preview Initialized safely.');
  `;

  // Step 10: Assemble final HTML document embedding remote styles
  const finalHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Salesforce SLDS CSS -->
  <link rel="stylesheet" href="https://assets.b2c.com/is/content/GS1US/slds-2.25.3.min.css" onerror="this.onerror=null;this.href='https://cdnjs.cloudflare.com/ajax/libs/salesforce-lightning-design-system/2.25.3/styles/salesforce-lightning-design-system.min.css';" />
  
  <!-- FontAwesome for Icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

  <style>
    * { box-sizing: border-box; }
    body { 
      margin: 0; 
      padding: 16px;
      font-family: 'Salesforce Sans', Arial, sans-serif;
      background: #f3f3f3;
      min-height: 100vh;
    }
    .lwc-preview-placeholder {
      background: #f4f6f9;
      border: 1px dashed #c9c9c9;
      border-radius: 4px;
      padding: 8px 12px;
      color: #706e6b;
      font-size: 12px;
      text-align: center;
      margin: 4px 0;
    }
    .preview-dynamic { cursor: default; }
    
    /* Injected Component CSS */
    ${files.css}
  </style>
</head>
<body>
  ${transformedHtml}

  <script>
    ${safeJs}
  </script>
</body>
</html>`;

  return { html: finalHtml, warnings };
}

/** Helper Functions **/

function extractState(js: string, warnings: string[]): Record<string, string> {
  const state: Record<string, string> = {};
  
  if (js && js.includes('this.template.querySelector')) warnings.push('DOM queries skipped in preview.');
  if (js && js.includes('@wire')) warnings.push('@wire adapters skipped in preview.');
  if (js && js.includes(' connectedCallback')) warnings.push('connectedCallback logic skipped in preview.');

  if (!js) return state;

  // Extract primary state initializers mapping
  const lines = js.split('\n');
  lines.forEach(line => {
    const match = line.match(/^\s*(?:(?:@api|@track)\s+)?([a-zA-Z0-9_]+)\s*=\s*(.*?);/);
    if (match) {
      let val = match[2].trim();
      // Remove wrapper quotes to directly inject bare strings
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.substring(1, val.length - 1);
      }
      state[match[1]] = val;
    }
  });

  return state;
}

function transformHTML(html: string, state: Record<string, string>): string {
  if (!html) return '';
  let doc = html.trim();
  
  // Step 1 - Extract LWC template content inside <template>
  doc = doc.replace(/^<template[^>]*>([\s\S]*)<\/template>$/i, '$1');

  // Step 7 - Transform LWC directives entirely
  const directives = ['lwc:ref', 'lwc:key', 'lwc:spread', 'key', 'for:index', 'iterator:it'];
  directives.forEach(dir => {
    const regex = new RegExp(`\\s+${dir}=(?:\"[^\"]*\"|\\{[^}]+\\})`, 'g');
    doc = doc.replace(regex, '');
  });

  // Step 5 - Transform list rendering (Repeat exactly 3 times)
  doc = doc.replace(/<template[^>]*for:each=\{[^}]+\}[^>]*>([\s\S]*?)<\/template>/gi, (match, inner) => {
    return `${inner}\n${inner}\n${inner}`;
  });

  // Step 4 - Transform conditional rendering 
  doc = doc.replace(/<template[^>]*(lwc:if|lwc:else|lwc:elseif)[^>]*>/gi, '<div>');
  // Safe generic cleanup of remainder <template> blocks mapped locally
  doc = doc.replace(/<template[^>]*>/gi, '<div>');
  doc = doc.replace(/<\/template>/gi, '</div>');

  // Step 3 - Transform dynamic classes directly to dynamic placeholders
  doc = doc.replace(/class=\{[^}]+\}/g, 'class="preview-dynamic"');

  // Step 6 - Rebind core Event Handlers safely
  doc = doc.replace(/on[a-z]+=\{[^}]+\}/g, 'onclick="void(0)"');

  // Step 8 - Handle child LWC components (e.g., <c-foo>)
  doc = doc.replace(/<c-([a-zA-Z0-9-]+)([^>]*)>([\s\S]*?)<\/c-\1>/gi, '<div class="lwc-preview-placeholder" data-component="c-$1">[c-$1]</div>');
  doc = doc.replace(/<c-([a-zA-Z0-9-]+)([^>]*)\/>/gi, '<div class="lwc-preview-placeholder" data-component="c-$1">[c-$1]</div>');

  // Map Standard Salesforce base components -> minimal SLDS styling mocks
  doc = doc.replace(/<lightning-button([^>]*)>([\s\S]*?)<\/lightning-button>/gi, (match, attrs, content) => {
    let label = '[Button]';
    const labelMatch = attrs.match(/label="([^"]+)"/);
    if (labelMatch) {
      label = labelMatch[1];
    } else {
      const bindingMatch = attrs.match(/label=\{([^}]+)\}/);
      if (bindingMatch) label = state[bindingMatch[1]] || `[${titleCase(bindingMatch[1])}]`;
      else if (content && content.trim()) label = content.trim();
    }
    return `<button class="slds-button slds-button_neutral">${label}</button>`;
  });

  doc = doc.replace(/<lightning-card([^>]*)>([\s\S]*?)<\/lightning-card>/gi, (match, attrs, content) => {
    let title = '[Card Title]';
    const titleMatch = attrs.match(/title="([^"]+)"/);
    if (titleMatch) {
      title = titleMatch[1];
    } else {
      const bindingMatch = attrs.match(/title=\{([^}]+)\}/);
      if (bindingMatch) title = state[bindingMatch[1]] || `[${titleCase(bindingMatch[1])}]`;
    }
    return `
      <div class="slds-card" style="background: white; border-radius: 4px; box-shadow: 0 2px 2px 0 rgba(0,0,0,0.1);">
        <div class="slds-card__header slds-grid">
          <header class="slds-media slds-media_center slds-has-flexi-truncate">
             <h2 class="slds-card__header-title" style="font-weight: 700;">${title}</h2>
          </header>
        </div>
        <div class="slds-card__body slds-card__body_inner">${content}</div>
      </div>
    `;
  });

  doc = doc.replace(/<lightning-input[^>]*>/gi, '<input class="slds-input" placeholder="[Input]" style="width:100%; padding:0 12px; height:32px; border:1px solid #c9c9c9; border-radius:4px;"/>');
  doc = doc.replace(/<lightning-badge[^>]*>([\s\S]*?)<\/lightning-badge>/gi, '<span class="slds-badge" style="background:#f3f3f3; padding:2px 8px; border-radius:15px; font-size:10px;">$1</span>');
  doc = doc.replace(/<lightning-spinner[^>]*><\/lightning-spinner>/gi, '<div class="slds-spinner slds-spinner_medium lwc-preview-placeholder" style="border-radius:15px">[Spinner]</div>');
  doc = doc.replace(/<lightning-icon[^>]*><\/lightning-icon>/gi, '<span class="slds-icon_container">⚡</span>');
  doc = doc.replace(/<lightning-datatable[^>]*><\/lightning-datatable>/gi, '<div class="lwc-preview-placeholder" style="padding:40px">[lightning-datatable: Open in Org to preview]</div>');

  // Step 2 - Transform contextual data bindings properly mapping states
  // Handle dynamically bounded attributes
  doc = doc.replace(/=(?:\"\{([a-zA-Z0-9_.]+)\}\"|\{([a-zA-Z0-9_.]+)\})/g, (match, grp1, grp2) => {
    const propName = grp1 || grp2;
    if (!propName) return match;
    let val = state[propName];
    if (val === undefined) val = titleCase(propName);
    return `="${val}"`;
  });

  // Handle textual layout bindings
  doc = doc.replace(/\{([a-zA-Z0-9_.]+)\}/g, (match, propName) => {
    let val = state[propName];
    if (val === undefined) val = titleCase(propName);
    return val;
  });

  return doc;
}

function titleCase(str: string): string {
  const word = str.split('.').pop() || str;
  return word.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}
