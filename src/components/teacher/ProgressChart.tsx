"use client";
import { useEffect, useRef } from "react";

export default function ProgressChart() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  useEffect(() => {
    const initChart = async () => {
      const { Chart } = await import("chart.js/auto");
      const ctx = chartRef.current;
      if (!ctx) return;

      // Destroy existing chart if it exists
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      chartInstanceRef.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Lớp 8A", "Lớp 8B", "Lớp 8C", "Lớp 8D", "Lớp 9A", "Lớp 9C"],
          datasets: [
            {
              label: "Tiến độ hoàn thành (%)",
              data: [85, 78, 91, 82, 72, 88],
              backgroundColor: [
                "#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4",
              ],
              borderRadius: 8,
            },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    };

    initChart();

    // Cleanup function
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="h-64">
      <canvas ref={chartRef} />
    </div>
  );
}
