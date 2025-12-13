import React from 'react';
import { ResponsivePie } from '@nivo/pie';

export default function NivoPieChart({ 
  data, 
  colors = { scheme: 'nivo' },
  margin = { top: 40, right: 80, bottom: 80, left: 80 },
  innerRadius = 0,
  padAngle = 0.7,
  cornerRadius = 3,
  enableArcLabels = true,
  enableArcLinkLabels = true
}) {
  return (
    <ResponsivePie
      data={data}
      margin={margin}
      innerRadius={innerRadius}
      padAngle={padAngle}
      cornerRadius={cornerRadius}
      activeOuterRadiusOffset={8}
      colors={colors}
      borderWidth={1}
      borderColor={{
        from: 'color',
        modifiers: [['darker', 0.2]]
      }}
      arcLinkLabelsSkipAngle={10}
      arcLinkLabelsTextColor="#5a6c7d"
      arcLinkLabelsThickness={2}
      arcLinkLabelsColor={{ from: 'color' }}
      arcLabelsSkipAngle={10}
      arcLabelsTextColor={{
        from: 'color',
        modifiers: [['darker', 2]]
      }}
      enableArcLabels={enableArcLabels}
      enableArcLinkLabels={enableArcLinkLabels}
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
        }
      }}
      legends={[
        {
          anchor: 'bottom',
          direction: 'row',
          justify: false,
          translateX: 0,
          translateY: 56,
          itemsSpacing: 0,
          itemWidth: 100,
          itemHeight: 18,
          itemTextColor: '#5a6c7d',
          itemDirection: 'left-to-right',
          itemOpacity: 1,
          symbolSize: 18,
          symbolShape: 'circle',
          effects: [
            {
              on: 'hover',
              style: {
                itemTextColor: '#121725'
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