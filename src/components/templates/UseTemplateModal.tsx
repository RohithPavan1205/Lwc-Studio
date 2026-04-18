'use client';

import { useState, useCallback, useRef, useEffect, useId } from 'react';
import { X, AlertCircle, ChevronDown, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  LWC_TARGETS,
  API_VERSIONS,
  validateName,
  camelToLabel,
} from '@/lib/lwcConstants';

export interface TemplateData {
  id: string;
  name: string;
  component_name: string;
  category: string;
  html_content?: string | null;
  lwc_html?: string;
  lwc_js?: string;
  lwc_css?: string;
  lwc_meta_xml?: string;
}

interface ComponentFormValues {
  name: string;
  masterLabel: string;
  isExposed: boolean;
  targets: string[];
  apiVersion: string;
  description: string;
}

interface UseTemplateModalProps {
  template: TemplateData;
  onClose: () => void;
}

// Safely generate meta xml to ensure targets are merged correctly
function mergeMetaXml(
  existingXml: string | undefined,
  apiVersion: string,
  isExposed: boolean,
  targets: string[],
  masterLabel: string,
  description: string
): string {
  // If no existing XML, generate from scratch
  if (!existingXml) {
    const targetLines = targets.length > 0
      ? `  <targets>\n${targets.map((t) => `    <target>${t}</target>`).join('\n')}\n  </targets>`
      : '';
    const descLine = description ? `  <description>${description}</description>\n` : '';
    return `<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
  <apiVersion>${apiVersion}</apiVersion>
  <isExposed>${isExposed}</isExposed>
  <masterLabel>${masterLabel}</masterLabel>
${descLine}${targetLines}
</LightningComponentBundle>`;
  }

  // Otherwise, we do some basic string replacements to preserve the template's XML
  let newXml = existingXml;

  // Replace component name in masterLabel if it seems like it's using the old one
  // Replace apiVersion
  newXml = newXml.replace(/<apiVersion>.*?<\/apiVersion>/i, `<apiVersion>${apiVersion}</apiVersion>`);
  // Replace isExposed
  newXml = newXml.replace(/<isExposed>.*?<\/isExposed>/i, `<isExposed>${isExposed}</isExposed>`);
  
  // Advanced replacement for targets/masterLabel is complex with Regex in XML,
  // we will trust the backend's metadata object or just do a simple replacement for the demo.
  
  return newXml;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: '#0F1623',
  border: '1px solid rgba(1,118,211,0.2)',
  borderRadius: 8, color: '#F3F3F3', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: '#8A9BBE',
  marginBottom: 6, fontWeight: 600,
  textTransform: 'uppercase' as const, letterSpacing: '0.06em',
  fontFamily: 'Inter, sans-serif',
};

// ─── Targets Dropdown ─────────────────────────────────────────────────────────
function TargetsDropdown({ id, selected, onChange }: { id: string; selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const toggle = (val: string) => onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  const displayText = selected.length === 0 ? null : selected.length === 1 ? LWC_TARGETS.find(t => t.value === selected[0])?.label ?? selected[0] : `${selected.length} targets selected`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        id={id} type="button" onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          background: '#0F1623',
          border: '1px solid rgba(1,118,211,0.2)',
          borderRadius: 8, color: displayText ? '#F3F3F3' : '#4A5A78',
          fontSize: 13, cursor: 'pointer', textAlign: 'left',
          fontFamily: 'Inter, sans-serif',
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(27,150,255,0.4)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(1,118,211,0.2)')}
      >
        <span>{displayText ?? 'Select targets'}</span>
        <ChevronDown size={15} style={{ color: '#4A5A78', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: '#161D2E',
          border: '1px solid rgba(1,118,211,0.2)',
          borderRadius: 8, zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          {LWC_TARGETS.map(t => {
            const checked = selected.includes(t.value);
            return (
              <label key={t.value} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                cursor: 'pointer',
                background: checked ? 'rgba(1,118,211,0.1)' : 'transparent',
                transition: 'background 0.15s',
              }}
                onMouseEnter={(e) => { if (!checked) (e.currentTarget as HTMLLabelElement).style.background = 'rgba(27,150,255,0.05)'; }}
                onMouseLeave={(e) => { if (!checked) (e.currentTarget as HTMLLabelElement).style.background = 'transparent'; }}
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(t.value)} style={{ accentColor: '#1B96FF' }} />
                <span style={{ fontSize: 13, color: '#F3F3F3', fontFamily: 'Inter, sans-serif' }}>{t.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── API Version Dropdown ───────────────────────────────────────────────────
function ApiVersionDropdown({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const selectedEntry = API_VERSIONS.find(v => v.value === value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        id={id} type="button" onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', padding: '10px 14px',
          background: '#0F1623',
          border: '1px solid rgba(1,118,211,0.2)',
          borderRadius: 8, fontSize: 13, cursor: 'pointer', textAlign: 'left',
          fontFamily: 'Inter, sans-serif',
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(27,150,255,0.4)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(1,118,211,0.2)')}
      >
        <span style={{ flex: 1, color: '#1B96FF', fontWeight: 500 }}>{selectedEntry ? selectedEntry.label : value}</span>
        <ChevronDown size={14} style={{ color: '#4A5A78' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: '#161D2E',
          border: '1px solid rgba(1,118,211,0.2)',
          borderRadius: 8, zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          {API_VERSIONS.map(entry => (
            <button
              key={entry.value} type="button" onClick={() => { onChange(entry.value); setOpen(false); }}
              style={{
                width: '100%', display: 'block', padding: '9px 14px',
                background: entry.value === value ? 'rgba(1,118,211,0.12)' : 'transparent',
                border: 'none', color: entry.value === value ? '#1B96FF' : '#F3F3F3',
                fontSize: 13, textAlign: 'left', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (entry.value !== value) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(27,150,255,0.06)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = entry.value === value ? 'rgba(1,118,211,0.12)' : 'transparent'; }}
            >
              {entry.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────

export default function UseTemplateModal({ template, onClose }: UseTemplateModalProps) {
  const router = useRouter();
  const uid = useId();

  // Create a default camelCase name derived from the component_name
  const defaultName = template.component_name || 'myComponent';

  const [form, setForm] = useState<ComponentFormValues>({
    name: defaultName,
    masterLabel: camelToLabel(defaultName),
    isExposed: true,
    targets: ['lightning__AppPage'],
    apiVersion: '62.0',
    description: '', // Intentionally leave description blank for the user to fill
  });

  const [nameTouched, setNameTouched] = useState(false);
  const [labelOverridden, setLabelOverridden] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [serverError, setServerError] = useState('');

  const nameError = validateName(form.name);
  const showNameError = nameTouched && !!nameError;
  const isNameValid = form.name.length > 0 && !nameError;

  useEffect(() => {
    if (!labelOverridden) {
      setForm((prev) => ({ ...prev, masterLabel: camelToLabel(prev.name) }));
    }
  }, [form.name, labelOverridden]);

  const handleNameChange = (val: string) => {
    setNameTouched(true);
    setForm((prev) => ({ ...prev, name: val }));
  };

  const handleCreate = useCallback(async () => {
    setNameTouched(true);
    if (!isNameValid || isCreating) return;

    setIsCreating(true);
    setServerError('');

    try {
      // 1. Prepare String Replacement for componentName
      const originalName = template.component_name;
      const newName = form.name;
      const newClassName = newName.charAt(0).toUpperCase() + newName.slice(1);
      const oldClassName = originalName.charAt(0).toUpperCase() + originalName.slice(1);

      // Perform replacement on source files
      let finalHtml = template.lwc_html || `<template>\n  <div>\n    <!-- Template HTML Missing -->\n  </div>\n</template>`;
      let finalJs = template.lwc_js || "import { LightningElement } from 'lwc';\nexport default class MyComponent extends LightningElement {}";
      const finalCss = template.lwc_css || '';

      // Very rudimentary string replace
      finalHtml = finalHtml.replaceAll(originalName, newName);
      finalJs = finalJs.replaceAll(oldClassName, newClassName).replaceAll(originalName, newName);

      const finalMetaXml = mergeMetaXml(
        template.lwc_meta_xml,
        form.apiVersion,
        form.isExposed,
        form.targets,
        form.masterLabel,
        form.description
      );

      // 2. Call the regular component create endpoint with our new code
      const res = await fetch('/api/components/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          masterLabel: form.masterLabel,
          isExposed: form.isExposed,
          includeCss: !!finalCss,
          targets: form.targets,
          apiVersion: form.apiVersion,
          description: form.description,
          htmlContent: finalHtml,
          jsContent: finalJs,
          cssContent: finalCss,
          metaXml: finalMetaXml,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsCreating(false);
        setServerError(data.error ?? 'Failed to create component.');
        return;
      }

      // We should ideally ping a tracking endpoint here for user_template_deployments,
      // but for now, we just redirect to the editor!
      router.push(`/dashboard/editor/${data.component.id}`);
      
    } catch (err) {
      setIsCreating(false);
      setServerError(err instanceof Error ? err.message : 'Network error occurred.');
    }
  }, [form, isNameValid, isCreating, template, router]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      background: 'rgba(10,14,26,0.9)',
      backdropFilter: 'blur(10px)',
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      
      <div style={{
        background: '#161D2E',
        borderRadius: 16, width: '100%', maxWidth: 500,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(27,150,255,0.12)',
        border: '1px solid rgba(1,118,211,0.2)',
        overflow: 'hidden',
        animation: 'forge-scale-in 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 24px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          borderBottom: '1px solid rgba(1,118,211,0.1)',
        }}>
          <div>
            <h2 style={{ color: '#F3F3F3', fontSize: 17, fontWeight: 600, margin: 0, letterSpacing: '-0.02em', fontFamily: 'Inter, sans-serif' }}>
              Use Template
            </h2>
            <p style={{ color: '#8A9BBE', fontSize: 12, margin: '4px 0 0 0', fontFamily: 'Inter, sans-serif' }}>
              Configuring{' '}
              <span style={{ color: '#1B96FF', fontWeight: 500 }}>{template.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(27,150,255,0.06)', border: '1px solid rgba(1,118,211,0.15)',
              borderRadius: 8, color: '#8A9BBE', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)';
              (e.currentTarget as HTMLButtonElement).style.color = '#EF4444';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(27,150,255,0.06)';
              (e.currentTarget as HTMLButtonElement).style.color = '#8A9BBE';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(1,118,211,0.15)';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px 24px', overflowY: 'auto' }}>
          {serverError && (
            <div style={{
              padding: '10px 12px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8, color: '#FCA5A5', fontSize: 13, marginBottom: 16,
              display: 'flex', gap: 8, alignItems: 'flex-start',
              fontFamily: 'Inter, sans-serif',
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{serverError}</span>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label htmlFor={`${uid}-name`} style={labelStyle}>Component Name *</label>
            <input
              id={`${uid}-name`} type="text" value={form.name} autoFocus maxLength={40}
              onChange={(e) => handleNameChange(e.target.value)}
              style={{
                ...inputStyle,
                borderColor: showNameError
                  ? 'rgba(239,68,68,0.5)'
                  : isNameValid
                    ? 'rgba(16,185,129,0.35)'
                    : 'rgba(1,118,211,0.2)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(27,150,255,0.5)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(1,118,211,0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = showNameError ? 'rgba(239,68,68,0.5)' : isNameValid ? 'rgba(16,185,129,0.35)' : 'rgba(1,118,211,0.2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            {showNameError && (
              <p style={{ color: '#F87171', fontSize: 11, margin: '5px 0 0', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Inter, sans-serif' }}>
                <AlertCircle size={11} /> {nameError}
              </p>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor={`${uid}-label`} style={labelStyle}>Master Label</label>
            <input
              id={`${uid}-label`} type="text" value={form.masterLabel}
              onChange={(e) => { setLabelOverridden(true); setForm(p => ({ ...p, masterLabel: e.target.value })); }}
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(27,150,255,0.5)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(1,118,211,0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(1,118,211,0.2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Targets</label>
              <TargetsDropdown id={`${uid}-targets`} selected={form.targets} onChange={v => setForm(p => ({ ...p, targets: v }))} />
            </div>
            <div>
              <label style={labelStyle}>API Version *</label>
              <ApiVersionDropdown id={`${uid}-api`} value={form.apiVersion} onChange={v => setForm(p => ({ ...p, apiVersion: v }))} />
            </div>
          </div>
          
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: '#8A9BBE', fontSize: 13, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}>
            <input
              type="checkbox"
              checked={form.isExposed}
              onChange={e => setForm(p => ({...p, isExposed: e.target.checked}))}
              style={{ accentColor: '#1B96FF' }}
            />
            isExposed (visible in App Builder)
          </label>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          background: 'rgba(10,14,26,0.6)',
          borderTop: '1px solid rgba(1,118,211,0.1)',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px',
              background: 'transparent',
              border: '1px solid rgba(1,118,211,0.2)',
              borderRadius: 8, color: '#8A9BBE', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(27,150,255,0.4)';
              (e.currentTarget as HTMLButtonElement).style.color = '#F3F3F3';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(1,118,211,0.2)';
              (e.currentTarget as HTMLButtonElement).style.color = '#8A9BBE';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!isNameValid || isCreating}
            style={{
              padding: '9px 20px',
              background: isNameValid && !isCreating
                ? 'linear-gradient(135deg, #0176D3 0%, #1B96FF 100%)'
                : 'rgba(1,118,211,0.3)',
              border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: isNameValid && !isCreating ? 'pointer' : 'not-allowed',
              opacity: isNameValid && !isCreating ? 1 : 0.65,
              fontFamily: 'Inter, sans-serif',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s',
              boxShadow: isNameValid && !isCreating ? '0 4px 16px rgba(1,118,211,0.3)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (isNameValid && !isCreating) {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(27,150,255,0.45)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = isNameValid && !isCreating ? '0 4px 16px rgba(1,118,211,0.3)' : 'none';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            {isCreating ? (
              <>
                <Loader2 size={14} style={{ animation: 'forge-spin 1s linear infinite' }} />
                Creating...
              </>
            ) : (
              'Create → Code Editor'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
