import { formatCurrency } from '../forecast/manual/utils/numberFormatter';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export function generateForecastHTML(forecast, type) {
  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const getMonthsToDisplay = () => {
    if (!forecast.start_month || !forecast.end_month) return monthNames;
    return monthNames.slice(forecast.start_month - 1, forecast.end_month);
  };

  const displayMonths = getMonthsToDisplay();

  const styles = `
    @media print {
      body { margin: 0; padding: 0; }
      .print-container { width: 100%; }
      .no-print { display: none !important; }
      .page-break { page-break-after: always; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }

    .print-container {
      font-family: 'Arial', 'Calibri', sans-serif;
      padding: 40px;
      background: white;
      color: #1a1a1a;
      max-width: 1200px;
      margin: 0 auto;
    }

    .report-header {
      text-align: center;
      border-bottom: 4px solid #32acc1;
      padding-bottom: 30px;
      margin-bottom: 40px;
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

    .report-meta {
      font-size: 14px;
      color: #888;
      margin-top: 10px;
    }

    .section {
      margin-bottom: 40px;
    }

    .section-title {
      font-size: 24px;
      font-weight: 700;
      color: #121725;
      border-right: 6px solid #fc9f67;
      padding-right: 15px;
      margin-bottom: 20px;
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
    }

    .summary-card.highlight {
      background: linear-gradient(135deg, #32acc1 0%, #83ddec 100%);
      border-color: #32acc1;
      color: white;
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

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .data-table thead {
      background: linear-gradient(135deg, #32acc1 0%, #83ddec 100%);
      color: white;
    }

    .data-table th {
      padding: 15px;
      text-align: right;
      font-weight: 700;
      font-size: 14px;
      border: 1px solid #32acc1;
    }

    .data-table td {
      padding: 12px 15px;
      text-align: right;
      border: 1px solid #e1e8ed;
      font-size: 13px;
    }

    .data-table tbody tr:nth-child(even) {
      background-color: #f8f9fa;
    }

    .data-table tbody tr:hover {
      background-color: #e8f4f8;
    }

    .profit-positive {
      color: #38A169;
      font-weight: 600;
    }

    .profit-negative {
      color: #E53E3E;
      font-weight: 600;
    }

    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #e1e8ed;
      text-align: center;
      color: #888;
      font-size: 12px;
    }
  `;

  return `
    <style>${styles}</style>
    <div class="print-container" dir="rtl">
      <!-- Header -->
      <div class="report-header">
        <div class="report-title">תחזית עסקית ${type === 'manual' ? 'ידנית' : 'אוטומטית'}</div>
        <div class="report-subtitle">${forecast.forecast_name || ''}</div>
        <div class="report-meta">
          שנה: ${forecast.forecast_year} | 
          תקופה: חודש ${forecast.start_month} - ${forecast.end_month} | 
          נוצר: ${format(new Date(forecast.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
        </div>
      </div>

      ${forecast.summary ? `
        <div class="section">
          <h2 class="section-title">סיכום פיננסי שנתי</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-label">הכנסות (לא כולל מע״מ)</div>
              <div class="summary-value">${formatCurrency(forecast.summary.total_revenue || 0)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">רווח גולמי</div>
              <div class="summary-value profit-positive">${formatCurrency(forecast.summary.gross_profit || 0)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">רווח תפעולי</div>
              <div class="summary-value profit-positive">${formatCurrency(forecast.summary.operating_profit || 0)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">הוצאות מימון</div>
              <div class="summary-value profit-negative">${formatCurrency(forecast.summary.financing_expenses || 0)}</div>
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
        </div>
      ` : ''}

      ${forecast.services && forecast.services.length > 0 ? `
        <div class="section page-break">
          <h2 class="section-title">שירותים ומוצרים</h2>
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
                  <td>${service.service_name}</td>
                  <td>${formatCurrency(service.price || 0, 0, 2)}</td>
                  <td>${formatCurrency(service.calculated?.cost_of_sale || 0, 0, 2)}</td>
                  <td class="${service.calculated?.gross_profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                    ${formatCurrency(service.calculated?.gross_profit || 0, 0, 2)}
                  </td>
                  <td class="${service.calculated?.gross_margin_percentage >= 0 ? 'profit-positive' : 'profit-negative'}">
                    ${(service.calculated?.gross_margin_percentage || 0).toFixed(1)}%
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${forecast.profit_loss_monthly && forecast.profit_loss_monthly.length > 0 ? `
        <div class="section page-break">
          <h2 class="section-title">רווח והפסד חודשי (נטו - לא כולל מע״מ)</h2>
          <table class="data-table" style="font-size: 11px;">
            <thead>
              <tr>
                <th>חודש</th>
                <th>הכנסות</th>
                <th>רווח גולמי</th>
                <th>רווח תפעולי</th>
                <th>הוצאות מימון</th>
                <th>רווח לפני מס</th>
                <th>רווח נקי</th>
              </tr>
            </thead>
            <tbody>
              ${forecast.profit_loss_monthly.map(month => `
                <tr>
                  <td><strong>${monthNames[month.month - 1]}</strong></td>
                  <td>${formatCurrency(month.revenue || 0)}</td>
                  <td class="profit-positive">${formatCurrency(month.gross_profit || 0)}</td>
                  <td class="profit-positive">${formatCurrency(month.operating_profit || 0)}</td>
                  <td class="profit-negative">${formatCurrency(month.financing_expenses || 0)}</td>
                  <td>${formatCurrency(month.profit_before_tax || 0)}</td>
                  <td class="profit-positive"><strong>${formatCurrency(month.net_profit || 0)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <div class="footer">
        <p>דוח זה נוצר באמצעות מערכת ProfitBooster - Horizon Group</p>
        <p>תאריך הפקה: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
      </div>
    </div>
  `;
}