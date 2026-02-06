import React, { useState, useEffect } from 'react';
import { organizationsAPI, emailsAPI } from '../services/api';
import OrganizationDetail from './OrganizationDetail';
import { useAuth } from '../context/AuthContext';
import './Organizations.css';

function Organizations() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [senders, setSenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email_domain: '',
    type: 'political',
    notes: ''
  });
  const [bulkAssignData, setBulkAssignData] = useState({
    organizationId: '',
    senderAddress: ''
  });
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [sortBy, setSortBy] = useState('alphabetical');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchOrganizations();
    fetchSenders();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await organizationsAPI.getAll();
      setOrganizations(response.data);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      alert('Error loading organizations: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSenders = async () => {
    try {
      const response = await emailsAPI.getSenders();
      setSenders(response.data);
    } catch (error) {
      console.error('Error fetching senders:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.type) {
      alert('Name and type are required');
      return;
    }

    try {
      if (editingOrg) {
        await organizationsAPI.update(editingOrg.id, formData);
      } else {
        await organizationsAPI.create(formData);
      }

      setFormData({ name: '', email_domain: '', type: 'political', notes: '' });
      setShowForm(false);
      setEditingOrg(null);
      fetchOrganizations();
    } catch (error) {
      console.error('Error saving organization:', error);
      alert('Error saving organization: ' + error.message);
    }
  };

  const handleEdit = (org) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      email_domain: org.email_domain || '',
      type: org.type,
      notes: org.notes || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (org) => {
    if (!window.confirm(`Delete "${org.name}"? All emails will be unassigned from this organization.`)) {
      return;
    }

    try {
      await organizationsAPI.delete(org.id);
      fetchOrganizations();
    } catch (error) {
      console.error('Error deleting organization:', error);
      alert('Error deleting organization: ' + error.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingOrg(null);
    setFormData({ name: '', email_domain: '', type: 'political', notes: '' });
  };

  const handleBulkAssign = async (e) => {
    e.preventDefault();

    if (!bulkAssignData.organizationId || !bulkAssignData.senderAddress) {
      alert('Please select both an organization and a sender');
      return;
    }

    const sender = senders.find(s => s.from_address === bulkAssignData.senderAddress);
    const org = organizations.find(o => o.id === parseInt(bulkAssignData.organizationId));

    if (!window.confirm(
      `Assign ${sender?.email_count || 0} unassigned emails from "${sender?.from_address}" to "${org?.name}"?`
    )) {
      return;
    }

    try {
      const response = await organizationsAPI.bulkAssignBySender(
        parseInt(bulkAssignData.organizationId),
        bulkAssignData.senderAddress
      );

      alert(`Success! ${response.data.emailsUpdated} emails assigned to ${org.name}`);
      setBulkAssignData({ organizationId: '', senderAddress: '' });
      setShowBulkAssign(false);
      await fetchOrganizations(); // Refresh to show updated counts
      await fetchSenders(); // Refresh senders list to show updated state
    } catch (error) {
      console.error('Error bulk assigning:', error);
      const errorMsg = error.response?.data?.error || error.message;
      alert(`Error: ${errorMsg}`);
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      political: '#667eea',
      nonprofit: '#48bb78',
      charity: '#ed8936',
      commercial: '#9f7aea',
      labour_union: '#f56565'
    };
    return colors[type] || '#999';
  };

  const getTypeEmoji = (type) => {
    const emojis = {
      political: '🏛️',
      nonprofit: '🤝',
      charity: '❤️',
      commercial: '💼',
      labour_union: '✊'
    };
    return emojis[type] || '📧';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFilteredAndSortedOrganizations = () => {
    // First, filter by type
    let filtered = [...organizations];
    if (filterType !== 'all') {
      filtered = filtered.filter(org => org.type === filterType);
    }

    // Then, sort the filtered results
    switch (sortBy) {
      case 'alphabetical':
        return filtered.sort((a, b) => a.name.localeCompare(b.name));

      case 'most-recent':
        return filtered.sort((a, b) => {
          if (!a.last_email) return 1;
          if (!b.last_email) return -1;
          return new Date(b.last_email) - new Date(a.last_email);
        });

      case 'earliest-email':
        return filtered.sort((a, b) => {
          if (!a.first_email) return 1;
          if (!b.first_email) return -1;
          return new Date(a.first_email) - new Date(b.first_email);
        });

      case 'most-emails':
        return filtered.sort((a, b) => (b.email_count || 0) - (a.email_count || 0));

      case 'newest-org':
        return filtered.sort((a, b) => {
          if (!a.created_at) return 1;
          if (!b.created_at) return -1;
          return new Date(b.created_at) - new Date(a.created_at);
        });

      default:
        return filtered;
    }
  };

  if (loading) {
    return <div className="loading">Loading organizations...</div>;
  }

  return (
    <div className="organizations-container">
      <div className="organizations-header">
        <h2>Organizations ({organizations.length})</h2>
        <div className="header-buttons">
          <select
            id="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-dropdown"
          >
            <option value="all">All Types</option>
            <option value="political">🏛️ Political</option>
            <option value="nonprofit">🤝 Nonprofit</option>
            <option value="charity">❤️ Charity</option>
            <option value="commercial">💼 Commercial</option>
            <option value="labour_union">✊ Labour Union</option>
          </select>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-dropdown"
          >
            <option value="alphabetical">Alphabetical (A→Z)</option>
            <option value="most-recent">Most Recent</option>
            <option value="earliest-email">Earliest Email</option>
            <option value="most-emails">Most Emails</option>
            <option value="newest-org">Newest Org Added</option>
          </select>
          {user?.isAdmin && (
            <>
              <button
                className="bulk-assign-btn"
                onClick={() => setShowBulkAssign(!showBulkAssign)}
              >
                {showBulkAssign ? 'Cancel' : '⚡ Bulk Assign'}
              </button>
              <button
                className="create-org-btn"
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? 'Cancel' : '+ New Organization'}
              </button>
            </>
          )}
        </div>
      </div>

      {showForm && (
        <div className="org-form-container">
          <h3>{editingOrg ? 'Edit Organization' : 'Create New Organization'}</h3>
          <form onSubmit={handleSubmit} className="org-form">
            <div className="form-group">
              <label>Organization Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Ontario New Democratic Party"
                required
              />
            </div>

            <div className="form-group">
              <label>Email Domain</label>
              <input
                type="text"
                value={formData.email_domain}
                onChange={(e) => setFormData({ ...formData, email_domain: e.target.value })}
                placeholder="e.g., ontariondp.ca"
              />
              <small>Used to auto-match emails from this sender</small>
            </div>

            <div className="form-group">
              <label>Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              >
                <option value="political">🏛️ Political</option>
                <option value="nonprofit">🤝 Nonprofit</option>
                <option value="charity">❤️ Charity</option>
                <option value="commercial">💼 Commercial</option>
                <option value="labour_union">✊ Labour Union</option>
              </select>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about this organization"
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="save-btn">
                {editingOrg ? 'Update' : 'Create'} Organization
              </button>
              <button type="button" onClick={handleCancel} className="cancel-btn">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showBulkAssign && (
        <div className="org-form-container">
          <h3>⚡ Bulk Assign Emails by Sender</h3>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            Assign all emails from a specific sender to an organization at once.
          </p>
          <form onSubmit={handleBulkAssign} className="org-form">
            <div className="form-group">
              <label>Select Sender *</label>
              <select
                value={bulkAssignData.senderAddress}
                onChange={(e) => setBulkAssignData({ ...bulkAssignData, senderAddress: e.target.value })}
                required
              >
                {senders.length === 0 ? (
                  <option value="">-- No unassigned senders available --</option>
                ) : (
                  <>
                    <option value="">-- Choose a sender --</option>
                    {senders.map((sender) => (
                      <option key={sender.from_address} value={sender.from_address}>
                        {sender.from_address} - {sender.email_count} emails{sender.name_count > 1 ? ` (${sender.name_count} names)` : ''}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="form-group">
              <label>Assign to Organization *</label>
              <select
                value={bulkAssignData.organizationId}
                onChange={(e) => setBulkAssignData({ ...bulkAssignData, organizationId: e.target.value })}
                required
              >
                <option value="">-- Choose an organization --</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="save-btn">
                Bulk Assign Emails
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBulkAssign(false);
                  setBulkAssignData({ organizationId: '', senderAddress: '' });
                }}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="organizations-list">
        {organizations.length === 0 ? (
          <div className="empty-state">
            <p>No organizations yet.</p>
            <p>Create your first organization to start categorizing emails!</p>
          </div>
        ) : (
          getFilteredAndSortedOrganizations().map((org) => (
            <div key={org.id} className="org-card">
              <div className="org-card-header">
                <div className="org-title">
                  <span className="org-emoji">{getTypeEmoji(org.type)}</span>
                  <h3
                    onClick={() => setSelectedOrgId(org.id)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view organization details"
                  >
                    {org.name}
                  </h3>
                </div>
                <span
                  className="org-type-badge"
                  style={{ backgroundColor: getTypeColor(org.type) }}
                >
                  {org.type}
                </span>
              </div>

              <div className="org-card-body">
                {org.email_domain && (
                  <div className="org-detail">
                    <strong>Domain:</strong> {org.email_domain}
                  </div>
                )}
                {org.notes && (
                  <div className="org-detail">
                    <strong>Notes:</strong> {org.notes}
                  </div>
                )}
                <div className="org-detail">
                  <strong>Emails:</strong> {org.email_count || 0}
                </div>
                {org.first_email && (
                  <div className="org-detail">
                    <strong>First:</strong> {formatDate(org.first_email)}
                  </div>
                )}
                {org.last_email && (
                  <div className="org-detail">
                    <strong>Latest:</strong> {formatDate(org.last_email)}
                  </div>
                )}
              </div>

              {user?.isAdmin && (
                <div className="org-card-actions">
                  <button onClick={() => handleEdit(org)} className="edit-btn">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(org)} className="delete-btn">
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Organization Detail Modal */}
      {selectedOrgId && (
        <OrganizationDetail
          organizationId={selectedOrgId}
          onClose={() => setSelectedOrgId(null)}
          onViewEmails={(orgId) => {
            // This will reload the page and switch to emails view
            // For now, we'll just close the modal since we're already in org view
            setSelectedOrgId(null);
            alert('To view emails, switch to the Emails tab and filter by this organization');
          }}
        />
      )}
    </div>
  );
}

export default Organizations;
