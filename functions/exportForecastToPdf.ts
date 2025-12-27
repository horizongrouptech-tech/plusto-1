import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import PdfPrinter from 'npm:pdfmake@0.2.10';

// Helper functions
const formatCurrency = (num) => {
  if (!num && num !== 0) return '0 ₪';
  return `${Math.round(num).toLocaleString('he-IL')} ₪`;
};

const formatPercent = (num) => {
  if (!num && num !== 0) return '0%';
  return `${Math.round(num)}%`;
};

const calculateVariance = (planned, actual) => {
  if (!planned || planned === 0) return 0;
  return ((actual - planned) / planned) * 100;
};

const getTopProducts = (services, sortBy = 'profit', limit = 10) => {
  if (!services || services.length === 0) return [];
  
  let sorted = [...services];
  
  if (sortBy === 'profit') {
    sorted = sorted.sort((a, b) => 
      (b.calculated?.gross_margin_percentage || 0) - (a.calculated?.gross_margin_percentage || 0)
    );
  } else if (sortBy === 'quantity') {
    sorted = sorted.sort((a, b) => {
      const sumA = (a.actual_monthly_quantities || []).reduce((sum, q) => sum + (q || 0), 0);
      const sumB = (b.actual_monthly_quantities || []).reduce((sum, q) => sum + (q || 0), 0);
      return sumB - sumA;
    });
  } else if (sortBy === 'revenue') {
    sorted = sorted.sort((a, b) => {
      const sumA = (a.actual_monthly_revenue || []).reduce((sum, r) => sum + (r || 0), 0);
      const sumB = (b.actual_monthly_revenue || []).reduce((sum, r) => sum + (r || 0), 0);
      return sumB - sumA;
    });
  }
  
  return sorted.slice(0, limit);
};

const createSimpleBarChart = (data, width = 400, height = 200) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = (width - 60) / data.length;
  
  let bars = '';
  data.forEach((item, index) => {
    const barHeight = (item.value / maxValue) * (height - 40);
    const x = 40 + index * barWidth;
    const y = height - barHeight - 20;
    
    bars += `<rect x="${x}" y="${y}" width="${barWidth - 10}" height="${barHeight}" fill="#32acc1" opacity="0.8"/>`;
    bars += `<text x="${x + (barWidth - 10) / 2}" y="${height - 5}" text-anchor="middle" font-size="10" fill="#333">${item.label}</text>`;
  });
  
  return {
    svg: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="white"/>
      ${bars}
    </svg>`,
    width,
    height
  };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { forecast_id, forecast_type } = await req.json();

    if (!forecast_id || !forecast_type) {
      return Response.json({ error: 'Missing forecast_id or forecast_type' }, { status: 400 });
    }

    let docDefinition;

    if (forecast_type === 'manual') {
      const forecast = await base44.entities.ManualForecast.get(forecast_id);
      
      const content = [
        {
          text: 'תחזית עסקית',
          style: 'header',
          alignment: 'center',
          margin: [0, 20, 0, 10]
        },
        {
          text: forecast.forecast_name || 'תחזית ללא שם',
          style: 'subheader',
          alignment: 'center',
          margin: [0, 0, 0, 5]
        },
        {
          text: `שנה: ${forecast.forecast_year} | חודשים: ${forecast.start_month}-${forecast.end_month}`,
          alignment: 'center',
          margin: [0, 0, 0, 10],
          color: '#5a6c7d'
        },
        {
          text: `נוצר ב-${new Date().toLocaleDateString('he-IL')}`,
          alignment: 'center',
          fontSize: 9,
          color: '#999',
          margin: [0, 0, 0, 20]
        }
      ];

      // Financial Summary
      if (forecast.summary) {
        content.push({
          text: 'סיכום פיננסי',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10],
          color: '#32acc1'
        });

        const grossMargin = forecast.summary.total_revenue ? 
          ((forecast.summary.gross_profit / forecast.summary.total_revenue) * 100) : 0;
        const netMargin = forecast.summary.total_revenue ? 
          ((forecast.summary.net_profit / forecast.summary.total_revenue) * 100) : 0;

        const summaryData = [
          [
            { text: 'סה"כ הכנסות (לא כולל מע"מ)', bold: true, fillColor: '#f8f9fa' },
            { text: formatCurrency(forecast.summary.total_revenue || 0), alignment: 'left', bold: true }
          ],
          [
            { text: 'רווח גולמי', fillColor: '#f8f9fa' },
            { text: formatCurrency(forecast.summary.gross_profit || 0), alignment: 'left', color: '#38A169' }
          ],
          [
            { text: 'אחוז רווח גולמי', fillColor: '#f8f9fa' },
            { text: formatPercent(grossMargin), alignment: 'left', color: '#38A169' }
          ],
          [
            { text: 'רווח תפעולי', fillColor: '#f8f9fa' },
            { text: formatCurrency(forecast.summary.operating_profit || 0), alignment: 'left' }
          ],
          [
            { text: 'הוצאות מימון', fillColor: '#f8f9fa' },
            { text: formatCurrency(forecast.summary.financing_expenses || 0), alignment: 'left', color: '#E53E3E' }
          ],
          [
            { text: 'רווח לפני מס', fillColor: '#f8f9fa' },
            { text: formatCurrency(forecast.summary.profit_before_tax || 0), alignment: 'left', color: '#9333EA' }
          ],
          [
            { text: 'מס', fillColor: '#f8f9fa' },
            { text: formatCurrency((forecast.summary.profit_before_tax || 0) - (forecast.summary.net_profit || 0)), alignment: 'left', color: '#E53E3E' }
          ],
          [
            { text: 'רווח נקי (אחרי מס)', bold: true, fillColor: '#e8f5e9' },
            { text: formatCurrency(forecast.summary.net_profit || 0), alignment: 'left', bold: true, color: '#38A169', fontSize: 12 }
          ],
          [
            { text: 'אחוז רווח נקי', bold: true, fillColor: '#e8f5e9' },
            { text: formatPercent(netMargin), alignment: 'left', bold: true, color: '#38A169', fontSize: 12 }
          ]
        ];

        content.push({
          table: {
            headerRows: 0,
            widths: ['*', 150],
            body: summaryData
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#e1e8ed',
            vLineColor: () => '#e1e8ed',
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 6,
            paddingBottom: () => 6
          },
          margin: [0, 0, 0, 20]
        });
      }

      // Top Profitable Products
      if (forecast.services && forecast.services.length > 0) {
        const topProfitable = getTopProducts(forecast.services, 'profit', 10);
        
        if (topProfitable.length > 0) {
          content.push({
            text: '10 המוצרים הרווחיים ביותר',
            style: 'sectionHeader',
            margin: [0, 20, 0, 10],
            color: '#38A169',
            pageBreak: 'before'
          });

          const profitableData = [
            [
              { text: 'מוצר', bold: true, fillColor: '#32acc1', color: 'white' },
              { text: 'מחיר', bold: true, fillColor: '#32acc1', color: 'white', alignment: 'left' },
              { text: 'עלות', bold: true, fillColor: '#32acc1', color: 'white', alignment: 'left' },
              { text: 'רווח ליח\'', bold: true, fillColor: '#32acc1', color: 'white', alignment: 'left' },
              { text: '% רווח', bold: true, fillColor: '#32acc1', color: 'white', alignment: 'left' }
            ],
            ...topProfitable.map((s, idx) => {
              const profit = (s.price || 0) - (s.calculated?.cost_of_sale || 0);
              const bgColor = idx % 2 === 0 ? '#f8f9fa' : 'white';
              return [
                { text: s.service_name, fillColor: bgColor },
                { text: formatCurrency(s.price || 0), alignment: 'left', fillColor: bgColor },
                { text: formatCurrency(s.calculated?.cost_of_sale || 0), alignment: 'left', fillColor: bgColor },
                { text: formatCurrency(profit), alignment: 'left', fillColor: bgColor, color: '#38A169', bold: true },
                { text: formatPercent(s.calculated?.gross_margin_percentage || 0), alignment: 'left', fillColor: bgColor, color: '#38A169', bold: true }
              ];
            })
          ];

          content.push({
            table: {
              headerRows: 1,
              widths: ['*', 70, 70, 70, 60],
              body: profitableData
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#e1e8ed',
              vLineColor: () => '#e1e8ed'
            },
            margin: [0, 0, 0, 20]
          });
        }

        // Top Selling Products
        const topSelling = getTopProducts(forecast.services, 'quantity', 10);
        
        if (topSelling.length > 0) {
          content.push({
            text: '10 המוצרים הנמכרים ביותר',
            style: 'sectionHeader',
            margin: [0, 20, 0, 10],
            color: '#fc9f67'
          });

          const sellingData = [
            [
              { text: 'מוצר', bold: true, fillColor: '#fc9f67', color: 'white' },
              { text: 'כמות נמכרה', bold: true, fillColor: '#fc9f67', color: 'white', alignment: 'left' },
              { text: 'מחזור ממשי', bold: true, fillColor: '#fc9f67', color: 'white', alignment: 'left' },
              { text: 'מחיר ממוצע', bold: true, fillColor: '#fc9f67', color: 'white', alignment: 'left' }
            ],
            ...topSelling.map((s, idx) => {
              const totalQty = (s.actual_monthly_quantities || []).reduce((sum, q) => sum + (q || 0), 0);
              const totalRev = (s.actual_monthly_revenue || []).reduce((sum, r) => sum + (r || 0), 0);
              const avgPrice = totalQty > 0 ? totalRev / totalQty : 0;
              const bgColor = idx % 2 === 0 ? '#f8f9fa' : 'white';
              
              return [
                { text: s.service_name, fillColor: bgColor },
                { text: totalQty.toLocaleString('he-IL'), alignment: 'left', fillColor: bgColor, bold: true },
                { text: formatCurrency(totalRev), alignment: 'left', fillColor: bgColor, color: '#fc9f67' },
                { text: formatCurrency(avgPrice), alignment: 'left', fillColor: bgColor }
              ];
            })
          ];

          content.push({
            table: {
              headerRows: 1,
              widths: ['*', 80, 90, 80],
              body: sellingData
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#e1e8ed',
              vLineColor: () => '#e1e8ed'
            },
            margin: [0, 0, 0, 20]
          });
        }

        // All Services Table
        content.push({
          text: 'כל המוצרים והשירותים',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10],
          pageBreak: 'before'
        });

        const servicesData = [
          [
            { text: 'שם מוצר/שירות', bold: true, fillColor: '#5a6c7d', color: 'white' },
            { text: 'מחיר', bold: true, fillColor: '#5a6c7d', color: 'white', alignment: 'left' },
            { text: 'עלות', bold: true, fillColor: '#5a6c7d', color: 'white', alignment: 'left' },
            { text: '% רווח', bold: true, fillColor: '#5a6c7d', color: 'white', alignment: 'left' }
          ],
          ...forecast.services.map((s, idx) => {
            const bgColor = idx % 2 === 0 ? '#f8f9fa' : 'white';
            return [
              { text: s.service_name, fillColor: bgColor },
              { text: formatCurrency(s.price || 0), alignment: 'left', fillColor: bgColor },
              { text: formatCurrency(s.calculated?.cost_of_sale || 0), alignment: 'left', fillColor: bgColor },
              { text: formatPercent(s.calculated?.gross_margin_percentage || 0), alignment: 'left', fillColor: bgColor }
            ];
          })
        ];

        content.push({
          table: {
            headerRows: 1,
            widths: ['*', 80, 80, 60],
            body: servicesData
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#e1e8ed',
            vLineColor: () => '#e1e8ed'
          },
          margin: [0, 0, 0, 20]
        });
      }

      // Plan vs Actual Comparison
      if (forecast.services && forecast.services.length > 0) {
        content.push({
          text: 'השוואה: תכנון לעומת ביצוע',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10],
          color: '#9333EA',
          pageBreak: 'before'
        });

        const comparisonData = [
          [
            { text: 'מוצר', bold: true, fillColor: '#9333EA', color: 'white' },
            { text: 'תכנון שנתי', bold: true, fillColor: '#9333EA', color: 'white', alignment: 'left' },
            { text: 'ביצוע בפועל', bold: true, fillColor: '#9333EA', color: 'white', alignment: 'left' },
            { text: 'סטייה %', bold: true, fillColor: '#9333EA', color: 'white', alignment: 'left' },
            { text: 'סטטוס', bold: true, fillColor: '#9333EA', color: 'white', alignment: 'center' }
          ]
        ];

        forecast.services.forEach((s, idx) => {
          const plannedQty = (s.planned_monthly_quantities || []).reduce((sum, q) => sum + (q || 0), 0);
          const actualQty = (s.actual_monthly_quantities || []).reduce((sum, q) => sum + (q || 0), 0);
          const variance = calculateVariance(plannedQty, actualQty);
          
          if (plannedQty > 0 || actualQty > 0) {
            const bgColor = idx % 2 === 0 ? '#f8f9fa' : 'white';
            let statusText = '●';
            let statusColor = '#999';
            
            if (Math.abs(variance) < 10) {
              statusText = '● בתכנון';
              statusColor = '#38A169';
            } else if (variance > 0) {
              statusText = '● מעל יעד';
              statusColor = '#32acc1';
            } else {
              statusText = '● מתחת ליעד';
              statusColor = '#E53E3E';
            }

            comparisonData.push([
              { text: s.service_name, fillColor: bgColor },
              { text: plannedQty.toLocaleString('he-IL'), alignment: 'left', fillColor: bgColor },
              { text: actualQty.toLocaleString('he-IL'), alignment: 'left', fillColor: bgColor, bold: true },
              { text: formatPercent(variance), alignment: 'left', fillColor: bgColor, color: variance > 0 ? '#32acc1' : '#E53E3E' },
              { text: statusText, alignment: 'center', fillColor: bgColor, color: statusColor, fontSize: 9 }
            ]);
          }
        });

        if (comparisonData.length > 1) {
          content.push({
            table: {
              headerRows: 1,
              widths: ['*', 80, 80, 60, 80],
              body: comparisonData
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#e1e8ed',
              vLineColor: () => '#e1e8ed'
            },
            margin: [0, 0, 0, 20]
          });
        }
      }

      // Loans
      if (forecast.financing_loans && forecast.financing_loans.length > 0) {
        content.push({
          text: 'הלוואות ומימון',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10],
          pageBreak: 'before'
        });

        const loansData = [
          [
            { text: 'שם ההלוואה', bold: true, fillColor: '#5a6c7d', color: 'white' },
            { text: 'קרן', bold: true, fillColor: '#5a6c7d', color: 'white', alignment: 'left' },
            { text: 'ריבית %', bold: true, fillColor: '#5a6c7d', color: 'white', alignment: 'left' },
            { text: 'תקופה (חודשים)', bold: true, fillColor: '#5a6c7d', color: 'white', alignment: 'left' },
            { text: 'תשלום חודשי', bold: true, fillColor: '#5a6c7d', color: 'white', alignment: 'left' }
          ],
          ...forecast.financing_loans.map((l, idx) => {
            const bgColor = idx % 2 === 0 ? '#f8f9fa' : 'white';
            return [
              { text: l.loan_name, fillColor: bgColor },
              { text: formatCurrency(l.principal_amount || 0), alignment: 'left', fillColor: bgColor },
              { text: `${l.annual_interest_rate_percent || 0}%`, alignment: 'left', fillColor: bgColor },
              { text: String(l.term_months || 0), alignment: 'left', fillColor: bgColor },
              { text: formatCurrency(l.monthly_payment || 0), alignment: 'left', fillColor: bgColor, color: '#E53E3E', bold: true }
            ];
          })
        ];

        content.push({
          table: {
            headerRows: 1,
            widths: ['*', 80, 60, 80, 90],
            body: loansData
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#e1e8ed',
            vLineColor: () => '#e1e8ed'
          },
          margin: [0, 0, 0, 20]
        });
      }

      // Monthly P&L
      if (forecast.profit_loss_monthly && forecast.profit_loss_monthly.length > 0) {
        content.push({
          text: 'רווח והפסד חודשי (נטו - לא כולל מע"מ)',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10],
          pageBreak: 'before'
        });

        const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
        
        const plData = [
          [
            { text: 'חודש', bold: true, fontSize: 9, fillColor: '#5a6c7d', color: 'white' },
            { text: 'הכנסות', bold: true, fontSize: 9, fillColor: '#5a6c7d', color: 'white', alignment: 'left' },
            { text: 'רווח גולמי', bold: true, fontSize: 9, fillColor: '#5a6c7d', color: 'white', alignment: 'left' },
            { text: 'רווח תפעולי', bold: true, fontSize: 9, fillColor: '#5a6c7d', color: 'white', alignment: 'left' },
            { text: 'מימון', bold: true, fontSize: 9, fillColor: '#5a6c7d', color: 'white', alignment: 'left' },
            { text: 'לפני מס', bold: true, fontSize: 9, fillColor: '#5a6c7d', color: 'white', alignment: 'left' },
            { text: 'רווח נקי', bold: true, fontSize: 9, fillColor: '#5a6c7d', color: 'white', alignment: 'left' }
          ],
          ...forecast.profit_loss_monthly.map((m, idx) => {
            const bgColor = idx % 2 === 0 ? '#f8f9fa' : 'white';
            return [
              { text: monthNames[m.month - 1] || `חודש ${m.month}`, fontSize: 9, fillColor: bgColor },
              { text: formatCurrency(m.revenue || 0), fontSize: 9, alignment: 'left', fillColor: bgColor },
              { text: formatCurrency(m.gross_profit || 0), fontSize: 9, alignment: 'left', fillColor: bgColor, color: '#38A169' },
              { text: formatCurrency(m.operating_profit || 0), fontSize: 9, alignment: 'left', fillColor: bgColor },
              { text: formatCurrency(m.financing_expenses || 0), fontSize: 9, alignment: 'left', fillColor: bgColor, color: '#E53E3E' },
              { text: formatCurrency(m.profit_before_tax || 0), fontSize: 9, alignment: 'left', fillColor: bgColor, color: '#9333EA' },
              { text: formatCurrency(m.net_profit || 0), fontSize: 9, alignment: 'left', fillColor: bgColor, bold: true, color: m.net_profit > 0 ? '#38A169' : '#E53E3E' }
            ];
          })
        ];

        content.push({
          table: {
            headerRows: 1,
            widths: ['auto', '*', '*', '*', '*', '*', '*'],
            body: plData
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#e1e8ed',
            vLineColor: () => '#e1e8ed'
          }
        });
      }

      docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        content: content,
        styles: {
          header: {
            fontSize: 24,
            bold: true,
            color: '#32acc1'
          },
          subheader: {
            fontSize: 18,
            bold: true,
            color: '#5a6c7d'
          },
          sectionHeader: {
            fontSize: 15,
            bold: true,
            color: '#32acc1'
          }
        },
        defaultStyle: {
          fontSize: 10,
          font: 'Roboto'
        },
        pageMargins: [40, 60, 40, 60],
        header: (currentPage, pageCount) => {
          return {
            columns: [
              { 
                text: 'Horizon ProfitBooster', 
                alignment: 'left', 
                fontSize: 10, 
                color: '#32acc1',
                bold: true,
                margin: [40, 20, 0, 0]
              },
              { 
                text: `עמוד ${currentPage} מתוך ${pageCount}`, 
                alignment: 'left', 
                fontSize: 9, 
                color: '#999',
                margin: [0, 20, 40, 0]
              }
            ]
          };
        },
        footer: (currentPage, pageCount) => {
          return {
            text: `נוצר על ידי מערכת Horizon | ${new Date().toLocaleDateString('he-IL')}`,
            alignment: 'center',
            fontSize: 8,
            color: '#999',
            margin: [0, 10, 0, 0]
          };
        }
      };

    } else {
      // forecast_type === 'goals'
      const customerEmail = req.headers.get('x-customer-email');
      const goalsData = await base44.entities.CustomerGoal.filter(
        { customer_email: customerEmail, is_active: true },
        'order_index'
      );

      const topLevelGoals = goalsData.filter(g => !g.parent_id).sort((a, b) => a.order_index - b.order_index);
      const subtasksByGoal = goalsData.reduce((acc, goal) => {
        if (goal.parent_id) {
          if (!acc[goal.parent_id]) acc[goal.parent_id] = [];
          acc[goal.parent_id].push(goal);
        }
        return acc;
      }, {});

      const statusText = {
        'open': 'Open',
        'in_progress': 'In Progress',
        'done': 'Done',
        'delayed': 'Delayed',
        'cancelled': 'Cancelled'
      };

      const content = [
        {
          text: 'Business Goals Gantt',
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 10]
        },
        {
          text: `Customer: ${customerEmail}`,
          alignment: 'center',
          margin: [0, 0, 0, 30]
        }
      ];

      topLevelGoals.forEach((goal, index) => {
        content.push({
          text: `${index + 1}. ${goal.name}`,
          style: 'goalHeader',
          margin: [0, 15, 0, 10]
        });

        const goalDetails = [];
        
        if (goal.description) {
          goalDetails.push({ text: `Description: ${goal.description}`, margin: [0, 5, 0, 5] });
        }
        
        goalDetails.push({ text: `Status: ${statusText[goal.status] || goal.status}`, margin: [0, 5, 0, 5] });
        
        if (goal.target_date) {
          goalDetails.push({ 
            text: `Target Date: ${new Date(goal.target_date).toLocaleDateString('en-US')}`,
            margin: [0, 5, 0, 5]
          });
        }
        
        if (goal.assigned_to) {
          goalDetails.push({ text: `Assigned To: ${goal.assigned_to}`, margin: [0, 5, 0, 5] });
        }
        
        if (goal.completion_percentage !== undefined) {
          goalDetails.push({ 
            text: `Progress: ${goal.completion_percentage}%`,
            margin: [0, 5, 0, 5]
          });
        }

        content.push(...goalDetails);

        // Subtasks
        const subtasks = (subtasksByGoal[goal.id] || []).sort((a, b) => a.order_index - b.order_index);
        if (subtasks.length > 0) {
          content.push({
            text: 'Subtasks:',
            bold: true,
            margin: [0, 10, 0, 5]
          });

          const subtasksList = subtasks.map((st, idx) => ({
            text: `${idx + 1}. ${st.name} - ${statusText[st.status] || st.status}`,
            margin: [10, 3, 0, 3]
          }));

          content.push(...subtasksList);
        }
      });

      // Statistics
      const totalGoals = topLevelGoals.length;
      const doneGoals = topLevelGoals.filter(g => g.status === 'done').length;
      const inProgressGoals = topLevelGoals.filter(g => g.status === 'in_progress').length;
      const delayedGoals = topLevelGoals.filter(g => g.status === 'delayed').length;

      content.push({
        text: 'Summary Statistics',
        style: 'sectionHeader',
        margin: [0, 30, 0, 10],
        pageBreak: 'before'
      });

      const statsData = [
        ['Total Goals', String(totalGoals)],
        ['Completed Goals', String(doneGoals)],
        ['Goals In Progress', String(inProgressGoals)],
        ['Delayed Goals', String(delayedGoals)]
      ];

      content.push({
        table: {
          headerRows: 0,
          widths: ['*', 'auto'],
          body: statsData
        },
        layout: 'lightHorizontalLines'
      });

      docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        content: content,
        styles: {
          header: {
            fontSize: 22,
            bold: true
          },
          goalHeader: {
            fontSize: 14,
            bold: true
          },
          sectionHeader: {
            fontSize: 14,
            bold: true
          }
        },
        defaultStyle: {
          fontSize: 10
        }
      };
    }

    // Create PDF using built-in fonts
    const printer = new PdfPrinter({
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    });
    
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    
    const chunks = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      pdfDoc.on('end', resolve);
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });

    const pdfBytes = new Uint8Array(chunks.reduce((acc, chunk) => {
      const tmp = new Uint8Array(acc.length + chunk.length);
      tmp.set(acc, 0);
      tmp.set(chunk, acc.length);
      return tmp;
    }, new Uint8Array(0)));

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${forecast_type}_forecast_${forecast_id}.pdf"`
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});