import React from 'react';
import { ResponsiveLine } from '@nivo/line';

export default function NivoLineChart({ 
  data, 
  colors = { scheme: 'category10' },
  margin = { top: 50, right: 160, bottom: 70, left: 80 },
  enableArea = false,
  enablePoints = true,
  axisBottomLegend = '',
  axisLeftLegend = '',
  curve = 'monotoneX',
  yScaleMin = 'auto',
  yScaleMax = 'auto',
  enableSlices = 'x',
  valueFormat = null
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
    crosshair: {
      line: {
        stroke: '#64748b',
        strokeWidth: 1,
        strokeOpacity: 0.5,
        strokeDasharray: '6 6'
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

  return (
    <ResponsiveLine
      data={data}
      margin={margin}
      xScale={{ type: 'point' }}
      yScale={{
        type: 'linear',
        min: yScaleMin,
        max: yScaleMax,
        stacked: false,
        reverse: false
      }}
      curve={curve}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 8,
        tickPadding: 8,
        tickRotation: data[0]?.data?.length > 10 ? -35 : 0,
        legend: axisBottomLegend,
        legendOffset: axisBottomLegend ? 55 : 0,
        legendPosition: 'middle'
      }}
      axisLeft={{
        tickSize: 8,
        tickPadding: 12,
        tickRotation: 0,
        legend: axisLeftLegend,
        legendOffset: -65,
        legendPosition: 'middle',
        format: valueFormat || defaultValueFormat
      }}
      enableGridX={false}
      enableGridY={true}
      colors={colors}
      lineWidth={3}
      pointSize={10}
      pointColor={{ theme: 'background' }}
      pointBorderWidth={3}
      pointBorderColor={{ from: 'serieColor' }}
      pointLabelYOffset={-14}
      enableArea={enableArea}
      areaOpacity={0.15}
      areaBlendMode="normal"
      useMesh={true}
      enablePoints={enablePoints}
      enableSlices={enableSlices}
      theme={enhancedTheme}
      legends={[
        {
          anchor: 'bottom-right',
          direction: 'column',
          justify: false,
          translateX: 140,
          translateY: 0,
          itemsSpacing: 8,
          itemDirection: 'left-to-right',
          itemWidth: 120,
          itemHeight: 24,
          itemOpacity: 1,
          symbolSize: 14,
          symbolShape: 'circle',
          effects: [
            {
              on: 'hover',
              style: {
                itemBackground: 'rgba(0, 0, 0, 0.03)',
                itemOpacity: 0.85
              }
            }
          ]
        }
      ]}
      animate={true}
      motionConfig="gentle"
      sliceTooltip={({ slice }) => (
        <div
          style={{
            background: '#ffffff',
            padding: '14px 18px',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e2e8f0',
            direction: 'rtl',
            minWidth: '180px'
          }}
        >
          <div style={{ 
            fontWeight: 600, 
            color: '#1e293b', 
            marginBottom: '10px',
            fontSize: '14px',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '8px'
          }}>
            {slice.points[0].data.x}
          </div>
          {slice.points.map(point => (
            <div
              key={point.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '4px 0',
                fontSize: '13px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: point.serieColor
                  }}
                />
                <span style={{ color: '#64748b' }}>{point.serieId}</span>
              </div>
              <strong style={{ color: '#1e293b' }}>
                ₪{typeof point.data.y === 'number' ? point.data.y.toLocaleString() : point.data.y}
              </strong>
            </div>
          ))}
        </div>
      )}
    />
  );
}
