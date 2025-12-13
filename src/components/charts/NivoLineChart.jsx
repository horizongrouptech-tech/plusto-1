import React from 'react';
import { ResponsiveLine } from '@nivo/line';

export default function NivoLineChart({ 
  data, 
  colors = { scheme: 'nivo' },
  margin = { top: 50, right: 110, bottom: 50, left: 60 },
  enableArea = false,
  enablePoints = true,
  axisBottomLegend = '',
  axisLeftLegend = '',
  curve = 'monotoneX'
}) {
  return (
    <ResponsiveLine
      data={data}
      margin={margin}
      xScale={{ type: 'point' }}
      yScale={{
        type: 'linear',
        min: 'auto',
        max: 'auto',
        stacked: false,
        reverse: false
      }}
      curve={curve}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: axisBottomLegend,
        legendOffset: 40,
        legendPosition: 'middle'
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: axisLeftLegend,
        legendOffset: -50,
        legendPosition: 'middle'
      }}
      enableGridX={false}
      enableGridY={true}
      colors={colors}
      lineWidth={3}
      pointSize={8}
      pointColor={{ theme: 'background' }}
      pointBorderWidth={2}
      pointBorderColor={{ from: 'serieColor' }}
      pointLabelYOffset={-12}
      enableArea={enableArea}
      areaOpacity={0.1}
      useMesh={true}
      enablePoints={enablePoints}
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
      legends={[
        {
          anchor: 'bottom-right',
          direction: 'column',
          justify: false,
          translateX: 100,
          translateY: 0,
          itemsSpacing: 0,
          itemDirection: 'left-to-right',
          itemWidth: 80,
          itemHeight: 20,
          itemOpacity: 0.75,
          symbolSize: 12,
          symbolShape: 'circle',
          symbolBorderColor: 'rgba(0, 0, 0, .5)',
          effects: [
            {
              on: 'hover',
              style: {
                itemBackground: 'rgba(0, 0, 0, .03)',
                itemOpacity: 1
              }
            }
          ]
        }
      ]}
      animate={true}
      motionConfig="wobbly"
    />
  );
}