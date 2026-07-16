import { Card, Statistic } from "antd";

interface StatCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  prefix?: React.ReactNode;
  color?: string;
  loading?: boolean;
}

const colorMap: Record<string, string> = {
  blue: "#1677ff",
  green: "#22d3bb",
  orange: "#f97316",
  red: "#f5222d",
  purple: "#a855f7",
  cyan: "#00d4ff",
  gold: "#f59e0b",
};

export default function StatCard({
  title,
  value,
  suffix,
  prefix,
  color = "blue",
  loading = false,
}: StatCardProps) {
  const accent = colorMap[color] || color || colorMap.blue;

  return (
    <Card
      loading={loading}
      styles={{ body: { padding: "12px 16px" } }}
      style={{
        height: "100%",
        borderLeft: `3px solid ${accent}`,
        borderRadius: 8,
      }}
    >
      <Statistic
        title={<span style={{ color: "#64748b", fontSize: 12, fontWeight: 500 }}>{title}</span>}
        value={value}
        suffix={<span style={{ fontSize: 14, color: "#94a3b8" }}>{suffix}</span>}
        prefix={prefix}
        valueStyle={{ fontSize: 26, fontWeight: 700, color: "#1e293b" }}
      />
    </Card>
  );
}
