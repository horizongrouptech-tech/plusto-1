import React from 'react';
import { ResponsiveBar } from '@nivo/bar';

export default function NivoBarChart({ 
  data, 
  keys, 
  indexBy = 'name',
  colors = { scheme: 'nivo' },
  margin = { top: 50, right: 160, bottom: 70, left: 80 },
  layout = 'vertical',
  enableLabel = true,
  axisBottomLegend = '',
  axisLeftLegend = '',
  tooltipLabel = null,
  groupMode = 'grouped',
  valueFormat = null,
  labelFormat = null
}) {
  // עיצוב משופר עם קריאות מעולה
  const enhancedTheme = {
    text: {
      fill: '#334155',
      fontSize: 13,
      fontFamily: 'Heebo, Inter, -apple-system, sans-serif',
      fontWeight: 500
    },
    axis: {
      domain: {
        line: {
          stroke: '#cbd5e1',
          strokeWidth: 1.5
        }
      },
      ticks: {
        line: {
          stroke: '#e2e8f0',
          strokeWidth: 1
        },
        text: {
          fill: '#475569',
          fontSize: 12,
          fontWeight: 500
        }
      },
      legend: {
        text: {
          fill: '#1e293b',
          fontSize: 13,
          fontWeight: 600
        }
      }
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
    grid: {
      line: {
        stroke: '#f1f5f9',
        strokeWidth: 1,
        strokeDasharray: '4 4'
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

  // פורמט ברירת מחדל לערכים בעברית
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

  return (
    <ResponsiveBar
      data={data}
      keys={keys}
      indexBy={indexBy}
      margin={margin}
      padding={0.35}
      innerPadding={3}
      groupMode={groupMode}
      layout={layout}
      valueScale={{ type: 'linear' }}
      indexScale={{ type: 'band', round: true }}
      colors={colors}
      theme={enhancedTheme}
      borderRadius={6}
      borderWidth={0}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 8,
        tickPadding: 8,
        tickRotation: data.length > 8 ? -35 : 0,
        legend: axisBottomLegend,
        legendPosition: 'middle',
        legendOffset: axisBottomLegend ? 55 : 0,
        truncateTickAt: 0
      }}
      axisLeft={{
        tickSize: 8,
        tickPadding: 12,
        tickRotation: 0,
        legend: axisLeftLegend,
        legendPosition: 'middle',
        legendOffset: -65,
        format: valueFormat || defaultValueFormat
      }}
      enableGridX={false}
      enableGridY={true}
      labelSkipWidth={40}
      labelSkipHeight={20}
      labelTextColor="#ffffff"
      label={labelFormat || ((d) => {
        if (typeof d.value !== 'number') return d.value;
        if (Math.abs(d.value) >= 1000) {
          return `${(d.value / 1000).toFixed(0)}K`;
        }
        return d.value.toLocaleString();
      })}
      legends={[
        {
          dataFrom: 'keys',
          anchor: 'bottom-right',
          direction: 'column',
          justify: false,
          translateX: 140,
          translateY: 0,
          itemsSpacing: 8,
          itemWidth: 120,
          itemHeight: 24,
          itemDirection: 'left-to-right',
          itemOpacity: 1,
          symbolSize: 14,
          symbolShape: 'circle',
          effects: [
            {
              on: 'hover',
              style: {
                itemOpacity: 0.85
              }
            }
          ]
        }
      ]}
      role="application"
      ariaLabel="Bar chart"
      animate={true}
      motionConfig="gentle"
      tooltip={tooltipLabel || (({ id, value, color, indexValue }) => (
        <div
          style={{
            background: '#ffffff',
            padding: '14px 18px',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e2e8f0',
            direction: 'rtl'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ 
              width: '14px', 
              height: '14px', 
              borderRadius: '50%', 
              background: color 
            }} />
            <strong style={{ color: '#1e293b', fontSize: '14px' }}>{indexValue}</strong>
          </div>
          <div style={{ color: '#64748b', fontSize: '13px' }}>
            {id}: <strong style={{ color: '#1e293b' }}>₪{typeof value === 'number' ? value.toLocaleString() : value}</strong>
          </div>
        </div>
      ))}
    />
  );
}
