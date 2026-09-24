import React from 'react';
import './style.css';

const coursesData = [
  {
    title: 'Introduction to Crisis Management',
    desc: 'Foundational principles of crisis response and decision-making under pressure.',
    status: 'active',
    scenarios: 3,
    enrolled: 28,
    date: '15 Jan 2025',
  },
  {
    title: 'Emergency Operations Centre Management',
    desc: 'Establishing and managing EOCs during large-scale emergencies.',
    status: 'active',
    scenarios: 5,
    enrolled: 14,
    date: '1 Mar 2025',
  },
  {
    title: 'Public Health Emergency Response',
    desc: 'Disease outbreak containment, public communication and resource allocation.',
    status: 'draft',
    scenarios: 4,
    enrolled: 19,
    date: '20 Apr 2025',
  },
  {
    title: 'Cyber Resilience and Incident Response',
    desc: 'Responding to cyber attacks and critical infrastructure failures.',
    status: 'archived',
    scenarios: 2,
    enrolled: 0,
    date: '3 Jun 2025',
  },
];

const noop = (e) => { if (e) e.preventDefault(); };

const Courses = () => {
  return (
    <div className="courses-page">
      <div className="page-header">
        <div className="header-title">
          <h1>Course Management</h1>
          <p>Organise scenarios into structured learning courses</p>
        </div>
        <button className="create-course-btn" onClick={noop}>Create Course</button>
      </div>

      <div className="courses-grid">
        {coursesData.map((course, idx) => (
          <div key={idx} className={`course-card${course.status === 'archived' ? ' archived' : ''}`}>
            <div className={`status-badge ${course.status}`}>
              {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
            </div>
            <h2 className="course-title">{course.title}</h2>
            <p className="course-desc">{course.desc}</p>
            <div className="course-meta">
              <div className="meta-item scenarios">{course.scenarios} scenarios</div>
              <div className="meta-item enrolled">{course.enrolled} enrolled</div>
              <div className="meta-item date">{course.date}</div>
            </div>
            <div className="card-actions">
              <div className="left-actions">
                <button className="btn btn-edit" onClick={noop}>Edit</button>
                <button className="btn btn-archive" onClick={noop}>Archive</button>
              </div>
              <button className="btn-preview" onClick={noop}>Preview</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Courses;
