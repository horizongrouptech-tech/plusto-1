/**
 * SVG Chart Generator for PDF Export - Professional Edition
 * מחולל גרפים מקצועי לייצוא PDF
 * 
 * v3.0 - עיצוב מקצועי מלא:
 * - תוויות ברורות וקריאות
 * - צבעים מקצועיים
 * - ריווח מושלם
 * - תמיכה מלאה בעברית RTL
 */

const COLORS = {
  primary: '#0891b2',      // Cyan 600
  secondary: '#06b6d4',    // Cyan 500
  orange: '#f97316',       // Orange 500
  green: '#10b981',        // Emerald 500
  red: '#ef4444',          // Red 500
  blue: '#3b82f6',         // Blue 500
  purple: '#8b5cf6',       // Violet 500
  yellow: '#eab308',       // Yellow 500
  text: '#1e293b',         // Slate 800
  textLight: '#64748b',    // Slate 500
  grid: '#e2e8f0',         // Slate 200
  background: '#ffffff'
};

// שמות חודשים מקוצרים לקריאות טובה יותר
const MONTH_NAMES_SHORT = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
const MONTH_NAMES_FULL = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

/**
 * Format number to currency string
 */
const formatCurrency = (value, short = true) => {
  if (typeof value !== 'number' || isNaN(value)) return '₪0';
  if (short && Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M₪`;
  }
  if (short && Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(0)}K₪`;
  }
  return `${Math.round(value).toLocaleString()}₪`;
};

/**
 * Calculate nice axis values
 */
const calculateAxisScale = (maxValue, minValue = 0) => {
  if (maxValue === 0 && minValue === 0) {
    return { min: 0, max: 100, ticks: [0, 25, 50, 75, 100], step: 25 };
  }
  
  const range = Math.max(maxValue - minValue, 1);
  const rawStep = range / 4;
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
  for (let v = niceMin; v <= niceMax + step * 0.1; v += step) {
    ticks.push(Math.round(v));
  }
  
  return { min: niceMin, max: niceMax, ticks, step };
};

/**
 * Generate Professional Bar Chart SVG
 */
export function generateBarChartSVG({
  data,
  width = 750,
  height = 380,
  title,
  subtitle,
  dataKeys,
  colors
}) {
  const margin = { top: 50, right: 20, bottom: 80, left: 70 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  // Filter data with values
  const activeData = data.filter(item => 
    dataKeys.some(key => (item[key.key] || 0) > 0)
  );
  
  if (activeData.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="font-family: Arial, sans-serif;">
      <rect width="${width}" height="${height}" fill="white"/>
      <text x="${width/2}" y="${height/2}" text-anchor="middle" fill="${COLORS.textLight}" font-size="16">אין נתונים להצגה</text>
    </svg>`;
  }
  
  // Calculate max value
  let maxValue = 0;
  activeData.forEach(item => {
    dataKeys.forEach(key => {
      if (item[key.key] > maxValue) maxValue = item[key.key];
    });
  });
  
  const scale = calculateAxisScale(maxValue);
  const barGroupWidth = chartWidth / activeData.length;
  const totalBarsWidth = dataKeys.length * 20 + (dataKeys.length - 1) * 4;
  const barWidth = Math.min(20, (barGroupWidth - 20) / dataKeys.length);
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family: Arial, Helvetica, sans-serif;">
      <rect width="${width}" height="${height}" fill="white"/>
      
      <!-- Title -->
      <text x="${width / 2}" y="25" text-anchor="middle" font-size="18" font-weight="bold" fill="${COLORS.text}" direction="rtl">${title}</text>
      ${subtitle ? `<text x="${width / 2}" y="42" text-anchor="middle" font-size="12" fill="${COLORS.textLight}" direction="rtl">${subtitle}</text>` : ''}
      
      <!-- Chart Area -->
      <g transform="translate(${margin.left}, ${margin.top})">
        <!-- Grid Lines -->
        ${scale.ticks.map(tick => {
          const y = chartHeight - (tick / scale.max) * chartHeight;
          return `
            <line x1="0" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1"/>
            <text x="-8" y="${y + 4}" text-anchor="end" font-size="11" fill="${COLORS.textLight}">${formatCurrency(tick)}</text>
          `;
        }).join('')}
        
        <!-- Bars -->
        ${activeData.map((item, i) => {
          const groupX = i * barGroupWidth + (barGroupWidth - totalBarsWidth) / 2;
          
          return dataKeys.map((key, j) => {
            const value = item[key.key] || 0;
            const barHeight = scale.max > 0 ? (value / scale.max) * chartHeight : 0;
            const barX = groupX + j * (barWidth + 4);
            const barY = chartHeight - barHeight;
            const color = colors[j];
            
            return `<rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="2"/>`;
          }).join('');
        }).join('')}
        
        <!-- X Axis -->
        <line x1="0" y1="${chartHeight}" x2="${chartWidth}" y2="${chartHeight}" stroke="${COLORS.grid}" stroke-width="2"/>
        
        <!-- X Labels -->
        ${activeData.map((item, i) => {
          const x = i * barGroupWidth + barGroupWidth / 2;
          // Use short month name
          const shortName = item.name.substring(0, 3);
          return `<text x="${x}" y="${chartHeight + 18}" text-anchor="middle" font-size="11" fill="${COLORS.text}">${shortName}</text>`;
        }).join('')}
      </g>
      
      <!-- Legend -->
      <g transform="translate(${width / 2 - (dataKeys.length * 70) / 2}, ${height - 25})">
        ${dataKeys.map((key, i) => `
          <g transform="translate(${i * 90}, 0)">
            <rect x="0" y="0" width="14" height="14" fill="${colors[i]}" rx="2"/>
            <text x="18" y="11" font-size="12" fill="${COLORS.text}">${key.label}</text>
          </g>
        `).join('')}
      </g>
    </svg>
  `;
}

/**
 * Generate Professional Line Chart SVG
 */
export function generateLineChartSVG({
  data,
  width = 750,
  height = 380,
  title,
  subtitle,
  dataKeys,
  colors
}) {
  const margin = { top: 50, right: 20, bottom: 80, left: 70 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  // Filter data with values
  const activeData = data.filter(item => 
    dataKeys.some(key => (item[key.key] || 0) !== 0)
  );
  
  if (activeData.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="font-family: Arial, sans-serif;">
      <rect width="${width}" height="${height}" fill="white"/>
      <text x="${width/2}" y="${height/2}" text-anchor="middle" fill="${COLORS.textLight}" font-size="16">אין נתונים להצגה</text>
    </svg>`;
  }
  
  // Calculate min/max
  let maxValue = 0;
  let minValue = 0;
  activeData.forEach(item => {
    dataKeys.forEach(key => {
      const val = item[key.key] || 0;
      if (val > maxValue) maxValue = val;
      if (val < minValue) minValue = val;
    });
  });
  
  const scale = calculateAxisScale(maxValue, minValue);
  const xStep = activeData.length > 1 ? chartWidth / (activeData.length - 1) : chartWidth / 2;
  
  // Generate paths
  const paths = dataKeys.map((key, keyIndex) => {
    const points = activeData.map((item, i) => {
      const value = item[key.key] || 0;
      const x = activeData.length > 1 ? i * xStep : chartWidth / 2;
      const range = scale.max - scale.min;
      const y = range > 0 ? chartHeight - ((value - scale.min) / range) * chartHeight : chartHeight / 2;
      return { x, y, value };
    });
    
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    
    return {
      pathD,
      points,
      color: colors[keyIndex],
      label: key.label
    };
  });
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family: Arial, Helvetica, sans-serif;">
      <rect width="${width}" height="${height}" fill="white"/>
      
      <!-- Title -->
      <text x="${width / 2}" y="25" text-anchor="middle" font-size="18" font-weight="bold" fill="${COLORS.text}" direction="rtl">${title}</text>
      ${subtitle ? `<text x="${width / 2}" y="42" text-anchor="middle" font-size="12" fill="${COLORS.textLight}" direction="rtl">${subtitle}</text>` : ''}
      
      <!-- Chart Area -->
      <g transform="translate(${margin.left}, ${margin.top})">
        <!-- Grid Lines -->
        ${scale.ticks.map(tick => {
          const range = scale.max - scale.min;
          const y = range > 0 ? chartHeight - ((tick - scale.min) / range) * chartHeight : chartHeight / 2;
          return `
            <line x1="0" y1="${y.toFixed(1)}" x2="${chartWidth}" y2="${y.toFixed(1)}" stroke="${COLORS.grid}" stroke-width="1"/>
            <text x="-8" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="${COLORS.textLight}">${formatCurrency(tick)}</text>
          `;
        }).join('')}
        
        <!-- Lines -->
        ${paths.map(p => `
          <path d="${p.pathD}" fill="none" stroke="${p.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        `).join('')}
        
        <!-- Dots -->
        ${paths.map(p => p.points.map(point => `
          <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4" fill="${p.color}" stroke="white" stroke-width="2"/>
        `).join('')).join('')}
        
        <!-- X Axis -->
        <line x1="0" y1="${chartHeight}" x2="${chartWidth}" y2="${chartHeight}" stroke="${COLORS.grid}" stroke-width="2"/>
        
        <!-- X Labels -->
        ${activeData.map((item, i) => {
          const x = activeData.length > 1 ? i * xStep : chartWidth / 2;
          const shortName = item.name.substring(0, 3);
          return `<text x="${x.toFixed(1)}" y="${chartHeight + 18}" text-anchor="middle" font-size="11" fill="${COLORS.text}">${shortName}</text>`;
        }).join('')}
      </g>
      
      <!-- Legend -->
      <g transform="translate(${width / 2 - (dataKeys.length * 85) / 2}, ${height - 25})">
        ${paths.map((p, i) => `
          <g transform="translate(${i * 110}, 0)">
            <line x1="0" y1="7" x2="18" y2="7" stroke="${p.color}" stroke-width="3" stroke-linecap="round"/>
            <circle cx="9" cy="7" r="4" fill="${p.color}" stroke="white" stroke-width="1"/>
            <text x="24" y="11" font-size="12" fill="${COLORS.text}">${p.label}</text>
          </g>
        `).join('')}
      </g>
    </svg>
  `;
}

/**
 * Generate Professional Pie Chart SVG
 */
export function generatePieChartSVG({
  data,
  width = 450,
  height = 350,
  title
}) {
  // Filter out zero values
  const activeData = data.filter(item => item.value > 0);
  
  if (activeData.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="font-family: Arial, sans-serif;">
      <rect width="${width}" height="${height}" fill="white"/>
      <text x="${width/2}" y="${height/2}" text-anchor="middle" fill="${COLORS.textLight}" font-size="16">אין נתונים להצגה</text>
    </svg>`;
  }
  
  const centerX = width / 2;
  const centerY = 160;
  const radius = 100;
  
  const total = activeData.reduce((sum, item) => sum + item.value, 0);
  
  let currentAngle = -Math.PI / 2;
  
  const slices = activeData.map((item) => {
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
      path: `M ${centerX} ${centerY} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`,
      color: item.color,
      label: item.label,
      value: item.value,
      percentage: (percentage * 100).toFixed(1),
      labelX,
      labelY
    };
  });
  
  // Calculate legend position
  const legendStartY = centerY + radius + 30;
  const legendItemHeight = 24;
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family: Arial, Helvetica, sans-serif;">
      <rect width="${width}" height="${height}" fill="white"/>
      
      <!-- Title -->
      <text x="${width / 2}" y="28" text-anchor="middle" font-size="18" font-weight="bold" fill="${COLORS.text}" direction="rtl">${title}</text>
      
      <!-- Pie Slices -->
      ${slices.map(slice => `
        <path d="${slice.path}" fill="${slice.color}" stroke="white" stroke-width="2"/>
        ${parseFloat(slice.percentage) > 10 ? `
          <text x="${slice.labelX.toFixed(1)}" y="${(slice.labelY + 5).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="bold" fill="white">${slice.percentage}%</text>
        ` : ''}
      `).join('')}
      
      <!-- Legend as table -->
      <g transform="translate(30, ${legendStartY})">
        ${slices.map((slice, i) => `
          <g transform="translate(0, ${i * legendItemHeight})">
            <rect x="0" y="0" width="14" height="14" fill="${slice.color}" rx="2"/>
            <text x="22" y="12" font-size="12" fill="${COLORS.text}">${slice.label}</text>
            <text x="${width - 60}" y="12" text-anchor="end" font-size="12" font-weight="600" fill="${COLORS.text}">${formatCurrency(slice.value, false)}</text>
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
  
  // Prepare monthly data
  const monthlyData = (forecast.profit_loss_monthly || []).map(month => ({
    name: MONTH_NAMES_FULL[month.month - 1] || `חודש ${month.month}`,
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
      width: 700,
      height: 350,
      title: 'הכנסות, עלות מכר ורווח גולמי',
      subtitle: 'פירוט חודשי',
      dataKeys: [
        { key: 'revenue', label: 'הכנסות' },
        { key: 'costOfSale', label: 'עלות מכר' },
        { key: 'grossProfit', label: 'רווח גולמי' }
      ],
      colors: [COLORS.primary, COLORS.orange, COLORS.green]
    });
    
    // Profit Trend Chart
    charts.profitChart = generateLineChartSVG({
      data: monthlyData,
      width: 700,
      height: 350,
      title: 'מגמת רווחיות',
      subtitle: 'רווח גולמי, תפעולי ונקי',
      dataKeys: [
        { key: 'grossProfit', label: 'רווח גולמי' },
        { key: 'operatingProfit', label: 'רווח תפעולי' },
        { key: 'netProfit', label: 'רווח נקי' }
      ],
      colors: [COLORS.green, COLORS.blue, '#059669']
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
      width: 420,
      height: 380,
      title: 'התפלגות הכנסות והוצאות'
    });
  }
  
  return charts;
}

export { COLORS, MONTH_NAMES_SHORT, MONTH_NAMES_FULL, formatCurrency };
