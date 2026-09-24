import { useState, useRef, useEffect, forwardRef, useCallback } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

/**
 * Custom Select — fully replaces the native <select> with an attractive
 * dropdown. Supports search filtering for long lists, keyboard navigation,
 * grouped options, and animated transitions.
 *
 * API is backward-compatible: { value, onChange(e), options, placeholder, error, style, ...rest }
 * onChange still fires a synthetic event with e.target.value so existing
 * form handlers (useForm, field(), etc.) work unchanged.
 */
const Select = forwardRef(function Select({
  error, options = [], placeholder, style, onChange, onBlur, value,
  searchable: searchableProp, disabled, autoFocus, ...props
}, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const internalRef = useRef(null);
  const resolvedRef = ref || internalRef;

  // Auto-enable search when more than 6 options
  const searchable = searchableProp ?? options.length > 6;

  const selectedOption = options.find((o) => String(o.value) === String(value));

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const open = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setSearch('');
    setHighlightIndex(-1);
    setTimeout(() => searchRef.current?.focus(), 30);
  }, [disabled]);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch('');
    if (onBlur) {
      // Fire synthetic blur for form validation
      onBlur({ target: { value } });
    }
  }, [onBlur, value]);

  const select = useCallback((optValue) => {
    if (onChange) {
      onChange({ target: { value: optValue } });
    }
    close();
  }, [onChange, close]);

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

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex];
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        open();
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
        e.preventDefault();
        if (highlightIndex >= 0 && filtered[highlightIndex]) {
          select(filtered[highlightIndex].value);
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

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', ...style }}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        ref={resolvedRef}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? close() : open())}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', borderRadius: 10,
          border: `1.5px solid ${error ? '#DC2626' : isOpen ? '#FFC107' : '#E8E8E4'}`,
          padding: '8px 12px', fontSize: 13.5, fontWeight: 600,
          backgroundColor: disabled ? '#F5F5F3' : '#ffffff',
          color: selectedOption ? '#111111' : '#9A9A9A',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none', textAlign: 'left', gap: 8,
          boxShadow: isOpen ? '0 0 0 3px rgba(255,193,7,0.15)' : 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          opacity: disabled ? 0.6 : 1,
        }}
        {...props}
      >
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>
          {selectedOption ? selectedOption.label : (placeholder || 'Select…')}
        </span>
        <ChevronDown
          size={15}
          style={{
            color: '#9A9A9A', flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            zIndex: 50, backgroundColor: '#ffffff',
            border: '1.5px solid #E8E8E4', borderRadius: 12,
            boxShadow: '0 12px 36px rgba(17,17,17,0.12), 0 4px 12px rgba(17,17,17,0.06)',
            overflow: 'hidden',
            animation: 'selectSlideDown 0.18s ease-out',
          }}
        >
          {/* Search */}
          {searchable && (
            <div style={{ padding: '8px 8px 0' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                backgroundColor: '#F7F8FC', borderRadius: 8,
                padding: '6px 10px', border: '1px solid #E8E8E4',
              }}>
                <Search size={13} style={{ color: '#9A9A9A', flexShrink: 0 }} />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setHighlightIndex(0); }}
                  placeholder="Search…"
                  style={{
                    border: 'none', outline: 'none', backgroundColor: 'transparent',
                    fontSize: 13, fontWeight: 500, color: '#111111', width: '100%',
                    padding: 0,
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div
            ref={listRef}
            role="listbox"
            style={{
              maxHeight: 220, overflowY: 'auto', padding: '6px',
              scrollbarWidth: 'thin',
            }}
          >
            {filtered.length === 0 ? (
              <div style={{
                padding: '16px 12px', textAlign: 'center',
                fontSize: 12.5, color: '#9A9A9A', fontWeight: 500,
              }}>
                No options found
              </div>
            ) : filtered.map((opt, index) => {
              const isSelected = String(opt.value) === String(value);
              const isHighlighted = index === highlightIndex;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => select(opt.value)}
                  onMouseEnter={() => setHighlightIndex(index)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 8, padding: '8px 10px', borderRadius: 8,
                    fontSize: 13.5, fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? '#111111' : '#374151',
                    backgroundColor: isSelected
                      ? '#FFFBEA'
                      : isHighlighted
                        ? '#F7F8FC'
                        : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.12s',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {opt.label}
                  </span>
                  {isSelected && (
                    <Check size={14} style={{ color: '#FFC107', flexShrink: 0 }} strokeWidth={3} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Animation keyframe */}
      <style>{`
        @keyframes selectSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
});

export default Select;
