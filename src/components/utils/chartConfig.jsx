/**
 * Horizon Theme Chart Configuration
 * Shared configuration for all charts in the application
 */

// צבעי Horizon Theme
export const HORIZON_COLORS = {
  primary: '#32acc1',
  secondary: '#fc9f67',
  green: '#48BB78',
  red: '#FC8181',
  yellow: '#ECC94B',
  blue: '#63B3ED',
  purple: '#9F7AEA',
  pink: '#F687B3',
  cyan: '#76E4F7',
  orange: '#F6AD55',
  teal: '#38B2AC',
  indigo: '#667EEA'
};

// פלטת צבעים לתרשימים
export const CHART_COLORS = [
  HORIZON_COLORS.primary,
  HORIZON_COLORS.secondary,
  HORIZON_COLORS.green,
  HORIZON_COLORS.blue,
  HORIZON_COLORS.purple,
  HORIZON_COLORS.pink,
  HORIZON_COLORS.cyan,
  HORIZON_COLORS.orange,
  HORIZON_COLORS.teal,
  HORIZON_COLORS.indigo
];

// פורמט מספרים בעברית
export const formatCurrencyHebrew = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return '₪0';
  
  if (Math.abs(value) >= 1000000) {
    return `₪${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `₪${(value / 1000).toFixed(0)}K`;
  }
  return `₪${value.toLocaleString('he-IL')}`;
};

// פורמט אחוזים
export const formatPercentage = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return '0%';
  return `${value.toFixed(1)}%`;
};

// פורמט מספרים כלליים
export const formatNumber = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return '0';
  
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toLocaleString('he-IL');
};

// Theme לתרשימי Nivo
export const NIVO_THEME = {
  text: {
    fill: 'var(--horizon-text, #334155)',
    fontSize: 12,
    fontFamily: 'Heebo, Inter, -apple-system, sans-serif',
    fontWeight: 500
  },
  axis: {
    domain: {
      line: {
        stroke: 'var(--horizon-border, #cbd5e1)',
        strokeWidth: 1.5
      }
    },
    ticks: {
      line: {
        stroke: 'var(--horizon-border, #e2e8f0)',
        strokeWidth: 1
      },
      text: {
        fill: 'var(--horizon-accent, #475569)',
        fontSize: 11,
        fontWeight: 500
      }
    },
    legend: {
      text: {
        fill: 'var(--horizon-text, #1e293b)',
        fontSize: 12,
        fontWeight: 600
      }
    }
  },
  tooltip: {
    container: {
      background: 'var(--horizon-card-bg, #ffffff)',
      color: 'var(--horizon-text, #1e293b)',
      fontSize: '13px',
      fontWeight: 500,
      borderRadius: '10px',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
      padding: '12px 16px',
      border: '1px solid var(--horizon-border, #e2e8f0)'
    }
  },
  grid: {
    line: {
      stroke: 'var(--horizon-border, #f1f5f9)',
      strokeWidth: 1,
      strokeDasharray: '4 4'
    }
  },
  legends: {
    text: {
      fill: 'var(--horizon-accent, #475569)',
      fontSize: 11,
      fontWeight: 500
    }
  },
  labels: {
    text: {
      fill: '#ffffff',
      fontSize: 11,
      fontWeight: 600
    }
  },
  crosshair: {
    line: {
      stroke: 'var(--horizon-accent, #64748b)',
      strokeWidth: 1,
      strokeOpacity: 0.5,
      strokeDasharray: '6 6'
    }
  }
};

// Theme ל-Recharts
export const RECHARTS_CONFIG = {
  cartesianGrid: {
    strokeDasharray: '3 3',
    stroke: 'var(--horizon-border, #e2e8f0)'
  },
  tooltip: {
    contentStyle: {
      backgroundColor: 'var(--horizon-card-bg, #ffffff)',
      border: '1px solid var(--horizon-border, #e2e8f0)',
      borderRadius: '10px',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
      direction: 'rtl',
      padding: '12px 16px'
    },
    labelStyle: {
      color: 'var(--horizon-text, #1e293b)',
      fontWeight: 'bold',
      marginBottom: '8px'
    },
    itemStyle: {
      color: 'var(--horizon-text, #1e293b)'
    }
  },
  xAxis: {
    stroke: 'var(--horizon-accent, #64748b)',
    tick: { fill: 'var(--horizon-accent, #64748b)', fontSize: 11 }
  },
  yAxis: {
    stroke: 'var(--horizon-accent, #64748b)',
    tick: { fill: 'var(--horizon-accent, #64748b)', fontSize: 11 }
  },
  legend: {
    wrapperStyle: {
      direction: 'rtl'
    }
  }
};

// Responsive breakpoints
export const CHART_BREAKPOINTS = {
  mobile: 400,
  tablet: 768,
  desktop: 1024
};

// חישוב גובה תרשים responsive
export const getResponsiveChartHeight = (containerWidth) => {
  if (containerWidth < CHART_BREAKPOINTS.mobile) return 250;
  if (containerWidth < CHART_BREAKPOINTS.tablet) return 300;
  return 350;
};

// יצירת gradient לתרשימים
export const createGradientDef = (id, color, opacity = 0.3) => ({
  id,
  type: 'linearGradient',
  colors: [
    { offset: 0, color, opacity: 0.8 },
    { offset: 100, color, opacity }
  ]
});

// קונפיגורציית legends ברירת מחדל
export const DEFAULT_LEGEND_CONFIG = {
  anchor: 'bottom',
  direction: 'row',
  justify: false,
  translateX: 0,
  translateY: 50,
  itemsSpacing: 12,
  itemWidth: 100,
  itemHeight: 20,
  itemDirection: 'right-to-left',
  itemOpacity: 1,
  symbolSize: 12,
  symbolShape: 'circle'
};

// פונקציה ליצירת tooltip מותאם אישית
export const createTooltipContent = (label, items, direction = 'rtl') => ({
  style: {
    background: 'var(--horizon-card-bg, #ffffff)',
    padding: '14px 18px',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    border: '1px solid var(--horizon-border, #e2e8f0)',
    direction,
    minWidth: '160px'
  },
  label,
  items
});

export default {
  HORIZON_COLORS,
  CHART_COLORS,
  formatCurrencyHebrew,
  formatPercentage,
  formatNumber,
  NIVO_THEME,
  RECHARTS_CONFIG,
  CHART_BREAKPOINTS,
  getResponsiveChartHeight,
  createGradientDef,
  DEFAULT_LEGEND_CONFIG,
  createTooltipContent
};