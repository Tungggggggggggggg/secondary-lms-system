"use client";

import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { LineChartData } from "@/types/admin";
import { CHART_COLORS } from "@/lib/admin/admin-constants";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Props cho LineChart component
 */
interface LineChartProps {
  data: LineChartData;
  title?: string;
  height?: number;
  className?: string;
}

/**
 * Component LineChart - Line chart để hiển thị trends
 * Sử dụng Chart.js với react-chartjs-2
 */
export default function LineChart({
  data,
  title,
  height = 300,
  className,
}: LineChartProps) {
  const chartRef = useRef<ChartJS<"line">>(null);

  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      borderColor: dataset.borderColor || CHART_COLORS.primary,
      backgroundColor: dataset.backgroundColor || `${CHART_COLORS.primary}20`,
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: dataset.borderColor || CHART_COLORS.primary,
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
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
      },
    },
  };

  return (
    <div className={className} style={{ height: `${height}px` }}>
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}

