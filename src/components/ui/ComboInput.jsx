import { useState, useRef, useEffect, forwardRef, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * ComboInput — a text input with suggestions dropdown. Replaces the ugly
 * browser <datalist> with a custom styled dropdown. Allows both free text
 * and selecting from suggestions.
 *
 * Props:
 *   value, onChange(e), suggestions: string[], placeholder, error, onBlur, ...rest
 */
const ComboInput = forwardRef(function ComboInput({
  value, onChange, onBlur, suggestions = [], placeholder, error, disabled, style,
  ...props
}, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const filtered = value
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()))
    : suggestions;

  const close = useCallback(() => {
    setIsOpen(false);
    setHighlightIndex(-1);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, close]);

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex];
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const selectSuggestion = (sug) => {
    if (onChange) {
      onChange({ target: { value: sug } });
    }
    close();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
        break;
      case 'Enter':
        if (highlightIndex >= 0 && filtered[highlightIndex]) {
          e.preventDefault();
          selectSuggestion(filtered[highlightIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      default:
        break;
    }
  };

  const [focused, setFocused] = useState(false);

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={ref}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            onChange?.(e);
            if (!isOpen) setIsOpen(true);
            setHighlightIndex(-1);
          }}
          onFocus={(e) => {
            setFocused(true);
            setIsOpen(true);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%', borderRadius: 10,
            border: `1.5px solid ${error ? '#DC2626' : focused ? '#FFC107' : '#E8E8E4'}`,
            padding: '9px 36px 9px 12px',
            fontSize: 13.5, fontWeight: 500,
            backgroundColor: disabled ? '#F5F5F3' : '#ffffff',
            color: disabled ? '#9A9A9A' : '#111111',
            outline: 'none',
            boxShadow: focused ? '0 0 0 3px rgba(255,193,7,0.15)' : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
          style={{
            position: 'absolute', right: 8, top: '50%',
            transform: 'translateY(-50%)',
            display: 'grid', placeItems: 'center',
            padding: 2, border: 'none', background: 'none',
            color: '#9A9A9A', cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronDown
            size={15}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s ease',
            }}
          />
        </button>
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            zIndex: 50, backgroundColor: '#ffffff',
            border: '1.5px solid #E8E8E4', borderRadius: 12,
            boxShadow: '0 12px 36px rgba(17,17,17,0.12), 0 4px 12px rgba(17,17,17,0.06)',
            overflow: 'hidden',
            animation: 'comboSlideDown 0.18s ease-out',
          }}
        >
          <div ref={listRef} style={{ padding: 6, maxHeight: 200, overflowY: 'auto' }}>
            {filtered.map((sug, index) => {
              const isSelected = sug === value;
              const isHighlighted = index === highlightIndex;
              return (
                <div
                  key={sug}
                  onMouseDown={(e) => { e.preventDefault(); selectSuggestion(sug); }}
                  onMouseEnter={() => setHighlightIndex(index)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 8, padding: '8px 10px', borderRadius: 8,
                    fontSize: 13.5, fontWeight: isSelected ? 700 : 500,
                    color: '#374151',
                    backgroundColor: isSelected
                      ? '#FFFBEA'
                      : isHighlighted
                        ? '#F7F8FC'
                        : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.12s',
                  }}
                >
                  <span>{sug}</span>
                  {isSelected && <Check size={14} style={{ color: '#FFC107', flexShrink: 0 }} strokeWidth={3} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes comboSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
});

export default ComboInput;
