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
  green: "#52c41a",
  orange: "#fa8c16",
  red: "#f5222d",
  purple: "#722ed1",
  cyan: "#13c2c2",
};

export default function StatCard({
  title,
  value,
  suffix,
  prefix,
  color = "blue",
  loading = false,
}: StatCardProps) {
  const borderColor = colorMap[color] || color || colorMap.blue;

  return (
    <Card
      loading={loading}
      style={{ borderTop: `3px solid ${borderColor}`, height: "100%" }}
      bodyStyle={{ padding: "20px 24px" }}
    >
      <Statistic
        title={title}
        value={value}
        suffix={suffix}
        prefix={prefix}
        valueStyle={{ fontSize: 28, fontWeight: 600 }}
      />
    </Card>
  );
}
