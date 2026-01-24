import React from 'react';
import { formatCurrency } from '../forecast/manual/utils/numberFormatter';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function PrintableForecastReport({ forecast, type }) {
  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const getMonthsToDisplay = () => {
    if (!forecast.start_month || !forecast.end_month) return monthNames;
    return monthNames.slice(forecast.start_month - 1, forecast.end_month);
  };

  const displayMonths = getMonthsToDisplay();

  return (
    <div className="print-container" dir="rtl">
      <style>{`
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

        .monthly-breakdown {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }

        .month-card {
          background: white;
          border: 2px solid #e1e8ed;
          border-radius: 8px;
          padding: 15px;
        }

        .month-name {
          font-size: 14px;
          font-weight: 700;
          color: #32acc1;
          margin-bottom: 10px;
          text-align: center;
        }

        .month-value {
          font-size: 16px;
          font-weight: 600;
          text-align: center;
        }
      `}</style>

      {/* Header */}
      <div className="report-header">
        <div className="report-title">תחזית עסקית {type === 'manual' ? 'ידנית' : 'אוטומטית'}</div>
        <div className="report-subtitle">{forecast.forecast_name}</div>
        <div className="report-meta">
          שנה: {forecast.forecast_year} | 
          תקופה: חודש {forecast.start_month} - {forecast.end_month} | 
          נוצר: {format(new Date(forecast.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
        </div>
      </div>

      {/* סיכום פיננסי */}
      {forecast.summary && (
        <div className="section">
          <h2 className="section-title">סיכום פיננסי שנתי</h2>
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-label">הכנסות (לא כולל מע״מ)</div>
              <div className="summary-value">{formatCurrency(forecast.summary.total_revenue || 0)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">רווח גולמי</div>
              <div className="summary-value profit-positive">{formatCurrency(forecast.summary.gross_profit || 0)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">רווח תפעולי</div>
              <div className="summary-value profit-positive">{formatCurrency(forecast.summary.operating_profit || 0)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">הוצאות מימון</div>
              <div className="summary-value profit-negative">{formatCurrency(forecast.summary.financing_expenses || 0)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">רווח לפני מס</div>
              <div className="summary-value">{formatCurrency(forecast.summary.profit_before_tax || 0)}</div>
            </div>
            <div className="summary-card highlight">
              <div className="summary-label">רווח נקי (אחרי מס)</div>
              <div className="summary-value">{formatCurrency(forecast.summary.net_profit || 0)}</div>
            </div>
          </div>
        </div>
      )}

      {/* שירותים ומוצרים */}
      {forecast.services && forecast.services.length > 0 && (
        <div className="section page-break">
          <h2 className="section-title">שירותים ומוצרים</h2>
          <table className="data-table">
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
              {forecast.services.map((service, idx) => (
                <tr key={idx}>
                  <td>{service.service_name}</td>
                  <td>{formatCurrency(service.price || 0)}</td>
                  <td>{formatCurrency(service.calculated?.cost_of_sale || 0)}</td>
                  <td className={service.calculated?.gross_profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                    {formatCurrency(service.calculated?.gross_profit || 0)}
                  </td>
                  <td className={service.calculated?.gross_margin_percentage >= 0 ? 'profit-positive' : 'profit-negative'}>
                    {(service.calculated?.gross_margin_percentage || 0).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* עובדים */}
      {forecast.employees && forecast.employees.length > 0 && (
        <div className="section">
          <h2 className="section-title">עובדים ושכר</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>שם העובד</th>
                <th>תפקיד</th>
                <th>שכר ברוטו חודשי</th>
                <th>עלות מעביד חודשית</th>
              </tr>
            </thead>
            <tbody>
              {forecast.employees.map((emp, idx) => (
                <tr key={idx}>
                  <td>{emp.name}</td>
                  <td>{emp.role}</td>
                  <td>{formatCurrency(emp.gross_salary || 0)}</td>
                  <td>{formatCurrency(emp.total_cost || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* הלוואות */}
      {forecast.financing_loans && forecast.financing_loans.length > 0 && (
        <div className="section page-break">
          <h2 className="section-title">הלוואות ומימון</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>שם ההלוואה</th>
                <th>קרן</th>
                <th>ריבית שנתית</th>
                <th>תקופה (חודשים)</th>
                <th>תשלום חודשי</th>
              </tr>
            </thead>
            <tbody>
              {forecast.financing_loans.map((loan, idx) => (
                <tr key={idx}>
                  <td>{loan.loan_name}</td>
                  <td>{formatCurrency(loan.principal_amount || 0)}</td>
                  <td>{(loan.annual_interest_rate_percent || 0).toFixed(2)}%</td>
                  <td>{loan.term_months || 0}</td>
                  <td>{formatCurrency(loan.monthly_payment || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* רווח והפסד חודשי */}
      {forecast.profit_loss_monthly && forecast.profit_loss_monthly.length > 0 && (
        <div className="section page-break">
          <h2 className="section-title">רווח והפסד חודשי (נטו - לא כולל מע״מ)</h2>
          <table className="data-table" style={{ fontSize: '11px' }}>
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
              {forecast.profit_loss_monthly.map((month, idx) => (
                <tr key={idx}>
                  <td><strong>{monthNames[month.month - 1]}</strong></td>
                  <td>{formatCurrency(month.revenue || 0)}</td>
                  <td className="profit-positive">{formatCurrency(month.gross_profit || 0)}</td>
                  <td className="profit-positive">{formatCurrency(month.operating_profit || 0)}</td>
                  <td className="profit-negative">{formatCurrency(month.financing_expenses || 0)}</td>
                  <td>{formatCurrency(month.profit_before_tax || 0)}</td>
                  <td className="profit-positive"><strong>{formatCurrency(month.net_profit || 0)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="footer">
        <p>דוח זה נוצר באמצעות מערכת Plusto</p>
        <p>תאריך הפקה: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
      </div>
    </div>
  );
}