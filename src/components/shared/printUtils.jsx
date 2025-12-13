/**
 * פתיחת חלון הדפסה עם HTML תוכן
 * @param {string} htmlContent - HTML string להדפסה
 * @param {string} filename - שם הקובץ
 */
export const openPrintWindow = (htmlContent, filename = 'report') => {
  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  
  if (!printWindow) {
    alert('נא לאפשר pop-ups בדפדפן כדי לייצא PDF');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${filename}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          background: white;
          direction: rtl;
          padding: 20px;
        }
        @media print {
          body { margin: 0; padding: 10px; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `);

  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);
};

export const printHTML = openPrintWindow;