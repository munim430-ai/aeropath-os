import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from "recharts";

// ── REAL DATA FROM EXCEL FILES ──────────────────────────────────────────────
const OPENING_CASH = 230000;
const CLOSING_CASH = 44500;
const OPENING_BANK = 1508497;
const CLOSING_BANK = 2029997;

const dailyCashData = [
  { date: "Mar 1", cash: 187000 },
  { date: "Mar 2", cash: 40000 },
  { date: "Mar 3", cash: 51500 },
  { date: "Mar 4", cash: 64000 },
  { date: "Mar 5", cash: 63500 },
  { date: "Mar 7", cash: 44500 },
  { date: "Mar 8", cash: 23500 },
  { date: "Mar 9", cash: 91500 },
  { date: "Mar 10", cash: 108500 },
  { date: "Mar 11", cash: 142500 },
  { date: "Mar 12", cash: 158000 },
  { date: "Mar 14", cash: 188000 },
  { date: "Mar 15", cash: 47500 },
  { date: "Mar 16", cash: 24000 },
  { date: "Mar 23", cash: 19500 },
  { date: "Mar 24", cash: 6500 },
  { date: "Mar 25", cash: 77000 },
  { date: "Mar 28", cash: 34500 },
  { date: "Mar 29", cash: 74500 },
  { date: "Mar 30", cash: 54000 },
  { date: "Mar 31", cash: 44500 },
];

const dailyBankData = [
  { date: "Mar 1", bank: 1094497 },
  { date: "Mar 2", bank: 1250997 },
  { date: "Mar 4", bank: 1251997 },
  { date: "Mar 5", bank: 1285997 },
  { date: "Mar 7", bank: 1309997 },
  { date: "Mar 8", bank: 1333997 },
  { date: "Mar 9", bank: 1351997 },
  { date: "Mar 10", bank: 1458997 },
  { date: "Mar 11", bank: 1510997 },
  { date: "Mar 12", bank: 1515997 },
  { date: "Mar 14", bank: 1528997 },
  { date: "Mar 15", bank: 1696997 },
  { date: "Mar 17", bank: 1704997 },
  { date: "Mar 18", bank: 1712997 },
  { date: "Mar 23", bank: 1720997 },
  { date: "Mar 24", bank: 1773997 },
  { date: "Mar 25", bank: 1812997 },
  { date: "Mar 26", bank: 1820997 },
  { date: "Mar 28", bank: 1864997 },
  { date: "Mar 29", bank: 1880997 },
  { date: "Mar 30", bank: 1937997 },
  { date: "Mar 31", bank: 2029997 },
];

const expenseBreakdown = [
  { name: "Extra Expenses", value: 452000, color: "#f59e0b" },
  { name: "Wages / Salary", value: 71000, color: "#8b5cf6" },
  { name: "Bank Deposits", value: 271500, color: "#3b82f6" },
  { name: "Office Rent", value: 45000, color: "#ef4444" },
  { name: "Utility Bill", value: 16000, color: "#10b981" },
];

const cashFlowBars = [
  { label: "Cash In", value: 670000, color: "#10b981" },
  { label: "Cash Out", value: 855500, color: "#ef4444" },
  { label: "BKASH In", value: 330000, color: "#8b5cf6" },
  { label: "Bank Deposits", value: 625500, color: "#3b82f6" },
  { label: "Bank Withdrawals", value: 364000, color: "#f59e0b" },
];

// ── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n) => "৳" + n.toLocaleString("en-IN");

const CustomTooltip = ({ active, payload, label, prefix = "৳" }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "#1a1a2e",
        border: "1px solid #2a2a3e",
        borderRadius: 8,
        padding: "8px 14px",
        fontSize: 13,
        color: "#e2e8f0",
      }}>
        <div style={{ color: "#94a3b8", marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color || "#fff", fontWeight: 600 }}>
            {prefix}{p.value.toLocaleString("en-IN")}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const KPICard = ({ label, value, sub, valueColor = "#10b981", trend }) => (
  <div style={{
    background: "#111118",
    border: "1px solid #1e1e2e",
    borderRadius: 14,
    padding: "22px 24px",
    flex: 1,
    minWidth: 0,
  }}>
    <div style={{ color: "#64748b", fontSize: 13, marginBottom: 10, letterSpacing: "0.03em" }}>{label}</div>
    <div style={{ color: valueColor, fontSize: 26, fontWeight: 700, fontFamily: "'Space Mono', monospace", letterSpacing: "-0.5px" }}>
      {value}
    </div>
    {sub && <div style={{ color: "#475569", fontSize: 12, marginTop: 8 }}>{sub}</div>}
    {trend !== undefined && (
      <div style={{
        marginTop: 8,
        fontSize: 12,
        color: trend >= 0 ? "#10b981" : "#ef4444",
        display: "flex", alignItems: "center", gap: 4,
      }}>
        {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toLocaleString("en-IN")} this month
      </div>
    )}
  </div>
);

const SectionHeader = ({ title, sub }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 600 }}>{title}</div>
    {sub && <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>{sub}</div>}
  </div>
);

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const totalBalance = CLOSING_CASH + CLOSING_BANK;
  const cashChange = CLOSING_CASH - OPENING_CASH;
  const bankChange = CLOSING_BANK - OPENING_BANK;

  const tabs = ["overview", "cash ledger", "bank account"];

  return (
    <div style={{
      background: "#0d0d14",
      minHeight: "100vh",
      color: "#e2e8f0",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      padding: "28px 32px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ color: "#f8fafc", fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>
            Financial Overview
          </div>
          <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>
            Hangeul Academy · March 2026
          </div>
        </div>
        <div style={{
          background: "#1a1a2e",
          border: "1px solid #2a2a3e",
          borderRadius: 8,
          padding: "6px 14px",
          fontSize: 12,
          color: "#8b5cf6",
          fontWeight: 600,
        }}>
          Mar 1 – Mar 31, 2026
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: "1px solid #1e1e2e", paddingBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === t ? "2px solid #8b5cf6" : "2px solid transparent",
              color: activeTab === t ? "#f1f5f9" : "#475569",
              fontSize: 13,
              fontWeight: activeTab === t ? 600 : 400,
              padding: "8px 16px",
              cursor: "pointer",
              textTransform: "capitalize",
              transition: "all 0.15s",
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* KPI Row */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <KPICard
              label="Total Balance (Cash + Bank)"
              value={fmt(totalBalance)}
              sub={`As of March 31, 2026`}
              valueColor="#f8fafc"
            />
            <KPICard
              label="Cash in Hand"
              value={fmt(CLOSING_CASH)}
              sub={`Opened at ${fmt(OPENING_CASH)}`}
              valueColor="#10b981"
              trend={cashChange}
            />
            <KPICard
              label="Bank Balance"
              value={fmt(CLOSING_BANK)}
              sub={`Opened at ${fmt(OPENING_BANK)}`}
              valueColor="#3b82f6"
              trend={bankChange}
            />
          </div>

          {/* Secondary KPIs */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <KPICard label="Total Cash Received" value={fmt(670000)} valueColor="#10b981" sub="March inflows (cash)" />
            <KPICard label="Total Expenses (Cash)" value={fmt(855500)} valueColor="#ef4444" sub="Rent + Wages + Utility + Extra" />
            <KPICard label="BKASH Received" value={fmt(330000)} valueColor="#8b5cf6" sub="Digital payments received" />
            <KPICard label="Bank Deposits In" value={fmt(625500)} valueColor="#3b82f6" sub="Funds deposited to bank" />
          </div>

          {/* Charts Row */}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>

            {/* Expense Donut */}
            <div style={{
              background: "#111118",
              border: "1px solid #1e1e2e",
              borderRadius: 14,
              padding: "22px 24px",
              flex: "1 1 300px",
            }}>
              <SectionHeader title="Expense Breakdown" sub="Cash ledger — March 2026" />
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expenseBreakdown.map((e, i) => (
                      <Cell key={i} fill={e.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend
                    formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{v}</span>}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Cash Flow Bar */}
            <div style={{
              background: "#111118",
              border: "1px solid #1e1e2e",
              borderRadius: 14,
              padding: "22px 24px",
              flex: "1 1 300px",
            }}>
              <SectionHeader title="Monthly Cash Flow Summary" sub="Inflows vs outflows — March 2026" />
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={cashFlowBars} barSize={32}>
                  <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => "৳" + (v / 1000) + "k"} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {cashFlowBars.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* CASH LEDGER TAB */}
      {activeTab === "cash ledger" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <KPICard label="Opening Balance" value={fmt(OPENING_CASH)} valueColor="#94a3b8" sub="March 1, 2026" />
            <KPICard label="Closing Balance" value={fmt(CLOSING_CASH)} valueColor="#10b981" sub="March 31, 2026" trend={cashChange} />
            <KPICard label="Total Cash In" value={fmt(670000)} valueColor="#10b981" sub="All cash received" />
            <KPICard label="Total Cash Out" value={fmt(855500)} valueColor="#ef4444" sub="All cash outflows" />
          </div>

          <div style={{
            background: "#111118",
            border: "1px solid #1e1e2e",
            borderRadius: 14,
            padding: "22px 24px",
          }}>
            <SectionHeader title="Daily Cash Balance" sub="End-of-day cash in hand — March 2026" />
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyCashData}>
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => "৳" + (v / 1000) + "k"} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="cash"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ fill: "#10b981", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#10b981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Expense detail cards */}
          <div style={{
            background: "#111118",
            border: "1px solid #1e1e2e",
            borderRadius: 14,
            padding: "22px 24px",
          }}>
            <SectionHeader title="Expense Categories" sub="Totals for March 2026" />
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { label: "Extra Expenses", value: 452000, color: "#f59e0b", pct: 53 },
                { label: "Bank Deposits (Out)", value: 271500, color: "#3b82f6", pct: 32 },
                { label: "Wages / Salary", value: 71000, color: "#8b5cf6", pct: 8 },
                { label: "Office Rent", value: 45000, color: "#ef4444", pct: 5 },
                { label: "Utility Bill", value: 16000, color: "#10b981", pct: 2 },
              ].map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 0",
                  borderBottom: i < 4 ? "1px solid #1a1a2e" : "none",
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, color: "#cbd5e1", fontSize: 13 }}>{item.label}</div>
                  <div style={{ width: 160, background: "#1a1a2e", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ width: item.pct + "%", height: "100%", background: item.color, borderRadius: 4 }} />
                  </div>
                  <div style={{ color: item.color, fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 600, minWidth: 100, textAlign: "right" }}>
                    {fmt(item.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BANK ACCOUNT TAB */}
      {activeTab === "bank account" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <KPICard label="Opening Bank Balance" value={fmt(OPENING_BANK)} valueColor="#94a3b8" sub="March 1, 2026" />
            <KPICard label="Closing Bank Balance" value={fmt(CLOSING_BANK)} valueColor="#3b82f6" sub="March 31, 2026" trend={bankChange} />
            <KPICard label="Total Deposited" value={fmt(625500)} valueColor="#10b981" sub="All deposits this month" />
            <KPICard label="Total Withdrawn" value={fmt(364000)} valueColor="#ef4444" sub="All withdrawals this month" />
          </div>

          <div style={{
            background: "#111118",
            border: "1px solid #1e1e2e",
            borderRadius: 14,
            padding: "22px 24px",
          }}>
            <SectionHeader title="Bank Balance Growth" sub="Daily net balance — March 2026" />
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyBankData}>
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => "৳" + (v / 100000).toFixed(1) + "L"} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="bank"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#3b82f6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bank summary rows */}
          <div style={{
            background: "#111118",
            border: "1px solid #1e1e2e",
            borderRadius: 14,
            padding: "22px 24px",
          }}>
            <SectionHeader title="Transaction Summary" sub="March 2026 — Bank Account" />
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { label: "BKASH Payments Received", value: 330000, color: "#8b5cf6", type: "in" },
                { label: "Bank Deposits (Cash to Bank)", value: 625500, color: "#3b82f6", type: "in" },
                { label: "Bank Withdrawals", value: 364000, color: "#ef4444", type: "out" },
                { label: "Marketing Expense", value: 70000, color: "#f59e0b", type: "out" },
              ].map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 0",
                  borderBottom: i < 3 ? "1px solid #1a1a2e" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: item.type === "in" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, color: item.type === "in" ? "#10b981" : "#ef4444",
                    }}>
                      {item.type === "in" ? "↓" : "↑"}
                    </div>
                    <div style={{ color: "#cbd5e1", fontSize: 13 }}>{item.label}</div>
                  </div>
                  <div style={{
                    color: item.color,
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 14,
                    fontWeight: 700,
                  }}>
                    {item.type === "out" ? "-" : "+"}{fmt(item.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, color: "#334155", fontSize: 11, textAlign: "center" }}>
        Data sourced from Cash Balance · Bank Balance · Monthly Statements — Hangeul Academy March 2026
      </div>
    </div>
  );
}
