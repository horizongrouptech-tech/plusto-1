import React from 'react';
import { ResponsivePie } from '@nivo/pie';

export default function NivoPieChart({ 
  data, 
  colors = { scheme: 'nivo' },
  margin = { top: 50, right: 120, bottom: 80, left: 120 },
  innerRadius = 0.5,
  padAngle = 1,
  cornerRadius = 6,
  enableArcLabels = true,
  enableArcLinkLabels = true,
  valueFormat = null,
  sortByValue = true
}) {
  // עיצוב משופר עם קריאות מעולה
  const enhancedTheme = {
    text: {
      fill: '#334155',
      fontSize: 13,
      fontFamily: 'Heebo, Inter, -apple-system, sans-serif',
      fontWeight: 500
    },
    tooltip: {
      container: {
        background: '#ffffff',
        color: '#1e293b',
        fontSize: '14px',
        fontWeight: 500,
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)',
        padding: '14px 18px',
        border: '1px solid #e2e8f0'
      }
    },
    legends: {
      text: {
        fill: '#475569',
        fontSize: 12,
        fontWeight: 500
      }
    },
    labels: {
      text: {
        fill: '#ffffff',
        fontSize: 12,
        fontWeight: 600
      }
    }
  };

  // פורמט ברירת מחדל לערכים
  const defaultValueFormat = (value) => {
    if (typeof value !== 'number') return value;
    if (Math.abs(value) >= 1000000) {
      return `₪${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `₪${(value / 1000).toFixed(0)}K`;
    }
    return `₪${value.toLocaleString()}`;
  };

  // חישוב סה"כ לאחוזים
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);

  return (
    <ResponsivePie
      data={data}
      margin={margin}
      innerRadius={innerRadius}
      padAngle={padAngle}
      cornerRadius={cornerRadius}
      activeOuterRadiusOffset={12}
      colors={colors}
      borderWidth={2}
      borderColor={{
        from: 'color',
        modifiers: [['darker', 0.15]]
      }}
      arcLinkLabelsSkipAngle={12}
      arcLinkLabelsTextColor="#475569"
      arcLinkLabelsThickness={2}
      arcLinkLabelsColor={{ from: 'color' }}
      arcLinkLabelsTextOffset={8}
      arcLinkLabelsDiagonalLength={20}
      arcLinkLabelsStraightLength={16}
      arcLabelsSkipAngle={15}
      arcLabelsTextColor="#ffffff"
      enableArcLabels={enableArcLabels}
      enableArcLinkLabels={enableArcLinkLabels}
      sortByValue={sortByValue}
      theme={enhancedTheme}
      arcLabel={(d) => {
        const percentage = total > 0 ? ((d.value / total) * 100).toFixed(0) : 0;
        return `${percentage}%`;
      }}
      legends={[
        {
          anchor: 'bottom',
          direction: 'row',
          justify: false,
          translateX: 0,
          translateY: 65,
          itemsSpacing: 8,
          itemWidth: 110,
          itemHeight: 22,
          itemTextColor: '#475569',
          itemDirection: 'right-to-left',
          itemOpacity: 1,
          symbolSize: 14,
          symbolShape: 'circle',
          effects: [
            {
              on: 'hover',
              style: {
                itemTextColor: '#1e293b'
              }
            }
          ]
        }
      ]}
      animate={true}
      motionConfig="gentle"
      tooltip={({ datum }) => {
        const percentage = total > 0 ? ((datum.value / total) * 100).toFixed(1) : 0;
        return (
          <div
            style={{
              background: '#ffffff',
              padding: '14px 18px',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
              border: '1px solid #e2e8f0',
              direction: 'rtl',
              minWidth: '160px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                borderRadius: '50%', 
                background: datum.color 
              }} />
              <strong style={{ color: '#1e293b', fontSize: '14px' }}>{datum.label}</strong>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              gap: '12px' 
            }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>ערך:</span>
              <strong style={{ color: '#1e293b', fontSize: '14px' }}>
                {valueFormat ? valueFormat(datum.value) : defaultValueFormat(datum.value)}
              </strong>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              gap: '12px',
              marginTop: '4px'
            }}>
              <span style={{ color: '#64748b', fontSize: '13px' }}>אחוז:</span>
              <strong style={{ color: datum.color, fontSize: '14px' }}>{percentage}%</strong>
            </div>
          </div>
        );
      }}
    />
  );
}
