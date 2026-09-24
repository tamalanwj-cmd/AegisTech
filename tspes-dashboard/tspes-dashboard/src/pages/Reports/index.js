import React from 'react';
import './style.css';

const noop = (e) => { if (e) e.preventDefault(); };

const Reports = () => {
  return (
    <div className="reports-page">
      <div className="page-header">
        <div className="header-title">
          <h1>Reports</h1>
          <p>Exercise performance, participant progress and completion analytics</p>
        </div>
        <div className="header-actions">
          <button className="export-btn" onClick={noop}>Export CSV</button>
          <button className="export-btn" onClick={noop}>Export PDF</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">EXERCISES COMPLETED</div>
            <div className="stat-value">1</div>
            <div className="stat-sub">Of 4 total</div>
          </div>
          <div className="stat-icon completed"></div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">ACTIVE PARTICIPANTS</div>
            <div className="stat-value">30</div>
            <div className="stat-sub">Across all groups</div>
          </div>
          <div className="stat-icon participants"></div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">AVG. COMPLETION</div>
            <div className="stat-value">42%</div>
            <div className="stat-sub">In-progress exercises</div>
          </div>
          <div className="stat-icon completion"></div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">RESPONSE RATE</div>
            <div className="stat-value">78%</div>
            <div className="stat-sub">Responses vs expected</div>
          </div>
          <div className="stat-icon response"></div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">Exercise Completion Rates</div>
          <div className="bar-chart-container">
            <div className="bar-chart-axis">
              <div className="tick tick-100">100%</div>
              <div className="tick tick-75">75%</div>
              <div className="tick tick-50">50%</div>
              <div className="tick tick-25">25%</div>
              <div className="tick tick-0">0%</div>
            </div>
            <div className="bar-wrapper">
              <div className="bar er-alpha"></div>
              <div className="bar-label">ER Alpha</div>
            </div>
            <div className="bar-wrapper">
              <div className="bar cm-beta"></div>
              <div className="bar-label">CM Beta</div>
            </div>
            <div className="bar-wrapper">
              <div className="bar ph-gamma"></div>
              <div className="bar-label">PH Gamma</div>
            </div>
            <div className="bar-wrapper">
              <div className="bar er-alpha2"></div>
              <div className="bar-label">ER Alpha 2</div>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">Participant Activity Trend</div>
          <div className="line-chart-container">
            <div className="line-chart-axis">
              <div className="tick line-tick-36">36</div>
              <div className="tick line-tick-27">27</div>
              <div className="tick line-tick-18">18</div>
              <div className="tick line-tick-9">9</div>
              <div className="tick line-tick-0">0</div>
            </div>
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path className="line-chart-path" d="M7,80 L23,65 L39,75 L55,40 L71,50 L93,10" />
            </svg>
            <div className="line-chart-points">
              <div className="chart-point point-feb"></div>
              <div className="chart-point point-mar"></div>
              <div className="chart-point point-apr"></div>
              <div className="chart-point point-may"></div>
              <div className="chart-point point-jun"></div>
              <div className="chart-point point-jul"></div>
            </div>
            <div className="chart-x-labels">
              <div className="chart-x-label">Feb</div>
              <div className="chart-x-label">Mar</div>
              <div className="chart-x-label">Apr</div>
              <div className="chart-x-label">May</div>
              <div className="chart-x-label">Jun</div>
              <div className="chart-x-label">Jul</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="table-card">
        <div className="chart-title">Exercise Completion Summary</div>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Scenario</th>
              <th>Group</th>
              <th>Participants</th>
              <th>Responses</th>
              <th>Completion</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="exercise-name">ER Alpha — Pandemic Surge Exercise</td>
              <td className="scenario-name">Operation Redline</td>
              <td className="scenario-name">Emergency Response</td>
              <td>12</td>
              <td>8 / 12</td>
              <td>
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: '67%' }}></div>
                </div>
                <span style={{ marginLeft: 8 }}>67%</span>
              </td>
              <td><span className="status-tag in-progress">In Progress</span></td>
            </tr>
            <tr>
              <td className="exercise-name">CM Beta — Infrastructure Exercise</td>
              <td className="scenario-name">Blackout Cascadia</td>
              <td className="scenario-name">Crisis Management</td>
              <td>8</td>
              <td>0 / 8</td>
              <td>
                <div className="progress-bar-container">
                  <div className="progress-bar empty"></div>
                </div>
                <span style={{ marginLeft: 8 }}>0%</span>
              </td>
              <td><span className="status-tag scheduled">Scheduled</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
