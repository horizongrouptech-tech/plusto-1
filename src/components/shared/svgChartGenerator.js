/**
 * SVG Chart Generator for PDF Export
 * יוצר גרפים כ-SVG strings להטמעה ישירה ב-HTML
 * Best Practice: SVG מתרנדר מושלם בדפדפן ובהדפסה
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

const MONTH_NAMES = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];

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
  const range = maxValue - minValue;
  const rawStep = range / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
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
 * Generate Bar Chart SVG
 */
export function generateBarChartSVG({
  data,
  width = 700,
  height = 350,
  title,
  subtitle,
  dataKeys,
  colors,
  showLabels = true
}) {
  const margin = { top: 60, right: 30, bottom: 60, left: 80 };
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
  const barWidth = (barGroupWidth - 20) / dataKeys.length;
  
  // Build SVG
  let svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family: Arial, sans-serif; background: white;">
      <!-- Title -->
      <text x="${width / 2}" y="25" text-anchor="middle" font-size="18" font-weight="bold" fill="${COLORS.text}">${title}</text>
      ${subtitle ? `<text x="${width / 2}" y="45" text-anchor="middle" font-size="12" fill="${COLORS.textLight}">${subtitle}</text>` : ''}
      
      <!-- Chart Area -->
      <g transform="translate(${margin.left}, ${margin.top})">
        <!-- Grid Lines -->
        ${scale.ticks.map(tick => {
          const y = chartHeight - (tick / scale.max) * chartHeight;
          return `
            <line x1="0" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="${COLORS.grid}" stroke-dasharray="4,4"/>
            <text x="-10" y="${y + 4}" text-anchor="end" font-size="11" fill="${COLORS.textLight}">${formatCurrency(tick)}</text>
          `;
        }).join('')}
        
        <!-- Bars -->
        ${data.map((item, i) => {
          const groupX = i * barGroupWidth + 10;
          return dataKeys.map((key, j) => {
            const value = item[key.key] || 0;
            const barHeight = (value / scale.max) * chartHeight;
            const barX = groupX + j * barWidth;
            const barY = chartHeight - barHeight;
            const color = colors[j] || COLORS.primary;
            
            return `
              <rect x="${barX}" y="${barY}" width="${barWidth - 4}" height="${barHeight}" fill="${color}" rx="4"/>
              ${showLabels && value > 0 ? `
                <text x="${barX + (barWidth - 4) / 2}" y="${barY - 5}" text-anchor="middle" font-size="10" font-weight="bold" fill="${color}">${formatCurrency(value)}</text>
              ` : ''}
            `;
          }).join('');
        }).join('')}
        
        <!-- X Axis Labels -->
        ${data.map((item, i) => {
          const x = i * barGroupWidth + barGroupWidth / 2;
          return `<text x="${x}" y="${chartHeight + 20}" text-anchor="middle" font-size="11" fill="${COLORS.text}">${item.name}</text>`;
        }).join('')}
        
        <!-- X Axis Line -->
        <line x1="0" y1="${chartHeight}" x2="${chartWidth}" y2="${chartHeight}" stroke="${COLORS.grid}" stroke-width="2"/>
      </g>
      
      <!-- Legend -->
      <g transform="translate(${width / 2 - (dataKeys.length * 80) / 2}, ${height - 25})">
        ${dataKeys.map((key, i) => `
          <rect x="${i * 100}" y="0" width="12" height="12" fill="${colors[i]}" rx="2"/>
          <text x="${i * 100 + 18}" y="10" font-size="11" fill="${COLORS.text}">${key.label}</text>
        `).join('')}
      </g>
    </svg>
  `;
  
  return svg;
}

/**
 * Generate Line Chart SVG
 */
export function generateLineChartSVG({
  data,
  width = 700,
  height = 350,
  title,
  subtitle,
  dataKeys,
  colors
}) {
  const margin = { top: 60, right: 30, bottom: 60, left: 80 };
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
  const xStep = chartWidth / (data.length - 1 || 1);
  
  // Generate paths
  const paths = dataKeys.map((key, keyIndex) => {
    const points = data.map((item, i) => {
      const value = item[key.key] || 0;
      const x = i * xStep;
      const y = chartHeight - ((value - scale.min) / (scale.max - scale.min)) * chartHeight;
      return { x, y, value };
    });
    
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const color = colors[keyIndex];
    
    return {
      path: `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
      dots: points.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="5" fill="${color}" stroke="white" stroke-width="2"/>
        <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" font-size="9" font-weight="bold" fill="${color}">${formatCurrency(p.value)}</text>
      `).join(''),
      label: key.label,
      color
    };
  });
  
  let svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family: Arial, sans-serif; background: white;">
      <!-- Title -->
      <text x="${width / 2}" y="25" text-anchor="middle" font-size="18" font-weight="bold" fill="${COLORS.text}">${title}</text>
      ${subtitle ? `<text x="${width / 2}" y="45" text-anchor="middle" font-size="12" fill="${COLORS.textLight}">${subtitle}</text>` : ''}
      
      <!-- Chart Area -->
      <g transform="translate(${margin.left}, ${margin.top})">
        <!-- Grid Lines -->
        ${scale.ticks.map(tick => {
          const y = chartHeight - ((tick - scale.min) / (scale.max - scale.min)) * chartHeight;
          return `
            <line x1="0" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="${COLORS.grid}" stroke-dasharray="4,4"/>
            <text x="-10" y="${y + 4}" text-anchor="end" font-size="11" fill="${COLORS.textLight}">${formatCurrency(tick)}</text>
          `;
        }).join('')}
        
        <!-- Lines -->
        ${paths.map(p => p.path).join('')}
        
        <!-- Dots and Labels -->
        ${paths.map(p => p.dots).join('')}
        
        <!-- X Axis Labels -->
        ${data.map((item, i) => {
          const x = i * xStep;
          return `<text x="${x}" y="${chartHeight + 20}" text-anchor="middle" font-size="11" fill="${COLORS.text}">${item.name}</text>`;
        }).join('')}
        
        <!-- X Axis Line -->
        <line x1="0" y1="${chartHeight}" x2="${chartWidth}" y2="${chartHeight}" stroke="${COLORS.grid}" stroke-width="2"/>
      </g>
      
      <!-- Legend -->
      <g transform="translate(${width / 2 - (dataKeys.length * 100) / 2}, ${height - 25})">
        ${paths.map((p, i) => `
          <line x1="${i * 120}" y1="6" x2="${i * 120 + 20}" y2="6" stroke="${p.color}" stroke-width="3"/>
          <text x="${i * 120 + 28}" y="10" font-size="11" fill="${COLORS.text}">${p.label}</text>
        `).join('')}
      </g>
    </svg>
  `;
  
  return svg;
}

/**
 * Generate Pie Chart SVG
 */
export function generatePieChartSVG({
  data, // Array of { label, value, color }
  width = 400,
  height = 350,
  title
}) {
  const centerX = width / 2;
  const centerY = height / 2 + 20;
  const radius = Math.min(width, height) / 2 - 60;
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <text x="${centerX}" y="${centerY}" text-anchor="middle" fill="${COLORS.textLight}">אין נתונים</text>
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
    const labelRadius = radius * 0.7;
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
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family: Arial, sans-serif; background: white;">
      <!-- Title -->
      <text x="${width / 2}" y="25" text-anchor="middle" font-size="18" font-weight="bold" fill="${COLORS.text}">${title}</text>
      
      <!-- Pie Slices -->
      ${slices.map(slice => `
        <path d="${slice.path}" fill="${slice.color}" stroke="white" stroke-width="2"/>
        ${parseFloat(slice.percentage) > 5 ? `
          <text x="${slice.labelX}" y="${slice.labelY}" text-anchor="middle" font-size="11" font-weight="bold" fill="white">${slice.percentage}%</text>
        ` : ''}
      `).join('')}
      
      <!-- Legend -->
      <g transform="translate(10, ${height - 50})">
        ${slices.map((slice, i) => `
          <g transform="translate(${(i % 3) * 130}, ${Math.floor(i / 3) * 18})">
            <rect x="0" y="0" width="12" height="12" fill="${slice.color}" rx="2"/>
            <text x="18" y="10" font-size="10" fill="${COLORS.text}">${slice.label}: ${formatCurrency(slice.value, false)}</text>
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
      title: 'הכנסות, עלות מכר ורווח גולמי',
      subtitle: 'פירוט חודשי - סכומים בש"ח',
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
    const totalExpenses = (summary.total_revenue || 0) - (summary.net_profit || 0);
    
    charts.summaryPie = generatePieChartSVG({
      data: [
        { label: 'רווח נקי', value: Math.max(0, summary.net_profit || 0), color: COLORS.green },
        { label: 'עלות מכר', value: Math.max(0, (summary.total_revenue || 0) - (summary.gross_profit || 0)), color: COLORS.orange },
        { label: 'הוצאות תפעול', value: Math.max(0, (summary.gross_profit || 0) - (summary.operating_profit || 0)), color: COLORS.blue },
        { label: 'הוצאות מימון', value: Math.max(0, summary.financing_expenses || 0), color: COLORS.red },
        { label: 'מיסים', value: Math.max(0, (summary.profit_before_tax || 0) - (summary.net_profit || 0)), color: COLORS.purple }
      ].filter(item => item.value > 0),
      title: 'התפלגות הכנסות והוצאות'
    });
  }
  
  return charts;
}

export { COLORS, MONTH_NAMES, formatCurrency };
