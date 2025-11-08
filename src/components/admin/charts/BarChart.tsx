"use client";

import { useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { BarChartData } from "@/types/admin";
import { CHART_COLOR_PALETTE, CHART_COLORS } from "@/lib/admin/admin-constants";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Props cho BarChart component
 */
interface BarChartProps {
  data: BarChartData;
  title?: string;
  height?: number;
  className?: string;
}

/**
 * Component BarChart - Bar chart để hiển thị usage stats
 * Sử dụng Chart.js với react-chartjs-2
 */
export default function BarChart({
  data,
  title,
  height = 300,
  className,
}: BarChartProps) {
  const chartRef = useRef<ChartJS<"bar">>(null);

  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor:
        dataset.backgroundColor ||
        (Array.isArray(dataset.backgroundColor)
          ? dataset.backgroundColor
          : CHART_COLOR_PALETTE),
      borderColor: CHART_COLORS.primary,
      borderWidth: 1,
      borderRadius: 4,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: "bold" as const,
        },
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          font: {
            size: 11,
          },
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className={className} style={{ height: `${height}px` }}>
      <Bar ref={chartRef} data={chartData} options={options} />
    </div>
  );
}

