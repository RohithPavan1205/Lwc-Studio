'use client';

import { useState, useEffect, useCallback, useId, useRef } from 'react';
import { X, AlertCircle, ChevronDown, Info } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LwcTarget {
  value: string;
  label: string;
}

export const LWC_TARGETS: LwcTarget[] = [
  { value: 'lightning__AppPage', label: 'Lightning App Page' },
  { value: 'lightning__RecordPage', label: 'Lightning Record Page' },
  { value: 'lightning__HomePage', label: 'Lightning Home Page' },
  { value: 'lightning__FlowScreen', label: 'Lightning Flow Screen' },
  { value: 'lightningCommunity__Page', label: 'Experience Builder Page' },
  { value: 'lightning__UtilityBar', label: 'Utility Bar' },
];

export interface ApiVersionEntry {
  value: string;
  label: string;
}

export const API_VERSIONS: ApiVersionEntry[] = [
  { value: '66.0', label: "66.0 (Spring '26)" },
  { value: '65.0', label: "65.0 (Winter '26)" },
  { value: '64.0', label: "64.0 (Summer '25)" },
  { value: '63.0', label: "63.0 (Spring '25)" },
  { value: '62.0', label: "62.0 (Winter '25)" },
  { value: '61.0', label: "61.0 (Summer '24)" },
];

export interface ComponentFormValues {
  name: string;
  masterLabel: string;
  isExposed: boolean;
  includeCss: boolean;
  includeSvg: boolean;
  targets: string[];
  apiVersion: string;
  description: string;
}

export interface CreateComponentModalProps {
  onClose: () => void;
  /** Called with the created component id — caller handles redirect */
  onCreated: (componentId: string, componentName: string) => void;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const LWC_NAME_REGEX = /^[a-z][a-zA-Z0-9]*$/;

function validateName(name: string): string | null {
  if (!name) return null;
  if (!LWC_NAME_REGEX.test(name))
    return 'Must start with a lowercase letter — letters and numbers only, no spaces.';
  if (name.length > 40) return 'Name must be 40 characters or less (Salesforce limit).';
  return null;
}

// ─── camelCase → "Spaced Words" ───────────────────────────────────────────────

function camelToLabel(name: string): string {
  if (!name) return '';
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// ─── Boilerplate Generators ───────────────────────────────────────────────────

function generateHtml(name: string): string {
  return `<template>
  <div class="container">
    <p>Hello from ${name}</p>
  </div>
</template>`;
}

function generateJs(name: string, targets: string[]): string {
  const includeRecordId = targets.includes('lightning__RecordPage');
  const imports = includeRecordId
    ? "import { LightningElement, api } from 'lwc';"
    : "import { LightningElement } from 'lwc';";
  const className = name.charAt(0).toUpperCase() + name.slice(1);
  const recordIdProp = includeRecordId ? '\n  @api recordId;' : '';
  return `${imports}

export default class ${className} extends LightningElement {${recordIdProp}
}`;
}

function generateCss(): string {
  return `.container {
  padding: 1rem;
}`;
}

function generateMetaXml(
  apiVersion: string,
  isExposed: boolean,
  targets: string[],
  masterLabel: string,
  description: string
): string {
  const targetLines =
    targets.length > 0
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

// ─── Multi-select Targets Dropdown ───────────────────────────────────────────

interface TargetsDropdownProps {
  id: string;
  selected: string[];
  onChange: (next: string[]) => void;
}

function TargetsDropdown({ id, selected, onChange }: TargetsDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const displayText =
    selected.length === 0
      ? null
      : selected.length === 1
        ? LWC_TARGETS.find((t) => t.value === selected[0])?.label ?? selected[0]
        : `${selected.length} targets selected`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: 6,
          color: displayText ? '#e6edf3' : '#484f58',
          fontSize: 13,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#0ea5e9')}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2a2a')}
      >
        <span>{displayText ?? 'Select targets'}</span>
        <ChevronDown
          style={{
            width: 15,
            height: 15,
            color: '#484f58',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#1e1e1e',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            zIndex: 100,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}
        >
          {LWC_TARGETS.map((t) => {
            const checked = selected.includes(t.value);
            return (
              <label
                key={t.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 14px',
                  cursor: 'pointer',
                  background: checked ? 'rgba(14,165,233,0.08)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!checked) (e.currentTarget as HTMLElement).style.background = '#2a2a2a';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = checked
                    ? 'rgba(14,165,233,0.08)'
                    : 'transparent';
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(t.value)}
                  style={{
                    width: 14,
                    height: 14,
                    accentColor: '#0ea5e9',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, color: '#e6edf3' }}>{t.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── API Version Dropdown ─────────────────────────────────────────────────────

interface ApiVersionDropdownProps {
  id: string;
  value: string | null;
  onChange: (v: string | null) => void;
}

function ApiVersionDropdown({ id, value, onChange }: ApiVersionDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedEntry = API_VERSIONS.find((v) => v.value === value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '10px 14px',
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: 6,
          fontSize: 13,
          cursor: 'pointer',
          textAlign: 'left',
          gap: 0,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#0ea5e9')}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2a2a')}
      >
        {/* Value display */}
        <span
          style={{
            flex: 1,
            color: selectedEntry ? '#38bdf8' : '#484f58',
            fontWeight: selectedEntry ? 500 : 400,
          }}
        >
          {selectedEntry ? selectedEntry.label : 'Select API version'}
        </span>

        {/* Clear button */}
        {selectedEntry && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear API version"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
              setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onChange(null);
                setOpen(false);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 4px',
              color: '#484f58',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#e6edf3')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#484f58')}
          >
            <X style={{ width: 14, height: 14 }} />
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#1e1e1e',
            border: '1px solid #2a2a2a',
            borderRadius: 6,
            zIndex: 100,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}
        >
          {API_VERSIONS.map((entry) => {
            const isSelected = entry.value === value;
            return (
              <button
                key={entry.value}
                type="button"
                onClick={() => {
                  onChange(entry.value);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '9px 14px',
                  background: isSelected ? 'rgba(14,165,233,0.1)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: isSelected ? '#38bdf8' : '#e6edf3',
                  fontWeight: isSelected ? 500 : 400,
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#2a2a2a';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = isSelected
                    ? 'rgba(14,165,233,0.1)'
                    : 'transparent';
                }}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

interface CheckboxProps {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

function Checkbox({ id, checked, onChange, label }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          width: 14,
          height: 14,
          accentColor: '#0ea5e9',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 13, color: '#c9d1d9' }}>{label}</span>
    </label>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function CreateComponentModal({ onClose, onCreated }: CreateComponentModalProps) {
  const uid = useId();

  const [form, setForm] = useState<ComponentFormValues>({
    name: '',
    masterLabel: '',
    isExposed: false,
    includeCss: false,
    includeSvg: false,
    targets: [],
    apiVersion: '66.0',
    description: '',
  });

  const [nameTouched, setNameTouched] = useState(false);
  const [labelOverridden, setLabelOverridden] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [serverError, setServerError] = useState('');

  const nameError = validateName(form.name);
  const showNameError = nameTouched && !!nameError;
  const isNameValid = form.name.length > 0 && !nameError;

  // Auto-fill master label from name unless user has overridden
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

    const htmlContent = generateHtml(form.name);
    const jsContent = generateJs(form.name, form.targets);
    const cssContent = form.includeCss ? generateCss() : '';
    const masterLabel = form.masterLabel || camelToLabel(form.name);
    const metaXml = generateMetaXml(
      form.apiVersion || '66.0',
      form.isExposed,
      form.targets,
      masterLabel,
      form.description
    );

    try {
      const res = await fetch('/api/components/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          masterLabel,
          isExposed: form.isExposed,
          includeCss: form.includeCss,
          targets: form.targets,
          apiVersion: form.apiVersion || '66.0',
          description: form.description,
          htmlContent,
          jsContent,
          cssContent: form.includeCss ? cssContent : null,
          metaXml,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsCreating(false);
        setServerError(data.error ?? 'Failed to create component. Please try again.');
        return;
      }

      // Redirect immediately — background deploy starts in the editor
      onCreated(data.component.id, data.component.name);
    } catch (err) {
      setIsCreating(false);
      setServerError(err instanceof Error ? err.message : 'Network error occurred.');
    }
  }, [form, isNameValid, isCreating, onCreated]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ── Shared input styles ───────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 6,
    color: '#e6edf3',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    color: '#8b949e',
    marginBottom: 6,
    fontWeight: 500,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#1e1e1e',
          borderRadius: 10,
          width: '100%',
          maxWidth: 600,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 16px',
            flexShrink: 0,
          }}
        >
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 600, margin: 0 }}>
            New Lightning Web Component
          </h2>
          <button
            id="create-modal-close-btn"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#8b949e',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
              borderRadius: 4,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#e6edf3')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#8b949e')}
            aria-label="Close modal"
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* ── Scrollable Body ─────────────────────────────────────────────── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 24px 8px' }}>

          {/* Server error banner */}
          {serverError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '10px 12px',
                background: 'rgba(218,54,51,0.12)',
                border: '1px solid rgba(218,54,51,0.25)',
                borderRadius: 6,
                color: '#f85149',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              <AlertCircle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />
              <span>{serverError}</span>
            </div>
          )}

          {/* ── ROW 1: Component Name + Master Label ─────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Component Name */}
            <div>
              <label htmlFor={`${uid}-name`} style={labelStyle}>
                Component Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id={`${uid}-name`}
                type="text"
                value={form.name}
                autoFocus
                maxLength={40}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                style={{
                  ...inputStyle,
                  borderColor: showNameError ? '#ef4444' : isNameValid ? '#22c55e40' : '#2a2a2a',
                }}
                onFocus={(e) => {
                  if (!showNameError && !isNameValid)
                    (e.currentTarget as HTMLElement).style.borderColor = '#0ea5e9';
                }}
                onBlur={(e) => {
                  if (!showNameError && !isNameValid)
                    (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a';
                }}
              />
              {showNameError && (
                <p
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 5,
                    fontSize: 11,
                    color: '#ef4444',
                  }}
                >
                  <AlertCircle style={{ width: 11, height: 11, flexShrink: 0 }} />
                  {nameError}
                </p>
              )}
            </div>

            {/* Master Label */}
            <div>
              <label htmlFor={`${uid}-label`} style={labelStyle}>
                Master Label
              </label>
              <input
                id={`${uid}-label`}
                type="text"
                value={form.masterLabel}
                onChange={(e) => {
                  setLabelOverridden(true);
                  setForm((prev) => ({ ...prev, masterLabel: e.target.value }));
                }}
                style={inputStyle}
                onFocus={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#0ea5e9')}
                onBlur={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a')}
              />
            </div>
          </div>

          {/* ── ROW 2: Three checkboxes ──────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
            <Checkbox
              id={`${uid}-exposed`}
              checked={form.isExposed}
              onChange={(v) => setForm((prev) => ({ ...prev, isExposed: v }))}
              label="isExposed"
            />
            <Checkbox
              id={`${uid}-css`}
              checked={form.includeCss}
              onChange={(v) => setForm((prev) => ({ ...prev, includeCss: v }))}
              label="include CSS File?"
            />
            <Checkbox
              id={`${uid}-svg`}
              checked={form.includeSvg}
              onChange={(v) => setForm((prev) => ({ ...prev, includeSvg: v }))}
              label="include SVG File?"
            />
          </div>

          {/* ── ROW 3: Targets + API Version ─────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Targets */}
            <div>
              <label style={labelStyle}>Targets</label>
              <TargetsDropdown
                id={`${uid}-targets`}
                selected={form.targets}
                onChange={(next) => setForm((prev) => ({ ...prev, targets: next }))}
              />
              {form.targets.includes('lightning__RecordPage') && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 5,
                    marginTop: 6,
                    fontSize: 11,
                    color: '#58a6ff',
                  }}
                >
                  <Info style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1 }} />
                  <span>
                    <strong>@api recordId</strong> will be added to JS automatically.
                  </span>
                </div>
              )}
            </div>

            {/* API Version */}
            <div>
              <label style={labelStyle}>
                API Version <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <ApiVersionDropdown
                id={`${uid}-api`}
                value={form.apiVersion}
                onChange={(v) => setForm((prev) => ({ ...prev, apiVersion: v ?? '66.0' }))}
              />
            </div>
          </div>

          {/* ── ROW 4: Description ───────────────────────────────────────── */}
          <div style={{ marginBottom: 8 }}>
            <label htmlFor={`${uid}-desc`} style={labelStyle}>
              Description
            </label>
            <textarea
              id={`${uid}-desc`}
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value.slice(0, 300) }))
              }
              rows={5}
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: 100,
                fontFamily: 'inherit',
              }}
              onFocus={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#0ea5e9')}
              onBlur={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a')}
            />
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '14px 24px 18px',
            flexShrink: 0,
          }}
        >
          {/* Deploy button */}
          <button
            id="create-component-submit-btn"
            onClick={handleCreate}
            disabled={isCreating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 22px',
              borderRadius: 6,
              background: isCreating ? '#0ea5e980' : '#0ea5e9',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              boxShadow: '0 2px 8px rgba(14,165,233,0.25)',
            }}
            onMouseEnter={(e) => { if (!isCreating) (e.currentTarget as HTMLElement).style.background = '#0284c7'; }}
            onMouseLeave={(e) => { if (!isCreating) (e.currentTarget as HTMLElement).style.background = '#0ea5e9'; }}
          >
            {isCreating && (
              <svg
                style={{ width: 14, height: 14, animation: 'spin 1s linear infinite', flexShrink: 0 }}
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {isCreating ? 'Creating...' : 'Deploy'}
          </button>

          {/* Cancel button */}
          <button
            id="create-component-cancel-btn"
            onClick={onClose}
            style={{
              padding: '9px 22px',
              borderRadius: 6,
              background: '#2a2a2a',
              color: '#e6edf3',
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#333333')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#2a2a2a')}
          >
            Cancel
          </button>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
