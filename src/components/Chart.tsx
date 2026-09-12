'use client'
import React from 'react'
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const LABELS: Record<string,string> = {
  depthOfKnowledge: 'Depth of knowledge',
  impactOrientedMindset: 'Impact mindset',
  architecturalFlexibility: 'Architectural flexibility',
  problemSolvingAndDebuggingSkills: 'Problem solving',
  collaborationAndCommunication: 'Collaboration',
}

/**
 * The five parameter scores are independent 0-10 ratings, not parts of a whole.
 * This was previously a pie chart, which implied they summed to 100% - two 10s
 * rendered as 50% each. A radar keeps each axis on its own 0-10 scale.
 */
const Chart = ({data,labels}:{data:number[],labels:string[]}) => {
  return (
    <Radar
      data={{
        labels: labels.map((l) => LABELS[l] ?? l),
        datasets: [
          {
            label: 'Score out of 10',
            data,
            backgroundColor: 'rgba(59,130,246,0.18)',
            borderColor: '#3b82f6',
            borderWidth: 2,
            pointBackgroundColor: '#3b82f6',
            pointRadius: 3,
          },
        ],
      }}
      options={{
        scales: {
          r: {
            min: 0,
            max: 10,
            ticks: { stepSize: 2, backdropColor: 'transparent' },
            pointLabels: { font: { size: 11 } },
          },
        },
        plugins: { legend: { display: false } },
        maintainAspectRatio: false,
      }}
    />
  );
}

export default Chart
