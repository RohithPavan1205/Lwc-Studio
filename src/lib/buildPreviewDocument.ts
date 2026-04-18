export function buildPreviewDocument(htmlContent: string, cssContent: string): string {
  if (!htmlContent) return '';

  // Extract body content from LWC html and strip innermost/outer <template> wrapper tags
  let bodyContent = htmlContent
    .replace(/^<template[^>]*>([\s\S]*)<\/template>$/i, '$1');

  // Strip LWC-specific conditional rendering
  bodyContent = bodyContent.replace(/<template[^>]*(lwc:if|lwc:else|lwc:elseif)[^>]*>/gi, '<div>');
  
  // Transform list rendering (Repeat exactly 3 times)
  bodyContent = bodyContent.replace(/<template[^>]*for:each=\{[^}]+\}[^>]*>([\s\S]*?)<\/template>/gi, (match, inner) => {
    return `${inner}\n${inner}\n${inner}`;
  });

  // Strip remaining templates
  bodyContent = bodyContent.replace(/<template[^>]*>/gi, '<div>');
  bodyContent = bodyContent.replace(/<\/template>/gi, '</div>');

  // Strip LWC-specific bindings: {bindings} → placeholder text
  // Match any `{something}` and replace with generic placeholder based on variable name
  bodyContent = bodyContent.replace(/\{([a-zA-Z0-9_.]+)\}/g, (match, propName) => {
     return propName || 'Text';
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      background: #0d1117;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 32px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow: hidden;
    }
    ${cssContent}
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
}
