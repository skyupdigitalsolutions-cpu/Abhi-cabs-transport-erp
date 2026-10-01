/**
 * src/theme/muiTheme.js — the one MUI theme for the whole ERP.
 *
 * Built on Material UI components, with two borrowed looks:
 *   • Ionic   — soft, rounded "inset" cards with a gentle lift, iOS-style
 *               toggle switches, pill-shaped chips.
 *   • Uiverse — inputs with a coloured focus ring that grows in, and buttons
 *               that lift slightly on hover.
 *
 * Brand: ABHI CABS yellow (#FFC107) on black (#111111), warm off-white page.
 * Every value lives here so the dashboard can be re-skinned in one file.
 */
import { createTheme, alpha } from '@mui/material/styles';

const YELLOW = '#FFC107';
const YELLOW_DARK = '#E6AC00';
const INK = '#111111';
const BORDER = '#E8E8E4';
const PAGE = '#F9F9F7';
const MUTED = '#6B7280';

const FONT = "'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Segoe UI', Arial, sans-serif";

export const brand = { YELLOW, YELLOW_DARK, INK, BORDER, PAGE, MUTED };

const theme = createTheme({
  palette: {
    mode: 'light',
    primary:   { main: YELLOW, dark: YELLOW_DARK, light: '#FFE082', contrastText: INK },
    secondary: { main: INK, contrastText: '#FFFFFF' },
    success:   { main: '#16A34A', contrastText: '#FFFFFF' },
    error:     { main: '#DC2626', contrastText: '#FFFFFF' },
    warning:   { main: '#F59E0B', contrastText: INK },
    info:      { main: '#2563EB', contrastText: '#FFFFFF' },
    text:      { primary: INK, secondary: MUTED },
    divider:   BORDER,
    background: { default: PAGE, paper: '#FFFFFF' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: FONT,
    fontSize: 13.5,
    button: { textTransform: 'none', fontWeight: 700, letterSpacing: '0.01em' },
    h1: { fontWeight: 900, letterSpacing: '-0.5px' },
    h2: { fontWeight: 900, letterSpacing: '-0.4px' },
    h3: { fontWeight: 800 },
    h4: { fontWeight: 800 },
    h5: { fontWeight: 800 },
    h6: { fontWeight: 800 },
  },
  components: {
    /* ── Buttons: rounded, bold, slight lift on hover (Uiverse) ─────────── */
    MuiButtonBase: { defaultProps: { disableRipple: false } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          whiteSpace: 'nowrap',
          transition: 'transform .15s ease, box-shadow .2s ease, background-color .2s ease, border-color .2s ease',
          '&:hover': { transform: 'translateY(-1px)' },
          '&:active': { transform: 'translateY(0) scale(.97)' },
          '&.Mui-disabled': { opacity: 0.55 },
        },
        sizeSmall: { height: 34, padding: '0 14px', fontSize: 13 },
        sizeMedium: { height: 40, padding: '0 18px', fontSize: 14 },
        sizeLarge: { height: 46, padding: '0 24px', fontSize: 15 },
        containedPrimary: {
          boxShadow: `0 2px 8px ${alpha(YELLOW, 0.35)}`,
          '&:hover': { backgroundColor: YELLOW_DARK, boxShadow: `0 6px 18px ${alpha(YELLOW, 0.45)}` },
        },
        containedSecondary: {
          boxShadow: `0 2px 8px ${alpha(INK, 0.2)}`,
          '&:hover': { backgroundColor: '#000', boxShadow: `0 6px 18px ${alpha(INK, 0.3)}` },
        },
        containedError: { boxShadow: `0 2px 8px ${alpha('#DC2626', 0.28)}` },
        containedSuccess: { boxShadow: `0 2px 8px ${alpha('#16A34A', 0.28)}` },
        outlined: { borderWidth: 1.5, '&:hover': { borderWidth: 1.5 } },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'background-color .18s, color .18s, transform .15s',
          '&:hover': { transform: 'translateY(-1px)' },
        },
      },
    },

    /* ── Cards: Ionic-style soft rounded panels ─────────────────────────── */
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 16 },
        outlined: { borderColor: BORDER },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          borderRadius: 16,
          borderColor: BORDER,
          boxShadow: '0 1px 2px rgba(17,17,17,.04), 0 4px 14px rgba(17,17,17,.04)',
          transition: 'box-shadow .2s ease, transform .2s ease',
        },
      },
    },

    /* ── Inputs: focus ring that grows in (Uiverse) ─────────────────────── */
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#FFFFFF',
          fontSize: 13.5,
          fontWeight: 500,
          transition: 'box-shadow .2s ease',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER, borderWidth: 1.5 },
          '&:hover:not(.Mui-disabled):not(.Mui-error) .MuiOutlinedInput-notchedOutline': { borderColor: '#CFCFC8' },
          '&.Mui-focused': { boxShadow: `0 0 0 4px ${alpha(YELLOW, 0.18)}` },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: YELLOW, borderWidth: 1.5 },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: '#DC2626' },
          '&.Mui-error.Mui-focused': { boxShadow: `0 0 0 4px ${alpha('#DC2626', 0.12)}` },
          '&.Mui-disabled': { backgroundColor: '#F5F5F3' },
        },
        input: { padding: '9.5px 12px' },
        inputSizeSmall: { padding: '9.5px 12px' },
        multiline: { padding: 0 },
        inputMultiline: { padding: '9.5px 12px' },
      },
    },
    MuiSelect: {
      styleOverrides: { select: { fontWeight: 600 } },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: `1.5px solid ${BORDER}`,
          boxShadow: '0 12px 36px rgba(17,17,17,.12), 0 4px 12px rgba(17,17,17,.06)',
          marginTop: 4,
        },
        list: { padding: 6 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8, fontSize: 13.5, fontWeight: 500, minHeight: 36,
          '&.Mui-selected': { backgroundColor: '#FFFBEA', fontWeight: 700 },
          '&.Mui-selected:hover': { backgroundColor: '#FFF4CC' },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: `1.5px solid ${BORDER}`,
          boxShadow: '0 12px 36px rgba(17,17,17,.12), 0 4px 12px rgba(17,17,17,.06)',
          marginTop: 4,
        },
        listbox: { padding: 6 },
        option: {
          borderRadius: 8, fontSize: 13.5, minHeight: 36,
          '&[aria-selected="true"]': { backgroundColor: '#FFFBEA !important', fontWeight: 700 },
        },
        // Same height as a plain Select / Input (MUI's small Autocomplete
        // otherwise shrinks the input padding to 2.5px).
        inputRoot: { paddingTop: '0 !important', paddingBottom: '0 !important', paddingLeft: '4px !important' },
        input: { padding: '9.5px 8px !important' },
      },
    },

    /* ── Switch: iOS / Ionic toggle ─────────────────────────────────────── */
    MuiSwitch: {
      styleOverrides: {
        root: { width: 46, height: 26, padding: 0, overflow: 'visible' },
        switchBase: {
          padding: 3,
          '&.Mui-checked': {
            transform: 'translateX(20px)',
            color: '#fff',
            '& + .MuiSwitch-track': { backgroundColor: YELLOW, opacity: 1, border: 0 },
          },
          '&.Mui-disabled + .MuiSwitch-track': { opacity: 0.5 },
        },
        thumb: { width: 20, height: 20, boxShadow: '0 2px 4px rgba(0,0,0,.2)' },
        track: { borderRadius: 13, backgroundColor: '#E5E7EB', opacity: 1, transition: 'background-color .25s' },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: { padding: 6, '&.Mui-checked': { color: YELLOW } },
      },
    },

    /* ── Chips (badges / statuses): Ionic pills ─────────────────────────── */
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 800, letterSpacing: '0.03em', borderRadius: 999 },
        sizeSmall: { height: 22, fontSize: 11 },
        labelSmall: { paddingLeft: 8, paddingRight: 8 },
      },
    },

    /* ── Alerts ─────────────────────────────────────────────────────────── */
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12, fontSize: 13.5, fontWeight: 500, alignItems: 'flex-start' },
        icon: { paddingTop: 9 },
        message: { paddingTop: 8, paddingBottom: 8 },
      },
    },

    /* ── Dialogs & drawers ──────────────────────────────────────────────── */
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,.18)' },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: { '&:not(.MuiBackdrop-invisible)': { backgroundColor: 'rgba(17,17,17,.45)', backdropFilter: 'blur(3px)' } },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontSize: 15, fontWeight: 800, padding: '16px 20px' } },
    },
    MuiDialogContent: { styleOverrides: { root: { padding: '16px 20px' } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '12px 20px', gap: 8 } } },

    /* ── Tables ─────────────────────────────────────────────────────────── */
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: '1px solid #F2F2EE', fontSize: 13.5, padding: '12px 16px' },
        head: {
          backgroundColor: '#F9F9F7', color: '#8A8A85', fontSize: 11.5, fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
          borderBottom: '2px solid #F0F0EC',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&.MuiTableRow-hover:hover': { backgroundColor: '#FFFCF0' } },
      },
    },
    MuiTableSortLabel: {
      styleOverrides: {
        root: { color: 'inherit !important', '& .MuiTableSortLabel-icon': { fontSize: 14 } },
      },
    },

    /* ── Pagination ─────────────────────────────────────────────────────── */
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          fontWeight: 700, borderRadius: 10,
          '&.Mui-selected': { backgroundColor: YELLOW, color: INK, '&:hover': { backgroundColor: YELLOW_DARK } },
        },
      },
    },

    /* ── Navigation ─────────────────────────────────────────────────────── */
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10, margin: '1px 0',
          '&.Mui-selected': { backgroundColor: YELLOW, color: INK },
          '&.Mui-selected:hover': { backgroundColor: YELLOW_DARK },
        },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: { backgroundColor: INK, fontSize: 12, fontWeight: 600, borderRadius: 8, padding: '6px 10px' },
        arrow: { color: INK },
      },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 700, fontSize: 14, minHeight: 48 } },
    },
    MuiTabs: {
      styleOverrides: { indicator: { backgroundColor: YELLOW, height: 3, borderRadius: 3 } },
    },
    MuiSkeleton: { styleOverrides: { root: { backgroundColor: '#ECECE8' } } },
  },
});

export default theme;
