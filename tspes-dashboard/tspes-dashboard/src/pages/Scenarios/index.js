import React, { useState } from 'react';
import './style.css';

const scenariosData = [
  {
    title: 'Operation Redline — Pandemic Surge',
    desc: 'A novel respiratory pathogen has spread to three major metropolitan areas. Health syste...',
    category: 'public-health',
    categoryLabel: 'Public Health',
    injects: 5,
    status: 'published',
    date: '20 Feb 2025',
  },
  {
    title: 'Blackout Cascadia — Infrastructure Failure',
    desc: 'Simultaneous failure of the power grid across an entire state has triggered cascading fail...',
    category: 'infrastructure',
    categoryLabel: 'Infrastructure',
    injects: 4,
    status: 'published',
    date: '5 Mar 2025',
  },
  {
    title: 'Storm Watch Bravo — Extreme Weather Event',
    desc: 'Category 5 cyclone tracking toward a major coastal city. Evacuation, shelter managemen...',
    category: 'natural-disaster',
    categoryLabel: 'Natural Disaster',
    injects: 3,
    status: 'draft',
    date: '18 Apr 2025',
  },
  {
    title: 'Silent Breach — Cyber Attack on Critical Infrastructure',
    desc: 'Sophisticated threat actor has compromised SCADA systems at water treatment facilities...',
    category: 'cybersecurity',
    categoryLabel: 'Cybersecurity',
    injects: 6,
    status: 'published',
    date: '2 Jun 2025',
  },
];

const tabs = ['All', 'Public Health', 'Infrastructure', 'Natural Disaster', 'Cybersecurity'];

const noop = (e) => { if (e) e.preventDefault(); };

const Scenarios = () => {
  const [activeTab, setActiveTab] = useState('All');

  const filtered = activeTab === 'All'
    ? scenariosData
    : scenariosData.filter((s) => s.categoryLabel === activeTab);

  return (
    <div className="scenarios-page">
      <div className="page-header">
        <div className="header-title">
          <h1>Scenario Management</h1>
          <p>Create, edit and publish tabletop exercise scenarios</p>
        </div>
        <div className="header-actions">
          <button className="btn-open-builder" onClick={noop}>Open Builder</button>
          <button className="btn-new-scenario" onClick={noop}>New Scenario</button>
        </div>
      </div>

      <div className="table-container">
        <div className="filter-bar">
          <div className="search-box">
            <input type="text" placeholder="Search scenarios..." />
          </div>
          <div className="filter-tabs">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`tab-btn${activeTab === tab ? ' active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <table className="scenario-table">
          <thead>
            <tr>
              <th>Title & Description</th>
              <th>Category</th>
              <th>Injects</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((scenario, idx) => (
              <tr key={idx}>
                <td>
                  <div className="scenario-title">{scenario.title}</div>
                  <div className="scenario-desc">{scenario.desc}</div>
                </td>
                <td>
                  <span className={`category-tag ${scenario.category}`}>
                    {scenario.categoryLabel}
                  </span>
                </td>
                <td className="table-cell-center">{scenario.injects}</td>
                <td>
                  <span className={`status-tag ${scenario.status}`}>
                    {scenario.status.charAt(0).toUpperCase() + scenario.status.slice(1)}
                  </span>
                </td>
                <td className="table-cell-date">{scenario.date}</td>
                <td className="table-cell-actions">
                  <button className="action-btn" onClick={noop}>···</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Scenarios;
