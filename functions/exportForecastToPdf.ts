
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import PdfPrinter from 'npm:pdfmake@0.2.10';

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

    const formatCurrency = (num) => {
      return `${Math.round(num).toLocaleString('en-US')} ILS`;
    };

    let docDefinition;

    if (forecast_type === 'manual') {
      const forecast = await base44.entities.ManualForecast.get(forecast_id);
      
      const content = [
        {
          text: 'Manual Business Forecast',
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 10]
        },
        {
          text: forecast.forecast_name,
          style: 'subheader',
          alignment: 'center',
          margin: [0, 0, 0, 5]
        },
        {
          text: `Year: ${forecast.forecast_year} | Months: ${forecast.start_month}-${forecast.end_month}`,
          alignment: 'center',
          margin: [0, 0, 0, 20]
        }
      ];

      // Financial Summary
      if (forecast.summary) {
        content.push({
          text: 'Financial Summary',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10]
        });

        const summaryData = [
          ['Total Revenue (excl. VAT)', formatCurrency(forecast.summary.total_revenue || 0)],
          ['Gross Profit', formatCurrency(forecast.summary.gross_profit || 0)],
          ['Operating Profit', formatCurrency(forecast.summary.operating_profit || 0)],
          ['Financing Expenses', formatCurrency(forecast.summary.financing_expenses || 0)],
          ['Profit Before Tax', formatCurrency(forecast.summary.profit_before_tax || 0)],
          ['Tax Amount', formatCurrency((forecast.summary.profit_before_tax || 0) - (forecast.summary.net_profit || 0))],
          ['Net Profit (After Tax)', formatCurrency(forecast.summary.net_profit || 0)]
        ];

        content.push({
          table: {
            headerRows: 0,
            widths: ['*', 'auto'],
            body: summaryData
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20]
        });
      }

      // Services
      if (forecast.services && forecast.services.length > 0) {
        content.push({
          text: 'Services & Products',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10]
        });

        const servicesData = [
          [
            { text: 'Service Name', bold: true },
            { text: 'Price', bold: true },
            { text: 'Cost', bold: true },
            { text: 'Margin %', bold: true }
          ],
          ...forecast.services.map(s => [
            s.service_name,
            formatCurrency(s.price || 0),
            formatCurrency(s.calculated?.cost_of_sale || 0),
            `${Math.round(s.calculated?.gross_margin_percentage || 0)}%`
          ])
        ];

        content.push({
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: servicesData
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20]
        });
      }

      // Loans
      if (forecast.financing_loans && forecast.financing_loans.length > 0) {
        content.push({
          text: 'Loans & Financing',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10],
          pageBreak: 'before'
        });

        const loansData = [
          [
            { text: 'Loan Name', bold: true },
            { text: 'Principal', bold: true },
            { text: 'Interest %', bold: true },
            { text: 'Term (months)', bold: true },
            { text: 'Monthly Payment', bold: true }
          ],
          ...forecast.financing_loans.map(l => [
            l.loan_name,
            formatCurrency(l.principal_amount || 0),
            `${l.annual_interest_rate_percent || 0}%`,
            String(l.term_months || 0),
            formatCurrency(l.monthly_payment || 0)
          ])
        ];

        content.push({
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto'],
            body: loansData
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20]
        });
      }

      // Monthly P&L
      if (forecast.profit_loss_monthly && forecast.profit_loss_monthly.length > 0) {
        content.push({
          text: 'Monthly Profit & Loss (Net - excl. VAT)',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10],
          pageBreak: 'before'
        });

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const plData = [
          [
            { text: 'Month', bold: true, fontSize: 9 },
            { text: 'Revenue', bold: true, fontSize: 9 },
            { text: 'Gross', bold: true, fontSize: 9 },
            { text: 'Operating', bold: true, fontSize: 9 },
            { text: 'Financing', bold: true, fontSize: 9 },
            { text: 'Pre-Tax', bold: true, fontSize: 9 },
            { text: 'Net', bold: true, fontSize: 9 }
          ],
          ...forecast.profit_loss_monthly.map(m => [
            { text: monthNames[m.month - 1] || `M${m.month}`, fontSize: 9 },
            { text: formatCurrency(m.revenue || 0), fontSize: 9 },
            { text: formatCurrency(m.gross_profit || 0), fontSize: 9 },
            { text: formatCurrency(m.operating_profit || 0), fontSize: 9 },
            { text: formatCurrency(m.financing_expenses || 0), fontSize: 9, color: '#E53E3E' },
            { text: formatCurrency(m.profit_before_tax || 0), fontSize: 9, color: '#9333EA' },
            { text: formatCurrency(m.net_profit || 0), fontSize: 9, bold: true }
          ])
        ];

        content.push({
          table: {
            headerRows: 1,
            widths: ['auto', '*', '*', '*', '*', '*', '*'],
            body: plData
          },
          layout: 'lightHorizontalLines'
        });
      }

      docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        content: content,
        styles: {
          header: {
            fontSize: 22,
            bold: true
          },
          subheader: {
            fontSize: 16,
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
