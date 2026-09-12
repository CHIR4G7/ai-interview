'use client'
import React from 'react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

/**
 * Part-to-whole chart for coverage-style metrics.
 *
 * A pie/donut is the right form here — "covered vs missed" genuinely sums to
 * 100%. (It is the wrong form for the five parameter scores, which are five
 * independent 0–10 ratings that do not sum to anything.)
 */
const DonutChart = ({
  covered,
  missed,
  centreLabel,
}: {
  covered: number
  missed: number
  centreLabel?: string
}) => {
  const empty = covered + missed === 0

  return (
    <div className="relative h-40 w-40">
      <Doughnut
        data={{
          labels: ['Mentioned', 'Not mentioned'],
          datasets: [
            {
              data: empty ? [1] : [covered, missed],
              backgroundColor: empty
                ? ['#e5e5e5']
                : ['#22c55e', '#e5e5e5'],
              borderColor: '#ffffff',
              borderWidth: 2,
            },
          ],
        }}
        options={{
          cutout: '70%',
          plugins: {
            legend: { display: false },
            tooltip: { enabled: !empty },
          },
          maintainAspectRatio: false,
        }}
      />
      {centreLabel && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-extrabold text-neutral-900">
            {centreLabel}
          </span>
        </div>
      )}
    </div>
  )
}

export default DonutChart
