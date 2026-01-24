import { formatCurrency } from '../forecast/manual/utils/numberFormatter';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { generateForecastCharts } from './svgChartGenerator';

/**
 * Generate professional forecast HTML for PDF export
 * @param {Object} forecast - The forecast data
 * @param {string} type - 'manual' or 'automatic'
 * @param {Object} options - Export options
 * @param {string} customerName - Customer business name
 */
export function generateForecastHTML(forecast, type, options = {}, customerName = '') {
  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  // Default options - include everything
  const exportOptions = {
    includeSummary: true,
    includeServices: true,
    includeMonthlyTable: true,
    includeRevenueChart: true,
    includeProfitChart: true,
    includeSummaryPie: true,
    ...options
  };

  const getMonthsToDisplay = () => {
    if (!forecast.start_month || !forecast.end_month) return monthNames;
    return monthNames.slice(forecast.start_month - 1, forecast.end_month);
  };

  const displayMonths = getMonthsToDisplay();

  // Generate charts if needed
  let charts = {};
  if (exportOptions.includeRevenueChart || exportOptions.includeProfitChart || exportOptions.includeSummaryPie) {
    charts = generateForecastCharts(forecast);
  }

  const styles = `
    @media print {
      body { margin: 0; padding: 0; }
      .print-container { width: 100%; }
      .no-print { display: none !important; }
      .page-break { page-break-after: always; }
      .avoid-break { page-break-inside: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      .chart-container { page-break-inside: avoid; }
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .print-container {
      font-family: 'Arial', 'Calibri', sans-serif;
      padding: 40px;
      background: white;
      color: #1a1a1a;
      max-width: 1200px;
      margin: 0 auto;
      direction: rtl;
    }

    .report-header {
      text-align: center;
      border-bottom: 4px solid #32acc1;
      padding-bottom: 30px;
      margin-bottom: 40px;
      background: linear-gradient(135deg, #f8fbfc 0%, #ffffff 100%);
      padding: 30px;
      border-radius: 12px;
    }

    .logo-container {
      margin-bottom: 15px;
    }

    .report-title {
      font-size: 32px;
      font-weight: 700;
      color: #32acc1;
      margin-bottom: 10px;
    }

    .report-subtitle {
      font-size: 20px;
      font-weight: 600;
      color: #5a6c7d;
      margin-bottom: 5px;
    }

    .customer-name {
      font-size: 24px;
      font-weight: 700;
      color: #121725;
      margin-top: 15px;
    }

    .report-meta {
      font-size: 14px;
      color: #888;
      margin-top: 10px;
    }

    .section {
      margin-bottom: 40px;
    }

    .section-title {
      font-size: 22px;
      font-weight: 700;
      color: #121725;
      border-right: 6px solid #fc9f67;
      padding-right: 15px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }

    .summary-card {
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      border: 2px solid #e1e8ed;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      transition: all 0.3s ease;
    }

    .summary-card.highlight {
      background: linear-gradient(135deg, #32acc1 0%, #83ddec 100%);
      border-color: #32acc1;
      color: white;
      box-shadow: 0 4px 15px rgba(50, 172, 193, 0.3);
    }

    .summary-card.positive {
      border-color: #22c55e;
      background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
    }

    .summary-card.negative {
      border-color: #ef4444;
      background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
    }

    .summary-label {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 10px;
      color: #5a6c7d;
    }

    .summary-card.highlight .summary-label {
      color: rgba(255,255,255,0.9);
    }

    .summary-value {
      font-size: 28px;
      font-weight: 700;
      color: #121725;
    }

    .summary-card.highlight .summary-value {
      color: white;
    }

    .summary-card.positive .summary-value {
      color: #22c55e;
    }

    .summary-card.negative .summary-value {
      color: #ef4444;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }

    .data-table thead {
      background: linear-gradient(135deg, #32acc1 0%, #5bc0cd 100%);
      color: white;
    }

    .data-table th {
      padding: 15px 12px;
      text-align: right;
      font-weight: 700;
      font-size: 13px;
      border: none;
      white-space: nowrap;
    }

    .data-table td {
      padding: 12px;
      text-align: right;
      border-bottom: 1px solid #e1e8ed;
      font-size: 12px;
    }

    .data-table tbody tr:nth-child(even) {
      background-color: #f8f9fa;
    }

    .data-table tbody tr:hover {
      background-color: #e8f4f8;
    }

    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .profit-positive {
      color: #22c55e;
      font-weight: 600;
    }

    .profit-negative {
      color: #ef4444;
      font-weight: 600;
    }

    .chart-container {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .chart-container svg {
      display: block;
      margin: 0 auto;
      max-width: 100%;
      height: auto;
    }

    .chart-full-width {
      width: 100%;
    }

    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #e1e8ed;
      text-align: center;
      color: #888;
      font-size: 12px;
    }

    .footer-logo {
      font-size: 16px;
      font-weight: 700;
      color: #32acc1;
      margin-bottom: 5px;
    }

    .divider {
      height: 2px;
      background: linear-gradient(to right, transparent, #32acc1, transparent);
      margin: 30px 0;
    }

    .insights-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%);
      border: 2px solid #f59e0b;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
    }

    .insights-title {
      font-size: 16px;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .insights-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .insights-list li {
      padding: 8px 0;
      border-bottom: 1px dashed #fcd34d;
      color: #78350f;
      font-size: 14px;
    }

    .insights-list li:last-child {
      border-bottom: none;
    }

    @media print {
      .print-container {
        padding: 20px;
      }
      .chart-container {
        margin-bottom: 20px;
        page-break-inside: avoid;
        border: 1px solid #e2e8f0;
      }
      .section {
        margin-bottom: 30px;
      }
    }
  `;

  // Calculate insights
  const insights = [];
  if (forecast.summary) {
    const profitMargin = forecast.summary.total_revenue > 0 
      ? ((forecast.summary.net_profit / forecast.summary.total_revenue) * 100).toFixed(1)
      : 0;
    
    if (profitMargin > 20) {
      insights.push(`שולי רווח נקי של ${profitMargin}% - מעל הממוצע בשוק`);
    } else if (profitMargin > 10) {
      insights.push(`שולי רווח נקי של ${profitMargin}% - בטווח הבריא`);
    } else if (profitMargin > 0) {
      insights.push(`שולי רווח נקי של ${profitMargin}% - יש מקום לשיפור`);
    }

    const grossMargin = forecast.summary.total_revenue > 0
      ? ((forecast.summary.gross_profit / forecast.summary.total_revenue) * 100).toFixed(1)
      : 0;
    
    if (grossMargin > 50) {
      insights.push(`רווח גולמי גבוה (${grossMargin}%) - תמחור טוב או עלויות נמוכות`);
    }
  }

  // Best performing month
  if (forecast.profit_loss_monthly && forecast.profit_loss_monthly.length > 0) {
    const bestMonth = forecast.profit_loss_monthly.reduce((best, month) => 
      (month.net_profit || 0) > (best.net_profit || 0) ? month : best
    );
    if (bestMonth.net_profit > 0) {
      insights.push(`החודש הרווחי ביותר: ${monthNames[bestMonth.month - 1]} (${formatCurrency(bestMonth.net_profit)})`);
    }
  }

  return `
    <style>${styles}</style>
    <div class="print-container">
      <!-- Header -->
      <div class="report-header">
        <div class="logo-container">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <circle cx="30" cy="30" r="28" fill="#32acc1" opacity="0.1"/>
            <circle cx="30" cy="30" r="20" fill="#32acc1" opacity="0.2"/>
            <path d="M20 35L27 28L33 34L40 25" stroke="#32acc1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="40" cy="25" r="3" fill="#fc9f67"/>
          </svg>
        </div>
        <div class="report-title">תחזית עסקית ${type === 'manual' ? 'ידנית' : 'אוטומטית'}</div>
        <div class="report-subtitle">${forecast.forecast_name || ''}</div>
        ${customerName ? `<div class="customer-name">${customerName}</div>` : ''}
        <div class="report-meta">
          שנה: ${forecast.forecast_year || new Date().getFullYear()} | 
          תקופה: ${monthNames[(forecast.start_month || 1) - 1]} - ${monthNames[(forecast.end_month || 12) - 1]} | 
          נוצר: ${forecast.created_date ? format(new Date(forecast.created_date), 'dd/MM/yyyy', { locale: he }) : format(new Date(), 'dd/MM/yyyy', { locale: he })}
        </div>
      </div>

      ${exportOptions.includeSummary && forecast.summary ? `
        <div class="section">
          <h2 class="section-title">
            <span>📊</span>
            סיכום פיננסי שנתי
          </h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-label">הכנסות (לא כולל מע״מ)</div>
              <div class="summary-value">${formatCurrency(forecast.summary.total_revenue || 0)}</div>
            </div>
            <div class="summary-card positive">
              <div class="summary-label">רווח גולמי</div>
              <div class="summary-value">${formatCurrency(forecast.summary.gross_profit || 0)}</div>
            </div>
            <div class="summary-card positive">
              <div class="summary-label">רווח תפעולי</div>
              <div class="summary-value">${formatCurrency(forecast.summary.operating_profit || 0)}</div>
            </div>
            <div class="summary-card negative">
              <div class="summary-label">הוצאות מימון</div>
              <div class="summary-value">${formatCurrency(forecast.summary.financing_expenses || 0)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">רווח לפני מס</div>
              <div class="summary-value">${formatCurrency(forecast.summary.profit_before_tax || 0)}</div>
            </div>
            <div class="summary-card highlight">
              <div class="summary-label">רווח נקי (אחרי מס)</div>
              <div class="summary-value">${formatCurrency(forecast.summary.net_profit || 0)}</div>
            </div>
          </div>
          
          ${insights.length > 0 ? `
            <div class="insights-box">
              <div class="insights-title">
                <span>💡</span>
                תובנות מרכזיות
              </div>
              <ul class="insights-list">
                ${insights.map(insight => `<li>• ${insight}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      ` : ''}

      ${(exportOptions.includeRevenueChart || exportOptions.includeProfitChart || exportOptions.includeSummaryPie) && (charts.revenueChart || charts.profitChart || charts.summaryPie) ? `
        <div class="section page-break">
          <h2 class="section-title">
            <span>📈</span>
            ניתוח גרפי
          </h2>
          
          ${exportOptions.includeRevenueChart && charts.revenueChart ? `
            <div class="chart-container chart-full-width avoid-break">
              ${charts.revenueChart}
            </div>
          ` : ''}
          
          ${exportOptions.includeProfitChart && charts.profitChart ? `
            <div class="chart-container chart-full-width avoid-break">
              ${charts.profitChart}
            </div>
          ` : ''}
          
          ${exportOptions.includeSummaryPie && charts.summaryPie ? `
            <div class="chart-container chart-full-width avoid-break">
              ${charts.summaryPie}
            </div>
          ` : ''}
        </div>
      ` : ''}

      ${exportOptions.includeServices && forecast.services && forecast.services.length > 0 ? `
        <div class="section page-break">
          <h2 class="section-title">
            <span>🛒</span>
            שירותים ומוצרים
          </h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>שם השירות/מוצר</th>
                <th>מחיר מכירה</th>
                <th>עלות מכר</th>
                <th>רווח גולמי</th>
                <th>אחוז רווח</th>
              </tr>
            </thead>
            <tbody>
              ${forecast.services.map(service => `
                <tr>
                  <td><strong>${service.service_name}</strong></td>
                  <td>${formatCurrency(service.price || 0, 0, 2)}</td>
                  <td>${formatCurrency(service.calculated?.cost_of_sale || 0, 0, 2)}</td>
                  <td class="${(service.calculated?.gross_profit || 0) >= 0 ? 'profit-positive' : 'profit-negative'}">
                    ${formatCurrency(service.calculated?.gross_profit || 0, 0, 2)}
                  </td>
                  <td class="${(service.calculated?.gross_margin_percentage || 0) >= 0 ? 'profit-positive' : 'profit-negative'}">
                    ${(service.calculated?.gross_margin_percentage || 0).toFixed(1)}%
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${exportOptions.includeMonthlyTable && forecast.profit_loss_monthly && forecast.profit_loss_monthly.length > 0 ? `
        <div class="section page-break">
          <h2 class="section-title">
            <span>📅</span>
            רווח והפסד חודשי (נטו - לא כולל מע״מ)
          </h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>חודש</th>
                <th>הכנסות</th>
                <th>עלות מכר</th>
                <th>רווח גולמי</th>
                <th>הוצאות שכר</th>
                <th>רווח תפעולי</th>
                <th>הוצאות מימון</th>
                <th>רווח נקי</th>
              </tr>
            </thead>
            <tbody>
              ${forecast.profit_loss_monthly.map(month => `
                <tr>
                  <td><strong>${monthNames[month.month - 1]}</strong></td>
                  <td>${formatCurrency(month.revenue || 0)}</td>
                  <td class="profit-negative">${formatCurrency(month.cost_of_sale || 0)}</td>
                  <td class="profit-positive">${formatCurrency(month.gross_profit || 0)}</td>
                  <td>${formatCurrency(month.salary_expenses || 0)}</td>
                  <td class="profit-positive">${formatCurrency(month.operating_profit || 0)}</td>
                  <td class="profit-negative">${formatCurrency(month.financing_expenses || 0)}</td>
                  <td class="${(month.net_profit || 0) >= 0 ? 'profit-positive' : 'profit-negative'}">
                    <strong>${formatCurrency(month.net_profit || 0)}</strong>
                  </td>
                </tr>
              `).join('')}
              <tr style="background: linear-gradient(135deg, #f8f9fa 0%, #e8f4f8 100%); font-weight: bold;">
                <td><strong>סה״כ שנתי</strong></td>
                <td>${formatCurrency(forecast.summary?.total_revenue || 0)}</td>
                <td class="profit-negative">${formatCurrency((forecast.summary?.total_revenue || 0) - (forecast.summary?.gross_profit || 0))}</td>
                <td class="profit-positive">${formatCurrency(forecast.summary?.gross_profit || 0)}</td>
                <td>-</td>
                <td class="profit-positive">${formatCurrency(forecast.summary?.operating_profit || 0)}</td>
                <td class="profit-negative">${formatCurrency(forecast.summary?.financing_expenses || 0)}</td>
                <td class="${(forecast.summary?.net_profit || 0) >= 0 ? 'profit-positive' : 'profit-negative'}">
                  <strong>${formatCurrency(forecast.summary?.net_profit || 0)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ` : ''}

      <div class="footer">
        <div class="footer-logo">Plusto</div>
        <p>דוח זה נוצר באמצעות מערכת Plusto</p>
        <p>תאריך הפקה: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
      </div>
    </div>
  `;
}
