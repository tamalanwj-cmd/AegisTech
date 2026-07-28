import React, { useState } from 'react';
import './style.css';

const noop = (e) => { if (e) e.preventDefault(); };

const usersData = [
  { initials: 'DS', name: 'Dr. Sarah Mitchell', email: 's.mitchell@deakin.edu.au', role: 'Participant', roleClass: 'role-participant', group: 'Emergency Response Alpha', status: 'Active', statusClass: 'status-active', joined: '12 Jan 2025' },
  { initials: 'JO', name: 'James Okafor', email: 'j.okafor@deakin.edu.au', role: 'Facilitator', roleClass: 'role-facilitator', group: 'Crisis Management Beta', status: 'Active', statusClass: 'status-active', joined: '3 Feb 2025' },
  { initials: 'PL', name: 'Prof. Lin Wei', email: 'l.wei@deakin.edu.au', role: 'Admin', roleClass: 'role-admin', group: 'All Groups', status: 'Active', statusClass: 'status-active', joined: '15 Nov 2024' },
  { initials: 'AN', name: 'Amara Nwosu', email: 'a.nwosu@deakin.edu.au', role: 'Participant', roleClass: 'role-participant', group: 'Emergency Response Alpha', status: 'Active', statusClass: 'status-active', joined: '20 Mar 2025' },
  { initials: 'TH', name: 'Tom Henriksen', email: 't.henriksen@deakin.edu.au', role: 'Participant', roleClass: 'role-participant', group: 'Public Health Gamma', status: 'Inactive', statusClass: 'status-inactive', joined: '8 Apr 2025' },
  { initials: 'PS', name: 'Priya Sharma', email: 'p.sharma@deakin.edu.au', role: 'Facilitator', roleClass: 'role-facilitator', group: 'Crisis Management Beta', status: 'Active', statusClass: 'status-active', joined: '1 May 2025' },
  { initials: 'MD', name: 'Marcus Delacroix', email: 'm.delacroix@deakin.edu.au', role: 'Participant', roleClass: 'role-participant', group: 'Public Health Gamma', status: 'Active', statusClass: 'status-active', joined: '14 May 2025' },
  { initials: 'SB', name: 'Sophie Beaumont', email: 's.beaumont@deakin.edu.au', role: 'Observer', roleClass: 'role-observer', group: 'Emergency Response Alpha', status: 'Active', statusClass: 'status-active', joined: '22 Jun 2025' },
];

const tabs = ['All', 'Admin', 'Facilitator', 'Participant', 'Observer'];

const Users = () => {
  const [activeTab, setActiveTab] = useState('All');

  const filtered = activeTab === 'All'
    ? usersData
    : usersData.filter((u) => u.role === activeTab);

  return (
    <div className="users-page">
      <div className="page-header">
        <div className="page-title">
          <h1>User Management</h1>
          <p>{usersData.length} registered users</p>
        </div>
        <button className="btn-add-user" onClick={noop}>
          <span>+</span> Add User
        </button>
      </div>

      <div className="container-card">
        <div className="toolbar">
          <input className="search-input" placeholder="Search users..." onChange={noop} />
          <div className="filter-tab-group">
            {tabs.map((tab) => (
              <div
                key={tab}
                className={`filter-tab${activeTab === tab ? ' active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </div>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <div className="table-header-row">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Group</span>
            <span>Status</span>
            <span>Joined</span>
            <span>Actions</span>
          </div>

          {filtered.map((u, i) => (
            <div className="table-row" key={i}>
              <div className="user-name-cell">
                <div className="user-avatar">{u.initials}</div>
                <span>{u.name}</span>
              </div>
              <span className="text-muted">{u.email}</span>
              <span className={`role-badge ${u.roleClass}`}>{u.role}</span>
              <span className="text-muted">{u.group}</span>
              <span className={`status-badge ${u.statusClass}`}>{u.status}</span>
              <span className="text-muted">{u.joined}</span>
              <div className="action-buttons">
                <button className="btn-edit" onClick={noop}>✎</button>
                <button className="btn-delete" onClick={noop}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Users;
