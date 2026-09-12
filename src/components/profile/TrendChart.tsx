'use client'
import React from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
)

/**
 * Progress line for a single metric across attempts.
 *
 * Points with no value (interviews that predate transcript storage, or that
 * were never graded) are passed through as null so the line breaks rather than
 * inventing a data point at zero.
 */
const TrendChart = ({
  labels,
  data,
  color,
  suggestedMin = 0,
  suggestedMax,
}: {
  labels: string[]
  data: (number | null)[]
  color: string
  suggestedMin?: number
  suggestedMax?: number
}) => (
  <div className="h-48 w-full">
    <Line
      data={{
        labels,
        datasets: [
          {
            data,
            borderColor: color,
            backgroundColor: `${color}22`,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: color,
            tension: 0.3,
            fill: true,
            spanGaps: false,
          },
        ],
      }}
      options={{
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { suggestedMin, suggestedMax, ticks: { precision: 0 } },
          x: { grid: { display: false } },
        },
      }}
    />
  </div>
)

export default TrendChart
