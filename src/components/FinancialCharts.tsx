import { Link } from "react-router-dom";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { money } from "../lib/finance";

const pieColors = ["#f1f1f1", "#adadad", "#d1d1d1", "#858585", "#e0e0e0", "#999999", "#c2c2c2", "#747474"];

export default function FinancialCharts({
  income,
  totalExpenses,
  expenses,
}: {
  income: number;
  totalExpenses: number;
  expenses: [string, number][];
}) {
  return <>
    <section className="panel">
      <div className="panel-heading">
        <div><h2>Income vs expenses</h2><p>Monthly amounts you entered</p></div>
        <span className="chart-legend"><i className="legend-income" /> Income <i className="legend-expense" /> Expenses</span>
      </div>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={[{ month: "Monthly", income, expenses: totalExpenses }]} margin={{ top: 15, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f1f1f1" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#f1f1f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#999999" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#999999" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#3b3b3b" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#c4c4c4", fontSize: 14 }} />
            <YAxis tickFormatter={(value) => value >= 1000 ? `₹${Math.round(value / 1000)}k` : `₹${value}`} axisLine={false} tickLine={false} tick={{ fill: "#c4c4c4", fontSize: 13 }} width={52} />
            <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ color: "#f5f5f5", border: "1px solid #454545", borderRadius: 8, backgroundColor: "#171717" }} labelStyle={{ color: "#bdbdbd" }} itemStyle={{ color: "#f5f5f5" }} />
            <Area type="monotone" dataKey="income" stroke="#f1f1f1" strokeWidth={2.5} fill="url(#incomeFill)" />
            <Area type="monotone" dataKey="expenses" stroke="#999999" strokeWidth={2.5} fill="url(#expenseFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
    <section className="panel">
      <div className="panel-heading"><div><h2>Spending breakdown</h2><p>Estimated monthly outgoings</p></div></div>
      {expenses.length ? <div className="spending-chart">
        <div className="donut-box">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={expenses.map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={3}>
                {expenses.map((item, index) => <Cell key={item[0]} fill={pieColors[index % pieColors.length]} />)}
              </Pie>
              <Tooltip formatter={(value) => money(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="spending-legend">
          {expenses.slice(0, 5).map(([name, value], index) => <div key={name}>
            <span style={{ backgroundColor: pieColors[index % pieColors.length] }} />{name}<b>{money(value)}</b>
          </div>)}
        </div>
      </div> : <div className="empty-state compact"><p>Add monthly expenses to see your breakdown.</p><Link to="/profile">Update information</Link></div>}
    </section>
  </>;
}
