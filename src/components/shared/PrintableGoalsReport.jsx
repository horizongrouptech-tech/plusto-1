import React from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function PrintableGoalsReport({ goals, customer }) {
  const topLevelGoals = goals.filter(g => !g.parent_id).sort((a, b) => a.order_index - b.order_index);
  const subtasksByGoal = goals.reduce((acc, goal) => {
    if (goal.parent_id) {
      if (!acc[goal.parent_id]) acc[goal.parent_id] = [];
      acc[goal.parent_id].push(goal);
    }
    return acc;
  }, {});

  const statusText = {
    'open': 'פתוח',
    'in_progress': 'בתהליך',
    'done': 'הושלם',
    'delayed': 'מאחר',
    'cancelled': 'בוטל'
  };

  const statusColor = {
    'open': '#3182CE',
    'in_progress': '#D69E2E',
    'done': '#38A169',
    'delayed': '#E53E3E',
    'cancelled': '#718096'
  };

  const totalGoals = topLevelGoals.length;
  const doneGoals = topLevelGoals.filter(g => g.status === 'done').length;
  const inProgressGoals = topLevelGoals.filter(g => g.status === 'in_progress').length;
  const delayedGoals = topLevelGoals.filter(g => g.status === 'delayed').length;

  return (
    <div className="print-container" dir="rtl">
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .print-container { width: 100%; }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
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

        .customer-name {
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

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }

        .summary-card {
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border: 2px solid #e1e8ed;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }

        .summary-label {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 10px;
          color: #5a6c7d;
        }

        .summary-value {
          font-size: 28px;
          font-weight: 700;
          color: #121725;
        }

        .goal-section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }

        .goal-header {
          background: linear-gradient(135deg, #32acc1 0%, #83ddec 100%);
          color: white;
          padding: 20px;
          border-radius: 12px 12px 0 0;
          margin-bottom: 0;
        }

        .goal-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .goal-meta {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          font-size: 13px;
        }

        .goal-body {
          background: white;
          border: 2px solid #32acc1;
          border-top: none;
          border-radius: 0 0 12px 12px;
          padding: 20px;
        }

        .goal-description {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
          line-height: 1.6;
        }

        .subtasks-title {
          font-size: 16px;
          font-weight: 700;
          color: #121725;
          margin-bottom: 15px;
          border-right: 4px solid #fc9f67;
          padding-right: 10px;
        }

        .subtask-item {
          background: #f8f9fa;
          border-right: 4px solid #e1e8ed;
          padding: 15px;
          margin-bottom: 10px;
          border-radius: 8px;
        }

        .subtask-name {
          font-size: 14px;
          font-weight: 600;
          color: #121725;
          margin-bottom: 8px;
        }

        .subtask-meta {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          font-size: 12px;
          color: #5a6c7d;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .progress-bar {
          height: 8px;
          background: #e1e8ed;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 10px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #38A169 0%, #48BB78 100%);
          transition: width 0.3s ease;
        }

        .footer {
          margin-top: 60px;
          padding-top: 20px;
          border-top: 2px solid #e1e8ed;
          text-align: center;
          color: #888;
          font-size: 12px;
        }
      `}</style>

      {/* Header */}
      <div className="report-header">
        <div className="report-title">גאנט יעדים עסקיים</div>
        <div className="customer-name">{customer.business_name || customer.full_name}</div>
        <div className="report-meta">
          תאריך הפקה: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: he })}
        </div>
      </div>

      {/* סטטיסטיקות */}
      <div className="section">
        <h2 className="section-title">סיכום סטטיסטי</h2>
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-label">סה״כ יעדים</div>
            <div className="summary-value">{totalGoals}</div>
          </div>
          <div className="summary-card" style={{ borderColor: '#38A169' }}>
            <div className="summary-label">יעדים שהושלמו</div>
            <div className="summary-value profit-positive">{doneGoals}</div>
          </div>
          <div className="summary-card" style={{ borderColor: '#D69E2E' }}>
            <div className="summary-label">יעדים בתהליך</div>
            <div className="summary-value" style={{ color: '#D69E2E' }}>{inProgressGoals}</div>
          </div>
          <div className="summary-card" style={{ borderColor: '#E53E3E' }}>
            <div className="summary-label">יעדים מאחרים</div>
            <div className="summary-value profit-negative">{delayedGoals}</div>
          </div>
        </div>
      </div>

      {/* רשימת יעדים */}
      {topLevelGoals.map((goal, index) => {
        const subtasks = (subtasksByGoal[goal.id] || []).sort((a, b) => a.order_index - b.order_index);
        
        return (
          <div key={goal.id} className="goal-section">
            <div className="goal-header">
              <div className="goal-title">{index + 1}. {goal.name}</div>
              <div className="goal-meta">
                <span>
                  <span className="status-badge" style={{ 
                    background: statusColor[goal.status] || '#718096',
                    color: 'white'
                  }}>
                    {statusText[goal.status] || goal.status}
                  </span>
                </span>
                {goal.target_date && (
                  <span>תאריך יעד: {format(new Date(goal.target_date), 'dd/MM/yyyy', { locale: he })}</span>
                )}
                {goal.assigned_to && (
                  <span>אחראי: {goal.assigned_to}</span>
                )}
                {goal.completion_percentage !== undefined && (
                  <span>התקדמות: {goal.completion_percentage}%</span>
                )}
              </div>
            </div>
            
            <div className="goal-body">
              {goal.description && (
                <div className="goal-description">
                  {goal.description}
                </div>
              )}

              {goal.completion_percentage !== undefined && (
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${goal.completion_percentage}%` }}
                  />
                </div>
              )}

              {subtasks.length > 0 && (
                <>
                  <div className="subtasks-title">תתי-משימות ({subtasks.length})</div>
                  {subtasks.map((subtask, idx) => (
                    <div key={subtask.id} className="subtask-item" style={{
                      borderRightColor: statusColor[subtask.status] || '#e1e8ed'
                    }}>
                      <div className="subtask-name">
                        {idx + 1}. {subtask.name}
                      </div>
                      <div className="subtask-meta">
                        <span>
                          <span className="status-badge" style={{ 
                            background: statusColor[subtask.status] || '#718096',
                            color: 'white'
                          }}>
                            {statusText[subtask.status] || subtask.status}
                          </span>
                        </span>
                        {subtask.target_date && (
                          <span>יעד: {format(new Date(subtask.target_date), 'dd/MM/yyyy', { locale: he })}</span>
                        )}
                        {subtask.assigned_to && (
                          <span>אחראי: {subtask.assigned_to}</span>
                        )}
                        {subtask.completion_percentage !== undefined && (
                          <span>התקדמות: {subtask.completion_percentage}%</span>
                        )}
                      </div>
                      {subtask.description && (
                        <div style={{ 
                          marginTop: '10px', 
                          fontSize: '12px', 
                          color: '#5a6c7d',
                          paddingRight: '10px'
                        }}>
                          {subtask.description}
                        </div>
                      )}
                      {subtask.completion_percentage !== undefined && (
                        <div className="progress-bar" style={{ marginTop: '10px' }}>
                          <div 
                            className="progress-fill" 
                            style={{ width: `${subtask.completion_percentage}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div className="footer">
        <p>דוח יעדים עסקיים - מערכת Plusto</p>
        <p>תאריך הפקה: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
      </div>
    </div>
  );
}