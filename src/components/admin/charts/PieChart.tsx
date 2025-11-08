"use client";

import { useRef } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Pie } from "react-chartjs-2";
import { PieChartData } from "@/types/admin";
import { CHART_COLOR_PALETTE } from "@/lib/admin/admin-constants";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * Props cho PieChart component
 */
interface PieChartProps {
  data: PieChartData;
  title?: string;
  height?: number;
  className?: string;
}

/**
 * Component PieChart - Pie chart để hiển thị distribution
 * Sử dụng Chart.js với react-chartjs-2
 */
export default function PieChart({
  data,
  title,
  height = 300,
  className,
}: PieChartProps) {
  const chartRef = useRef<ChartJS<"pie">>(null);

  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((dataset) => ({
      ...dataset,
      backgroundColor:
        dataset.backgroundColor || CHART_COLOR_PALETTE.slice(0, data.labels.length),
      borderColor: "#fff",
      borderWidth: 2,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
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
        callbacks: {
          label: (context: any) => {
            const label = context.label || "";
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0
            );
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className={className} style={{ height: `${height}px` }}>
      <Pie ref={chartRef} data={chartData} options={options} />
    </div>
  );
}

