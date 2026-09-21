/**
 * ABHI CABS — Bar chart rendered as SVG using brand colours.
 * Brand: #FFC107 yellow bars on white background.
 */
export default function BarChart({ data, labelKey = 'label', valueKey = 'value', height = 180 }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  const barGap = 10;
  const width = 700;
  const topPadding = 20; // reserve room for the value label so it never clips off-canvas
  const bottomPadding = 28; // room for the axis label
  const barWidth = (width - barGap * (data.length - 1)) / data.length;
  const chartHeight = height - bottomPadding - topPadding;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Bar chart">
      {data.map((d, i) => {
        const barHeight = Math.max(4, (d[valueKey] / max) * chartHeight);
        const x = i * (barWidth + barGap);
        const y = topPadding + (chartHeight - barHeight);
        const isMax = d[valueKey] === max;
        return (
          <g key={i}>
            {/* Track */}
            <rect x={x} y={topPadding} width={barWidth} height={chartHeight} rx="5" fill="#F5F5F3" />
            {/* Bar — brand yellow for max, lighter yellow for others */}
            <rect
              x={x} y={y} width={barWidth} height={barHeight} rx="5"
              fill={isMax ? '#FFC107' : '#FFE082'}
            />
            {/* Value on hover-ish — always show for max */}
            {isMax && (
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="10" fill="#111111" fontWeight="700">
                {d[valueKey]}
              </text>
            )}
            <text x={x + barWidth / 2} y={height - 5} textAnchor="middle" fontSize="10" fill="#9A9A9A" fontWeight="600">
              {d[labelKey]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
