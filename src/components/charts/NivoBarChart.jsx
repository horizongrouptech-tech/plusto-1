import React from 'react';
import { ResponsiveBar } from '@nivo/bar';

export default function NivoBarChart({ 
  data, 
  keys, 
  indexBy = 'name',
  colors = { scheme: 'nivo' },
  margin = { top: 50, right: 130, bottom: 50, left: 60 },
  layout = 'vertical',
  enableLabel = true,
  axisBottomLegend = '',
  axisLeftLegend = '',
  tooltipLabel = null
}) {
  return (
    <ResponsiveBar
      data={data}
      keys={keys}
      indexBy={indexBy}
      margin={margin}
      padding={0.3}
      layout={layout}
      valueScale={{ type: 'linear' }}
      indexScale={{ type: 'band', round: true }}
      colors={colors}
      theme={{
        text: {
          fill: '#5a6c7d',
          fontFamily: 'Heebo, sans-serif'
        },
        tooltip: {
          container: {
            background: '#ffffff',
            color: '#121725',
            fontSize: '14px',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
            padding: '12px 16px'
          }
        },
        grid: {
          line: {
            stroke: '#e1e8ed',
            strokeWidth: 1
          }
        }
      }}
      borderRadius={4}
      borderColor={{
        from: 'color',
        modifiers: [['darker', 1.6]]
      }}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: axisBottomLegend,
        legendPosition: 'middle',
        legendOffset: 40
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: axisLeftLegend,
        legendPosition: 'middle',
        legendOffset: -50
      }}
      enableGridY={true}
      labelSkipWidth={12}
      labelSkipHeight={12}
      labelTextColor={{
        from: 'color',
        modifiers: [['darker', 1.6]]
      }}
      legends={[
        {
          dataFrom: 'keys',
          anchor: 'bottom-right',
          direction: 'column',
          justify: false,
          translateX: 120,
          translateY: 0,
          itemsSpacing: 2,
          itemWidth: 100,
          itemHeight: 20,
          itemDirection: 'left-to-right',
          itemOpacity: 0.85,
          symbolSize: 20,
          effects: [
            {
              on: 'hover',
              style: {
                itemOpacity: 1
              }
            }
          ]
        }
      ]}
      role="application"
      ariaLabel="Bar chart"
      animate={true}
      motionConfig="wobbly"
      tooltip={tooltipLabel || undefined}
    />
  );
}