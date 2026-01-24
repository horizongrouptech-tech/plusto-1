/**
 * SVG Chart Generator for PDF Export
 * יוצר גרפים כ-SVG strings להטמעה ישירה ב-HTML
 * Best Practice: SVG מתרנדר מושלם בדפדפן ובהדפסה
 * 
 * v2.0 - שיפורים לקריאות:
 * - הגדלת מימדי הגרפים
 * - סיבוב תוויות ציר X
 * - מקרא אנכי למניעת חפיפה
 * - פונטים גדולים יותר
 */

const COLORS = {
  primary: '#32acc1',
  secondary: '#83ddec',
  orange: '#fc9f67',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  yellow: '#f59e0b',
  text: '#1a1a1a',
  textLight: '#5a6c7d',
  grid: '#e1e8ed',
  background: '#ffffff'
};

const MONTH_NAMES = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

/**
 * Format number to currency string
 */
const formatCurrency = (value, short = true) => {
  if (typeof value !== 'number' || isNaN(value)) return '₪0';
  if (short && Math.abs(value) >= 1000) {
    return `₪${(value / 1000).toFixed(0)}K`;
  }
  return `₪${Math.round(value).toLocaleString()}`;
};

/**
 * Calculate nice axis values
 */
const calculateAxisScale = (maxValue, minValue = 0) => {
  if (maxValue === 0 && minValue === 0) {
    return { min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100], step: 20 };
  }
  
  const range = maxValue - minValue;
  const rawStep = range / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const normalizedStep = rawStep / magnitude;
  
  let step;
  if (normalizedStep <= 1) step = magnitude;
  else if (normalizedStep <= 2) step = 2 * magnitude;
  else if (normalizedStep <= 5) step = 5 * magnitude;
  else step = 10 * magnitude;
  
  const niceMin = Math.floor(minValue / step) * step;
  const niceMax = Math.ceil(maxValue / step) * step;
  
  const ticks = [];
  for (let v = niceMin; v <= niceMax; v += step) {
    ticks.push(v);
  }
  
  return { min: niceMin, max: niceMax, ticks, step };
};

/**
 * Generate Bar Chart SVG - גרף עמודות משופר
 */
export function generateBarChartSVG({
  data,
  width = 850,
  height = 420,
  title,
  subtitle,
  dataKeys,
  colors,
  showLabels = false // Default: off for cleaner look
}) {
  // מרווחים מוגדלים - במיוחד למטה לתוויות מסובבות ולמקרא
  const margin = { top: 70, right: 40, bottom: 120, left: 90 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  // Calculate max value
  let maxValue = 0;
  data.forEach(item => {
    dataKeys.forEach(key => {
      if (item[key.key] > maxValue) maxValue = item[key.key];
    });
  });
  
  const scale = calculateAxisScale(maxValue);
  const barGroupWidth = chartWidth / data.length;
  const barWidth = Math.min((barGroupWidth - 15) / dataKeys.length, 35); // Max bar width
  const barGap = 3;
  
  // Build SVG
  let svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family: Arial, Helvetica, sans-serif; background: white;">
      <!-- Title -->
      <text x="${width / 2}" y="28" text-anchor="middle" font-size="20" font-weight="bold" fill="${COLORS.text}">${title}</text>
      ${subtitle ? `<text x="${width / 2}" y="52" text-anchor="middle" font-size="14" fill="${COLORS.textLight}">${subtitle}</text>` : ''}
      
      <!-- Chart Area -->
      <g transform="translate(${margin.left}, ${margin.top})">
        <!-- Grid Lines & Y Axis Labels -->
        ${scale.ticks.map(tick => {
          const y = chartHeight - (tick / scale.max) * chartHeight;
          return `
            <line x1="0" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="${COLORS.grid}" stroke-dasharray="4,4"/>
            <text x="-15" y="${y + 5}" text-anchor="end" font-size="13" font-weight="500" fill="${COLORS.textLight}">${formatCurrency(tick)}</text>
          `;
        }).join('')}
        
        <!-- Y Axis Line -->
        <line x1="0" y1="0" x2="0" y2="${chartHeight}" stroke="${COLORS.grid}" stroke-width="2"/>
        
        <!-- Bars -->
        ${data.map((item, i) => {
          const groupX = i * barGroupWidth;
          const groupCenterX = groupX + barGroupWidth / 2;
          const totalBarsWidth = dataKeys.length * barWidth + (dataKeys.length - 1) * barGap;
          const startX = groupCenterX - totalBarsWidth / 2;
          
          return dataKeys.map((key, j) => {
            const value = item[key.key] || 0;
            const barHeight = scale.max > 0 ? (value / scale.max) * chartHeight : 0;
            const barX = startX + j * (barWidth + barGap);
            const barY = chartHeight - barHeight;
            const color = colors[j] || COLORS.primary;
            
            return `
              <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="3"/>
              ${showLabels && value > 0 ? `
                <text x="${barX + barWidth / 2}" y="${barY - 8}" text-anchor="middle" font-size="11" font-weight="bold" fill="${color}">${formatCurrency(value)}</text>
              ` : ''}
            `;
          }).join('');
        }).join('')}
        
        <!-- X Axis Line -->
        <line x1="0" y1="${chartHeight}" x2="${chartWidth}" y2="${chartHeight}" stroke="${COLORS.grid}" stroke-width="2"/>
        
        <!-- X Axis Labels - Rotated 45 degrees -->
        ${data.map((item, i) => {
          const x = i * barGroupWidth + barGroupWidth / 2;
          return `
            <g transform="translate(${x}, ${chartHeight + 15})">
              <text transform="rotate(-45)" text-anchor="end" font-size="13" font-weight="500" fill="${COLORS.text}">${item.name}</text>
            </g>
          `;
        }).join('')}
      </g>
      
      <!-- Legend - Horizontal at bottom with proper spacing -->
      <g transform="translate(${width / 2 - (dataKeys.length * 110) / 2}, ${height - 35})">
        ${dataKeys.map((key, i) => `
          <g transform="translate(${i * 130}, 0)">
            <rect x="0" y="0" width="16" height="16" fill="${colors[i]}" rx="3"/>
            <text x="22" y="13" font-size="14" font-weight="500" fill="${COLORS.text}">${key.label}</text>
          </g>
        `).join('')}
      </g>
    </svg>
  `;
  
  return svg;
}

/**
 * Generate Line Chart SVG - גרף קווי משופר
 */
export function generateLineChartSVG({
  data,
  width = 850,
  height = 420,
  title,
  subtitle,
  dataKeys,
  colors
}) {
  const margin = { top: 70, right: 40, bottom: 120, left: 90 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  // Calculate max and min values
  let maxValue = 0;
  let minValue = 0;
  data.forEach(item => {
    dataKeys.forEach(key => {
      const val = item[key.key] || 0;
      if (val > maxValue) maxValue = val;
      if (val < minValue) minValue = val;
    });
  });
  
  const scale = calculateAxisScale(maxValue, minValue);
  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;
  
  // Generate paths
  const paths = dataKeys.map((key, keyIndex) => {
    const points = data.map((item, i) => {
      const value = item[key.key] || 0;
      const x = data.length > 1 ? i * xStep : chartWidth / 2;
      const range = scale.max - scale.min;
      const y = range > 0 ? chartHeight - ((value - scale.min) / range) * chartHeight : chartHeight / 2;
      return { x, y, value };
    });
    
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const color = colors[keyIndex];
    
    return {
      path: `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
      dots: points.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="6" fill="${color}" stroke="white" stroke-width="2"/>
      `).join(''),
      label: key.label,
      color
    };
  });
  
  let svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family: Arial, Helvetica, sans-serif; background: white;">
      <!-- Title -->
      <text x="${width / 2}" y="28" text-anchor="middle" font-size="20" font-weight="bold" fill="${COLORS.text}">${title}</text>
      ${subtitle ? `<text x="${width / 2}" y="52" text-anchor="middle" font-size="14" fill="${COLORS.textLight}">${subtitle}</text>` : ''}
      
      <!-- Chart Area -->
      <g transform="translate(${margin.left}, ${margin.top})">
        <!-- Grid Lines & Y Axis Labels -->
        ${scale.ticks.map(tick => {
          const range = scale.max - scale.min;
          const y = range > 0 ? chartHeight - ((tick - scale.min) / range) * chartHeight : chartHeight / 2;
          return `
            <line x1="0" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="${COLORS.grid}" stroke-dasharray="4,4"/>
            <text x="-15" y="${y + 5}" text-anchor="end" font-size="13" font-weight="500" fill="${COLORS.textLight}">${formatCurrency(tick)}</text>
          `;
        }).join('')}
        
        <!-- Y Axis Line -->
        <line x1="0" y1="0" x2="0" y2="${chartHeight}" stroke="${COLORS.grid}" stroke-width="2"/>
        
        <!-- Lines -->
        ${paths.map(p => p.path).join('')}
        
        <!-- Dots -->
        ${paths.map(p => p.dots).join('')}
        
        <!-- X Axis Line -->
        <line x1="0" y1="${chartHeight}" x2="${chartWidth}" y2="${chartHeight}" stroke="${COLORS.grid}" stroke-width="2"/>
        
        <!-- X Axis Labels - Rotated 45 degrees -->
        ${data.map((item, i) => {
          const x = data.length > 1 ? i * xStep : chartWidth / 2;
          return `
            <g transform="translate(${x}, ${chartHeight + 15})">
              <text transform="rotate(-45)" text-anchor="end" font-size="13" font-weight="500" fill="${COLORS.text}">${item.name}</text>
            </g>
          `;
        }).join('')}
      </g>
      
      <!-- Legend - Horizontal at bottom with proper spacing -->
      <g transform="translate(${width / 2 - (dataKeys.length * 120) / 2}, ${height - 35})">
        ${paths.map((p, i) => `
          <g transform="translate(${i * 140}, 0)">
            <line x1="0" y1="8" x2="24" y2="8" stroke="${p.color}" stroke-width="3" stroke-linecap="round"/>
            <circle cx="12" cy="8" r="5" fill="${p.color}" stroke="white" stroke-width="1"/>
            <text x="32" y="13" font-size="14" font-weight="500" fill="${COLORS.text}">${p.label}</text>
          </g>
        `).join('')}
      </g>
    </svg>
  `;
  
  return svg;
}

/**
 * Generate Pie Chart SVG - גרף עוגה משופר
 */
export function generatePieChartSVG({
  data, // Array of { label, value, color }
  width = 500,
  height = 450,
  title
}) {
  const centerX = width / 2;
  const centerY = height / 2 - 20;
  const radius = Math.min(width, height) / 2 - 100;
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="font-family: Arial, Helvetica, sans-serif; background: white;">
      <text x="${centerX}" y="${centerY}" text-anchor="middle" font-size="16" fill="${COLORS.textLight}">אין נתונים להצגה</text>
    </svg>`;
  }
  
  let currentAngle = -Math.PI / 2; // Start from top
  
  const slices = data.map((item, i) => {
    const percentage = item.value / total;
    const angle = percentage * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    
    const largeArc = angle > Math.PI ? 1 : 0;
    
    const midAngle = startAngle + angle / 2;
    const labelRadius = radius * 0.65;
    const labelX = centerX + labelRadius * Math.cos(midAngle);
    const labelY = centerY + labelRadius * Math.sin(midAngle);
    
    return {
      path: `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: item.color,
      label: item.label,
      value: item.value,
      percentage: (percentage * 100).toFixed(1),
      labelX,
      labelY
    };
  });
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family: Arial, Helvetica, sans-serif; background: white;">
      <!-- Title -->
      <text x="${width / 2}" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="${COLORS.text}">${title}</text>
      
      <!-- Pie Slices -->
      ${slices.map(slice => `
        <path d="${slice.path}" fill="${slice.color}" stroke="white" stroke-width="3"/>
        ${parseFloat(slice.percentage) > 8 ? `
          <text x="${slice.labelX}" y="${slice.labelY}" text-anchor="middle" font-size="14" font-weight="bold" fill="white" stroke="#00000033" stroke-width="0.5">${slice.percentage}%</text>
        ` : ''}
      `).join('')}
      
      <!-- Legend - Vertical on the right side for better readability -->
      <g transform="translate(20, ${height - 30 - slices.length * 28})">
        ${slices.map((slice, i) => `
          <g transform="translate(0, ${i * 28})">
            <rect x="0" y="0" width="18" height="18" fill="${slice.color}" rx="3"/>
            <text x="26" y="14" font-size="13" font-weight="500" fill="${COLORS.text}">${slice.label}</text>
            <text x="${width - 50}" y="14" text-anchor="end" font-size="13" font-weight="600" fill="${COLORS.text}">${formatCurrency(slice.value, false)}</text>
          </g>
        `).join('')}
      </g>
    </svg>
  `;
}

/**
 * Generate all forecast charts for PDF
 */
export function generateForecastCharts(forecast) {
  const charts = {};
  const monthNames = MONTH_NAMES;
  
  // Prepare monthly data
  const monthlyData = (forecast.profit_loss_monthly || []).map(month => ({
    name: monthNames[month.month - 1] || `חודש ${month.month}`,
    revenue: month.revenue || 0,
    costOfSale: month.cost_of_sale || 0,
    grossProfit: month.gross_profit || 0,
    operatingProfit: month.operating_profit || 0,
    netProfit: month.net_profit || 0,
    salaryExpenses: month.salary_expenses || 0,
    financingExpenses: month.financing_expenses || 0
  }));
  
  if (monthlyData.length > 0) {
    // Revenue and Profit Chart
    charts.revenueChart = generateBarChartSVG({
      data: monthlyData,
      width: 850,
      height: 450,
      title: 'הכנסות, עלות מכר ורווח גולמי',
      subtitle: 'פירוט חודשי - סכומים בש"ח',
      dataKeys: [
        { key: 'revenue', label: 'הכנסות' },
        { key: 'costOfSale', label: 'עלות מכר' },
        { key: 'grossProfit', label: 'רווח גולמי' }
      ],
      colors: [COLORS.primary, COLORS.orange, COLORS.green],
      showLabels: false
    });
    
    // Profit Trend Chart
    charts.profitChart = generateLineChartSVG({
      data: monthlyData,
      width: 850,
      height: 450,
      title: 'מגמת רווחיות',
      subtitle: 'רווח גולמי, תפעולי ונקי לאורך השנה',
      dataKeys: [
        { key: 'grossProfit', label: 'רווח גולמי' },
        { key: 'operatingProfit', label: 'רווח תפעולי' },
        { key: 'netProfit', label: 'רווח נקי' }
      ],
      colors: [COLORS.green, COLORS.blue, '#10B981']
    });
  }
  
  // Summary Pie Chart
  if (forecast.summary) {
    const summary = forecast.summary;
    
    charts.summaryPie = generatePieChartSVG({
      data: [
        { label: 'רווח נקי', value: Math.max(0, summary.net_profit || 0), color: COLORS.green },
        { label: 'עלות מכר', value: Math.max(0, (summary.total_revenue || 0) - (summary.gross_profit || 0)), color: COLORS.orange },
        { label: 'הוצאות תפעול', value: Math.max(0, (summary.gross_profit || 0) - (summary.operating_profit || 0)), color: COLORS.blue },
        { label: 'הוצאות מימון', value: Math.max(0, summary.financing_expenses || 0), color: COLORS.red },
        { label: 'מיסים', value: Math.max(0, (summary.profit_before_tax || 0) - (summary.net_profit || 0)), color: COLORS.purple }
      ].filter(item => item.value > 0),
      width: 500,
      height: 450,
      title: 'התפלגות הכנסות והוצאות'
    });
  }
  
  return charts;
}

export { COLORS, MONTH_NAMES, formatCurrency };
