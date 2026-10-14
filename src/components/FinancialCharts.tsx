import { Link } from "react-router-dom";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { money } from "../lib/finance";

const pieColors = ["#258269", "#d98b5f", "#597ca1", "#e6b55d", "#7b78ae", "#78aa9b", "#d37b7b", "#8d9baa"];

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
                <stop offset="5%" stopColor="#258269" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#258269" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dd936b" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#dd936b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#edf0ef" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#82908a", fontSize: 12 }} />
            <YAxis tickFormatter={(value) => value >= 1000 ? `₹${Math.round(value / 1000)}k` : `₹${value}`} axisLine={false} tickLine={false} tick={{ fill: "#82908a", fontSize: 11 }} width={45} />
            <Tooltip formatter={(value) => money(Number(value))} />
            <Area type="monotone" dataKey="income" stroke="#258269" strokeWidth={2.5} fill="url(#incomeFill)" />
            <Area type="monotone" dataKey="expenses" stroke="#dd936b" strokeWidth={2.5} fill="url(#expenseFill)" />
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
