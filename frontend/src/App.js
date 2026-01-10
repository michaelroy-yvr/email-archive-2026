import React, { useState, useEffect } from 'react';
import { emailsAPI, syncAPI, authAPI, organizationsAPI, favoritesAPI, collectionsAPI } from './services/api';
import { useAuth } from './context/AuthContext';
import Organizations from './components/Organizations';
import Dashboard from './components/Dashboard';
import OrganizationDetail from './components/OrganizationDetail';
import Analytics from './components/Analytics';
import LoginModal from './components/LoginModal';
import Collections from './components/Collections';
import Admin from './components/Admin';
import ContactModal from './components/ContactModal';
import './App.css';

function App() {
  const { user, isAuthenticated, logout } = useAuth();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'emails', 'analytics', 'organizations', 'favorites', 'collections', or 'admin'
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);
  const [pagination, setPagination] = useState({});
  const [senders, setSenders] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [searchDebounce, setSearchDebounce] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [favoriteEmailIds, setFavoriteEmailIds] = useState(new Set());
  const [topFavorites, setTopFavorites] = useState([]);
  const [userCollections, setUserCollections] = useState([]);
  const [showAddToCollectionModal, setShowAddToCollectionModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    organizationId: '',
    organizationType: '',
    category: '',
    isGraphicEmail: false,
    hasDonationMatching: false,
    isSupporterRecord: false,
    isContest: false,
    startDate: '',
    endDate: ''
  });

  // Initial mount - only load essential data
  useEffect(() => {
    checkAuth();
    fetchOrganizations(); // Needed for filters across multiple views
    // Don't load emails/senders until user navigates to emails view
  }, []);

  // Lazy load view-specific data when switching views
  useEffect(() => {
    if (currentView === 'emails' && emails.length === 0) {
      fetchEmails();
    }
  }, [currentView]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in input fields (but allow for SELECT dropdowns)
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Allow Ctrl/Cmd+F even in inputs
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
          e.preventDefault();
          document.querySelector('.filter-input')?.focus();
        }
        return;
      }

      // Only apply shortcuts when in emails view
      const isEmailsView = currentView === 'emails';

      // Navigation shortcuts (j/k and arrow keys) - emails view only
      if (isEmailsView && emails.length > 0) {
        if (e.key === 'j' || e.key === 'ArrowDown') {
          e.preventDefault();
          const newIndex = Math.min(selectedIndex + 1, emails.length - 1);
          setSelectedIndex(newIndex);
          // Scroll to keep selected email visible
          setTimeout(() => {
            document.querySelector('.email-item.keyboard-selected')?.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest'
            });
          }, 0);
        } else if (e.key === 'k' || e.key === 'ArrowUp') {
          e.preventDefault();
          const newIndex = Math.max(selectedIndex - 1, 0);
          setSelectedIndex(newIndex);
          // Scroll to keep selected email visible
          setTimeout(() => {
            document.querySelector('.email-item.keyboard-selected')?.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest'
            });
          }, 0);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (emails[selectedIndex]) {
            handleEmailClick(emails[selectedIndex]);
          }
        }
      }

      // Delete/Backspace to clear search
      if ((e.key === 'Delete' || e.key === 'Backspace') && filters.search) {
        e.preventDefault();
        setFilters(prev => ({ ...prev, search: '' }));
        fetchEmails(1, { ...filters, search: '' });
      }

      // Ctrl/Cmd+F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.querySelector('.filter-input')?.focus();
      }

      // Category shortcuts (1-6) - only when viewing an email
      if (selectedEmail && isEmailsView) {
        const categoryMap = {
          '1': 'fundraising',
          '2': 'event',
          '3': 'newsletter',
          '4': 'share',
          '5': 'action',
          '6': 'other'
        };

        if (categoryMap[e.key]) {
          e.preventDefault();
          handleUpdateCategory(selectedEmail.id, categoryMap[e.key]);
        }
      }

      // Tag toggle shortcuts (G, T, S, C) - only when viewing an email and user is admin
      if (selectedEmail && isEmailsView && user?.isAdmin) {
        if (e.key === 'g' || e.key === 'G') {
          e.preventDefault();
          handleToggleTag(selectedEmail.id, 'is_graphic_email');
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          handleToggleTag(selectedEmail.id, 'has_donation_matching');
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          handleToggleTag(selectedEmail.id, 'is_supporter_record');
        } else if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          handleToggleTag(selectedEmail.id, 'is_contest');
        }
      }

      // M to toggle mobile preview (when email is open)
      if (e.key === 'm' && selectedEmail && currentView === 'emails') {
        e.preventDefault();
        setMobilePreview(prev => !prev);
      }

      // D for Dashboard
      if (e.key === 'd' && currentView !== 'dashboard') {
        e.preventDefault();
        setCurrentView('dashboard');
      }

      // E for Emails (only from other views)
      if (e.key === 'e' && currentView !== 'emails') {
        e.preventDefault();
        setCurrentView('emails');
      }

      // Shift+O to open organization dropdown (when email is open)
      // Check this BEFORE the regular 'O' navigation shortcut
      if (e.key.toLowerCase() === 'o' && e.shiftKey && selectedEmail && currentView === 'emails') {
        e.preventDefault();
        // Focus the organization select (second select in metadata-row-inline)
        const selects = document.querySelectorAll('.metadata-field-inline select');
        if (selects.length >= 2) {
          selects[1]?.focus();
        }
      }
      // O for Organizations (only if NOT Shift+O)
      else if (e.key.toLowerCase() === 'o' && !e.shiftKey && currentView !== 'organizations') {
        e.preventDefault();
        setCurrentView('organizations');
      }

      // A for Analytics
      if (e.key === 'a' && currentView !== 'analytics') {
        e.preventDefault();
        setCurrentView('analytics');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, emails, selectedIndex, selectedEmail, filters, mobilePreview, user]);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getStatus();
      setAuthStatus(response.data);
    } catch (error) {
      console.error('Error checking auth:', error);
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

  const fetchOrganizations = async () => {
    try {
      const response = await organizationsAPI.getAll();
      setOrganizations(response.data);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const checkFavorites = async (emailIds) => {
    try {
      const response = await favoritesAPI.checkFavorites(emailIds);
      setFavoriteEmailIds(new Set(response.data.favoriteEmailIds));
    } catch (error) {
      console.error('Error checking favorites:', error);
    }
  };

  const toggleFavorite = async (emailId) => {
    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }

    try {
      const response = await favoritesAPI.toggleFavorite(emailId);
      const { isFavorited } = response.data;

      // Update local state
      setFavoriteEmailIds(prev => {
        const newSet = new Set(prev);
        if (isFavorited) {
          newSet.add(emailId);
        } else {
          newSet.delete(emailId);
        }
        return newSet;
      });

      // Update the email in the list to reflect new favorite count
      setEmails(prevEmails => prevEmails.map(email =>
        email.id === emailId
          ? { ...email, favorite_count: (email.favorite_count || 0) + (isFavorited ? 1 : -1) }
          : email
      ));

      // Update selected email if it's the one being favorited
      if (selectedEmail && selectedEmail.id === emailId) {
        setSelectedEmail(prev => ({
          ...prev,
          favorite_count: (prev.favorite_count || 0) + (isFavorited ? 1 : -1)
        }));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Error toggling favorite: ' + error.message);
    }
  };

  const fetchTopFavorites = async () => {
    try {
      setLoading(true);
      const response = await favoritesAPI.getTopFavorites();
      setTopFavorites(response.data.topFavorites);

      // Check which of the top favorites the current user has favorited
      if (isAuthenticated && response.data.topFavorites.length > 0) {
        checkFavorites(response.data.topFavorites.map(e => e.id));
      }
    } catch (error) {
      console.error('Error fetching top favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCollections = async () => {
    if (!isAuthenticated) {
      setUserCollections([]);
      return;
    }

    try {
      const response = await collectionsAPI.getCollections();
      setUserCollections(response.data.collections);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const handleAddToCollection = async (collectionId) => {
    if (!selectedEmail) return;

    try {
      await collectionsAPI.addEmailToCollection(collectionId, selectedEmail.id);
      setShowAddToCollectionModal(false);
      alert('Email added to collection!');
    } catch (error) {
      console.error('Error adding to collection:', error);
      if (error.response?.status === 409) {
        alert('This email is already in that collection');
      } else {
        alert('Error adding to collection: ' + error.message);
      }
    }
  };

  const openAddToCollectionModal = () => {
    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }

    fetchUserCollections();
    setShowAddToCollectionModal(true);
  };

  const fetchEmails = async (page = 1, filterParams = filters) => {
    try {
      setLoading(true);

      // Build query params, only including non-empty filters
      const params = {
        page,
        limit: 50
      };

      // Use fulltext search for FTS5 full-text search
      if (filterParams.search) params.fulltext = filterParams.search;

      // Handle organization filter
      if (filterParams.organizationId) {
        if (filterParams.organizationId === 'unassigned') {
          params.unassigned = 'true';
        } else {
          params.organizationId = filterParams.organizationId;
        }
      }

      if (filterParams.organizationType) params.organizationType = filterParams.organizationType;
      if (filterParams.category) params.category = filterParams.category;
      if (filterParams.isGraphicEmail) params.isGraphicEmail = 'true';
      if (filterParams.hasDonationMatching) params.hasDonationMatching = 'true';
      if (filterParams.isSupporterRecord) params.isSupporterRecord = 'true';
      if (filterParams.isContest) params.isContest = 'true';
      if (filterParams.startDate) params.startDate = filterParams.startDate;
      if (filterParams.endDate) params.endDate = filterParams.endDate;

      const response = await emailsAPI.getEmails(params);
      setEmails(response.data.emails);
      setPagination(response.data.pagination);
      setSelectedIndex(0); // Reset keyboard selection when emails change

      // Check which emails are favorited (only if user is authenticated)
      if (isAuthenticated && response.data.emails.length > 0) {
        checkFavorites(response.data.emails.map(e => e.id));
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailClick = async (email) => {
    try {
      const response = await emailsAPI.getEmail(email.id);
      setSelectedEmail(response.data.email);
    } catch (error) {
      console.error('Error fetching email details:', error);
    }
  };

  const handleSync = async () => {
    if (!authStatus?.authenticated) {
      const response = await authAPI.getAuthUrl();
      window.open(response.data.authUrl, '_blank');
      return;
    }

    try {
      setSyncing(true);
      await syncAPI.startSync({ maxEmails: 10 });
      alert('Sync started! This will run in the background. Refresh the page in a minute to see new emails.');
    } catch (error) {
      console.error('Error starting sync:', error);
      alert('Error starting sync: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleFilterChange = (field, value) => {
    const newFilters = {
      ...filters,
      [field]: value
    };
    setFilters(newFilters);

    // Auto-search for fulltext queries (debounced)
    if (field === 'search') {
      if (searchDebounce) clearTimeout(searchDebounce);
      const timeout = setTimeout(() => {
        fetchEmails(1, newFilters);
      }, 300); // 300ms debounce
      setSearchDebounce(timeout);
    }
  };

  const applyFilters = () => {
    fetchEmails(1, filters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      search: '',
      organizationId: '',
      organizationType: '',
      category: '',
      isGraphicEmail: false,
      hasDonationMatching: false,
      isSupporterRecord: false,
      isContest: false,
      startDate: '',
      endDate: ''
    };
    setFilters(emptyFilters);
    fetchEmails(1, emptyFilters);
  };

  const handleQuickDateFilter = (range) => {
    const now = new Date();
    let startDate = '';
    let endDate = now.toISOString().split('T')[0]; // Today in YYYY-MM-DD

    switch (range) {
      case 'today':
        startDate = endDate;
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = monthStart.toISOString().split('T')[0];
        break;
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        startDate = yearStart.toISOString().split('T')[0];
        break;
      default:
        break;
    }

    const newFilters = {
      ...filters,
      startDate,
      endDate
    };
    setFilters(newFilters);
    fetchEmails(1, newFilters);
  };

  const handleOrganizationClick = (orgId) => {
    setSelectedOrgId(orgId);
  };

  const handleViewOrgEmails = (orgId) => {
    const newFilters = {
      ...filters,
      organizationId: orgId.toString()
    };
    setFilters(newFilters);
    setCurrentView('emails');
    fetchEmails(1, newFilters);
  };

  const handleApplyAnalyticsFilters = (analyticsFilters) => {
    // Convert analytics filters to email filters format
    const newFilters = {
      search: '',
      organizationId: analyticsFilters.organizationId || '',
      organizationType: analyticsFilters.organizationType || '',
      startDate: analyticsFilters.startDate || '',
      endDate: analyticsFilters.endDate || ''
    };
    setFilters(newFilters);
    setCurrentView('emails');
    fetchEmails(1, newFilters);
  };

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 2000);
  };

  const handleAssignOrganization = async (emailId, organizationId) => {
    try {
      const orgId = organizationId === '' ? null : parseInt(organizationId);
      await organizationsAPI.assignEmail(emailId, orgId);

      // Find the current email's index in the list
      const currentIndex = emails.findIndex(email => email.id === emailId);

      // Refresh the email list first
      await fetchEmails(pagination.page, filters);

      // Automatically select the next email in the list
      if (currentIndex >= 0 && currentIndex < emails.length - 1) {
        // There's a next email - select it
        const nextIndex = currentIndex + 1;
        setSelectedIndex(nextIndex);

        // Small delay to ensure emails array is updated
        setTimeout(() => {
          if (emails[nextIndex]) {
            handleEmailClick(emails[nextIndex]);
          }
        }, 100);
      } else if (currentIndex === emails.length - 1 && emails.length > 1) {
        // This was the last email - go back to the previous one
        const prevIndex = currentIndex - 1;
        setSelectedIndex(prevIndex);

        setTimeout(() => {
          if (emails[prevIndex]) {
            handleEmailClick(emails[prevIndex]);
          }
        }, 100);
      } else {
        // Just refresh the current email
        const response = await emailsAPI.getEmail(emailId);
        setSelectedEmail(response.data.email);
      }

      showToast('Organization assigned ✓');
    } catch (error) {
      console.error('Error assigning organization:', error);
      alert('Error assigning organization: ' + error.message);
    }
  };

  const handleUpdateCategory = async (emailId, category) => {
    try {
      const cat = category === '' ? null : category;
      await emailsAPI.updateCategory(emailId, cat);

      // Refresh the email list
      await fetchEmails(pagination.page, filters);

      // Just refresh the current email without auto-advancing
      const response = await emailsAPI.getEmail(emailId);
      setSelectedEmail(response.data.email);

      showToast('Category updated ✓');
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Error updating category: ' + error.message);
    }
  };

  const handleToggleTag = async (emailId, tag) => {
    try {
      const response = await emailsAPI.toggleTag(emailId, tag);
      const newValue = response.data.value;

      // Update the selected email locally
      setSelectedEmail(prev => ({
        ...prev,
        [tag]: newValue
      }));

      // Also refresh the email list
      fetchEmails(pagination.page, filters);

      // Show toast notification
      const tagNames = {
        'is_graphic_email': 'Graphic Email',
        'has_donation_matching': 'Donation Matching',
        'is_supporter_record': 'Supporter Record',
        'is_contest': 'Contest'
      };
      showToast(`${tagNames[tag]} ${newValue === 1 ? 'added' : 'removed'} ✓`);
    } catch (error) {
      console.error('Error toggling tag:', error);
      alert(`Error toggling tag: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleRemoveTag = async (emailId, tag) => {
    try {
      console.log('Removing tag:', tag, 'from email:', emailId);
      const response = await emailsAPI.removeTag(emailId, tag);
      console.log('Tag removed successfully:', response);

      // Update the selected email locally to remove the tag
      setSelectedEmail(prev => ({
        ...prev,
        [tag]: 0
      }));

      // Also refresh the email list
      fetchEmails(pagination.page, filters);
    } catch (error) {
      console.error('Error removing tag:', error);
      console.error('Error details:', error.response?.data);
      alert(`Error removing tag: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleDeleteEmail = async (emailId) => {
    if (!window.confirm('Are you sure you want to delete this email? This action cannot be undone.')) {
      return;
    }

    try {
      await emailsAPI.deleteEmail(emailId);

      // Find the current email's index in the list
      const currentIndex = emails.findIndex(email => email.id === emailId);

      // Close the email detail view
      setSelectedEmail(null);

      // Refresh the email list
      await fetchEmails(pagination.page, filters);

      // Automatically select the next email in the list if available
      if (currentIndex >= 0 && currentIndex < emails.length - 1) {
        const nextIndex = currentIndex;
        setSelectedIndex(nextIndex);

        setTimeout(() => {
          if (emails[nextIndex]) {
            handleEmailClick(emails[nextIndex]);
          }
        }, 100);
      } else if (currentIndex > 0) {
        // Go to previous email if this was the last one
        const prevIndex = currentIndex - 1;
        setSelectedIndex(prevIndex);

        setTimeout(() => {
          if (emails[prevIndex]) {
            handleEmailClick(emails[prevIndex]);
          }
        }, 100);
      }

      showToast('Email deleted ✓');
    } catch (error) {
      console.error('Error deleting email:', error);
      alert(`Error deleting email: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>📧 Email Archive</h1>
        <div className="header-info">
          {/* Admin controls */}
          {user?.isAdmin && (
            <>
              {authStatus?.authenticated ? (
                <span className="auth-status">✓ Gmail: {authStatus.email}</span>
              ) : (
                <span className="auth-status">⚠ Not connected</span>
              )}
              <button onClick={handleSync} disabled={syncing} className="sync-button">
                {syncing ? 'Syncing...' : authStatus?.authenticated ? 'Sync Emails' : 'Connect Gmail'}
              </button>
            </>
          )}

          {/* Get in Touch Button */}
          <button onClick={() => setContactModalOpen(true)} className="contact-button">
            Get in Touch
          </button>

          {/* User Menu */}
          <div className="user-menu">
            {isAuthenticated ? (
              <>
                <span className="user-name">👤 {user.name}{user.isAdmin && ' (Admin)'}</span>
                <button onClick={logout} className="logout-button">
                  Logout
                </button>
              </>
            ) : (
              <button onClick={() => setLoginModalOpen(true)} className="login-button">
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button
          className={`tab-button ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`tab-button ${currentView === 'emails' ? 'active' : ''}`}
          onClick={() => setCurrentView('emails')}
        >
          📧 Emails
        </button>
        <button
          className={`tab-button ${currentView === 'analytics' ? 'active' : ''}`}
          onClick={() => setCurrentView('analytics')}
        >
          📈 Analytics
        </button>
        <button
          className={`tab-button ${currentView === 'organizations' ? 'active' : ''}`}
          onClick={() => setCurrentView('organizations')}
        >
          🏢 Organizations
        </button>
        <button
          className={`tab-button ${currentView === 'favorites' ? 'active' : ''}`}
          onClick={() => {
            setCurrentView('favorites');
            fetchTopFavorites();
          }}
        >
          ❤️ Top Favorites
        </button>
        <button
          className={`tab-button ${currentView === 'collections' ? 'active' : ''}`}
          onClick={() => setCurrentView('collections')}
        >
          📚 My Collections
        </button>
        {user?.isAdmin && (
          <button
            className={`tab-button ${currentView === 'admin' ? 'active' : ''}`}
            onClick={() => setCurrentView('admin')}
          >
            👑 Admin
          </button>
        )}
      </div>

      {currentView === 'dashboard' ? (
        <Dashboard />
      ) : currentView === 'analytics' ? (
        <Analytics
          organizations={organizations}
          onApplyFiltersToEmails={handleApplyAnalyticsFilters}
        />
      ) : currentView === 'organizations' ? (
        <Organizations />
      ) : currentView === 'collections' ? (
        <Collections onViewEmails={(collection) => {
          // TODO: Implement viewing emails from a collection
          alert(`Viewing emails from: ${collection.name}`);
        }} />
      ) : currentView === 'admin' ? (
        <Admin />
      ) : currentView === 'favorites' ? (
        <div className="favorites-view">
          <div className="favorites-header">
            <h2>❤️ Top 10 Most Favorited Emails</h2>
            <p className="favorites-subtitle">These are the emails that the community loves most!</p>
          </div>

          {loading ? (
            <div className="loading">Loading favorites...</div>
          ) : topFavorites.length === 0 ? (
            <div className="no-favorites">
              <p>No favorited emails yet. Be the first to favorite an email!</p>
            </div>
          ) : (
            <div className="favorites-grid">
              {topFavorites.map((email) => (
                <div
                  key={email.id}
                  className="favorite-card"
                  onClick={() => {
                    setCurrentView('emails');
                    handleEmailClick(email);
                  }}
                >
                  <div className="favorite-card-header">
                    <div className="favorite-rank">#{topFavorites.indexOf(email) + 1}</div>
                    <button
                      className={`favorite-heart ${favoriteEmailIds.has(email.id) ? 'favorited' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(email.id);
                      }}
                      title={favoriteEmailIds.has(email.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      ♥
                    </button>
                  </div>
                  <div className="favorite-card-content">
                    <h3>{email.subject}</h3>
                    <p className="favorite-from">{email.from_name || email.from_address}</p>
                    <p className="favorite-date">{new Date(email.date_received).toLocaleDateString()}</p>
                    <div className="favorite-stats">
                      <span className="favorite-count-badge">❤️ {email.favorite_count} {email.favorite_count === 1 ? 'favorite' : 'favorites'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="main-content">
        <div className="email-list-panel">
          <div className="inbox-header">
            <h2>Inbox ({pagination.total || 0})</h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="toggle-filters-btn"
              title={showFilters ? "Hide filters" : "Show filters"}
            >
              {showFilters ? '▼ Hide Filters' : '▶ Show Filters'}
            </button>
          </div>

          {/* Filter Controls */}
          {showFilters && (
            <div className="filter-controls">
              <input
                type="text"
                placeholder="Search emails (subject, body, sender)..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="filter-input"
              />

              <select
                value={filters.organizationId}
                onChange={(e) => handleFilterChange('organizationId', e.target.value)}
                className="filter-select"
              >
                <option value="">All Organizations</option>
                <option value="unassigned">📭 Unassigned</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.email_count || 0} emails)
                  </option>
                ))}
              </select>

              <select
                value={filters.organizationType}
                onChange={(e) => handleFilterChange('organizationType', e.target.value)}
                className="filter-select"
              >
                <option value="">All Types</option>
                <option value="nonprofit">Nonprofit</option>
                <option value="charity">Charity</option>
                <option value="political">Political</option>
                <option value="commercial">Commercial</option>
                <option value="labour_union">Labour Union</option>
              </select>

              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="filter-select"
              >
                <option value="">All Categories</option>
                <option value="fundraising">💰 Fundraising</option>
                <option value="event">📅 Event</option>
                <option value="newsletter">📰 Newsletter</option>
                <option value="share">📢 Share</option>
                <option value="action">✊ Action</option>
                <option value="other">📋 Other</option>
              </select>

              {/* Tag Filters */}
              <div className="tag-filters">
                <label className="tag-filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.isGraphicEmail}
                    onChange={(e) => handleFilterChange('isGraphicEmail', e.target.checked)}
                  />
                  <span>🖼️ Graphic</span>
                </label>
                <label className="tag-filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.hasDonationMatching}
                    onChange={(e) => handleFilterChange('hasDonationMatching', e.target.checked)}
                  />
                  <span>🔄 Matching</span>
                </label>
                <label className="tag-filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.isSupporterRecord}
                    onChange={(e) => handleFilterChange('isSupporterRecord', e.target.checked)}
                  />
                  <span>📊 Supporter</span>
                </label>
                <label className="tag-filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.isContest}
                    onChange={(e) => handleFilterChange('isContest', e.target.checked)}
                  />
                  <span>🏆 Contest</span>
                </label>
              </div>

              {/* Quick Date Filters */}
              <div className="quick-date-filters">
                <button onClick={() => handleQuickDateFilter('today')} className="quick-date-btn">
                  Today
                </button>
                <button onClick={() => handleQuickDateFilter('week')} className="quick-date-btn">
                  Last 7 days
                </button>
                <button onClick={() => handleQuickDateFilter('month')} className="quick-date-btn">
                  This month
                </button>
                <button onClick={() => handleQuickDateFilter('year')} className="quick-date-btn">
                  This year
                </button>
              </div>

              {/* Date Range Inputs */}
              <div className="date-range-inputs">
                <div className="date-input-group">
                  <label>From:</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="date-input"
                  />
                </div>
                <div className="date-input-group">
                  <label>To:</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="date-input"
                  />
                </div>
              </div>

              <div className="filter-buttons">
                <button onClick={applyFilters} className="apply-filter-btn">
                  Apply Filters
                </button>
                <button onClick={clearFilters} className="clear-filter-btn">
                  Clear
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading">Loading...</div>
          ) : (
            <>
              {/* Stats Summary Bar */}
              <div className="stats-summary">
                <div className="result-count">
                  {pagination.total > 0 ? (
                    <>
                      Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()} emails
                    </>
                  ) : (
                    'No emails found'
                  )}
                </div>
                {(filters.search || filters.organizationId || filters.organizationType || filters.category || filters.startDate || filters.endDate) && (
                  <div className="active-filters">
                    {filters.search && <span className="filter-badge">🔍 Search: "{filters.search}"</span>}
                    {filters.organizationId && filters.organizationId !== 'unassigned' && (
                      <span className="filter-badge">
                        🏢 {organizations.find(o => o.id === parseInt(filters.organizationId))?.name || 'Organization'}
                      </span>
                    )}
                    {filters.organizationId === 'unassigned' && <span className="filter-badge">📭 Unassigned</span>}
                    {filters.organizationType && <span className="filter-badge">🏷️ {filters.organizationType}</span>}
                    {filters.category && <span className="filter-badge">📂 {filters.category}</span>}
                    {(filters.startDate || filters.endDate) && (
                      <span className="filter-badge">
                        📅 {filters.startDate || '...'} to {filters.endDate || '...'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="email-list">
                {emails.map((email, index) => (
                  <div
                    key={email.id}
                    className={`email-item ${selectedEmail?.id === email.id ? 'selected' : ''} ${index === selectedIndex ? 'keyboard-selected' : ''}`}
                    onClick={() => {
                      setSelectedIndex(index);
                      handleEmailClick(email);
                    }}
                  >
                    <div className="email-header-row">
                      <div className="email-from">{email.from_name || email.from_address}</div>
                      <button
                        className={`favorite-heart ${favoriteEmailIds.has(email.id) ? 'favorited' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(email.id);
                        }}
                        title={favoriteEmailIds.has(email.id) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        ♥
                      </button>
                    </div>
                    <div className="email-subject">{email.subject}</div>
                    {email.snippet && (
                      <div
                        className="email-snippet"
                        dangerouslySetInnerHTML={{ __html: email.snippet }}
                      />
                    )}
                    <div className="email-meta">
                      <span>{new Date(email.date_received).toLocaleDateString()}</span>
                      <div className="badges-container">
                        {email.category && (
                          <span className="category-badge" title={`Category: ${email.category}`}>
                            {email.category === 'fundraising' && '💰'}
                            {email.category === 'event' && '📅'}
                            {email.category === 'newsletter' && '📰'}
                            {email.category === 'share' && '📢'}
                            {email.category === 'action' && '✊'}
                            {email.category === 'other' && '📋'}
                            {' '}{email.category}
                          </span>
                        )}
                        {email.is_graphic_email === 1 && (
                          <span className="tag-badge tag-graphic" title="Graphic email (primarily images)">
                            🖼️
                          </span>
                        )}
                        {email.has_donation_matching === 1 && (
                          <span className="tag-badge tag-matching" title="Has donation matching">
                            🔄
                          </span>
                        )}
                        {email.is_supporter_record === 1 && (
                          <span className="tag-badge tag-supporter" title="Supporter record">
                            📊
                          </span>
                        )}
                        {email.is_contest === 1 && (
                          <span className="tag-badge tag-contest" title="Contest">
                            🏆
                          </span>
                        )}
                        {email.organization_name && (
                          <span
                            className="org-badge-clickable"
                            onClick={(e) => {
                              e.stopPropagation();
                              const orgId = organizations.find(o => o.name === email.organization_name)?.id;
                              if (orgId) handleOrganizationClick(orgId);
                            }}
                            title="Click to view organization details"
                          >
                            🏢 {email.organization_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {pagination.pages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => fetchEmails(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </button>
                  <span>Page {pagination.page} of {pagination.pages}</span>
                  <button
                    onClick={() => fetchEmails(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="email-viewer-panel">
          {selectedEmail ? (
            <>
              {mobilePreview ? (
                <div className={`email-content-container mobile-preview`}>
                  <button
                    onClick={() => setMobilePreview(false)}
                    className="preview-toggle-btn active"
                    title="Switch to desktop view"
                  >
                    📱
                  </button>
                  <div className="mobile-frame">
                    <iframe
                      title="Email Content"
                      src={emailsAPI.getEmailHtml(selectedEmail.id)}
                      sandbox="allow-same-origin"
                      className="mobile-iframe"
                    />
                  </div>
                </div>
              ) : (
                <div className="email-content-container">
                  <div className="email-header-compact">
                    <div className="header-top-row">
                      <h3>{selectedEmail.subject}</h3>
                      <div className="header-action-buttons">
                        <button
                          className={`favorite-heart-large ${favoriteEmailIds.has(selectedEmail.id) ? 'favorited' : ''}`}
                          onClick={() => toggleFavorite(selectedEmail.id)}
                          title={favoriteEmailIds.has(selectedEmail.id) ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          ♥
                          <span className="favorite-count">{selectedEmail.favorite_count || 0}</span>
                        </button>
                        <button
                          onClick={() => setMobilePreview(true)}
                          className="preview-toggle-btn"
                          title="Switch to mobile view"
                        >
                          📱
                        </button>
                        <button
                          onClick={openAddToCollectionModal}
                          className="add-to-collection-btn-compact"
                          title="Add this email to a collection"
                        >
                          📚
                        </button>
                        {user?.isAdmin && (
                          <>
                            <button
                              onClick={() => handleToggleTag(selectedEmail.id, 'is_graphic_email')}
                              className={`tag-toggle-btn ${selectedEmail.is_graphic_email === 1 ? 'active' : ''}`}
                              title={selectedEmail.is_graphic_email === 1 ? 'Remove Graphic Email tag' : 'Add Graphic Email tag'}
                            >
                              🖼️
                            </button>
                            <button
                              onClick={() => handleToggleTag(selectedEmail.id, 'has_donation_matching')}
                              className={`tag-toggle-btn ${selectedEmail.has_donation_matching === 1 ? 'active' : ''}`}
                              title={selectedEmail.has_donation_matching === 1 ? 'Remove Donation Matching tag' : 'Add Donation Matching tag'}
                            >
                              🔄
                            </button>
                            <button
                              onClick={() => handleToggleTag(selectedEmail.id, 'is_supporter_record')}
                              className={`tag-toggle-btn ${selectedEmail.is_supporter_record === 1 ? 'active' : ''}`}
                              title={selectedEmail.is_supporter_record === 1 ? 'Remove Supporter Record tag' : 'Add Supporter Record tag'}
                            >
                              📊
                            </button>
                            <button
                              onClick={() => handleToggleTag(selectedEmail.id, 'is_contest')}
                              className={`tag-toggle-btn ${selectedEmail.is_contest === 1 ? 'active' : ''}`}
                              title={selectedEmail.is_contest === 1 ? 'Remove Contest tag' : 'Add Contest tag'}
                            >
                              🏆
                            </button>
                            <button
                              onClick={() => handleDeleteEmail(selectedEmail.id)}
                              className="delete-email-btn"
                              title="Delete this email"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="from-line"><strong>From:</strong> {selectedEmail.from_name} &lt;{selectedEmail.from_address}&gt;</p>
                    <p className="date-line"><strong>Date:</strong> {new Date(selectedEmail.date_received).toLocaleString()}</p>
                    <div className="metadata-row-inline">
                      <div className="metadata-field-inline">
                        <label>
                          Category:
                          <span className="keyboard-hint" title="Keyboard shortcuts: 1=Fundraising, 2=Event, 3=Newsletter, 4=Share, 5=Action, 6=Other">
                            ⌨️
                          </span>
                        </label>
                        <select
                          value={selectedEmail.category || ''}
                          onChange={(e) => handleUpdateCategory(selectedEmail.id, e.target.value)}
                          className="metadata-select"
                        >
                          <option value="">-- Not Categorized --</option>
                          <option value="fundraising">💰 Fundraising (1)</option>
                          <option value="event">📅 Event (2)</option>
                          <option value="newsletter">📰 Newsletter (3)</option>
                          <option value="share">📢 Share (4)</option>
                          <option value="action">✊ Action (5)</option>
                          <option value="other">📋 Other (6)</option>
                        </select>
                        {selectedEmail.classification_confidence && (
                          <span className="confidence-indicator" title={`AI Confidence: ${(selectedEmail.classification_confidence * 100).toFixed(0)}%`}>
                            AI: {(selectedEmail.classification_confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <div className="metadata-field-inline">
                        <label>Organization:</label>
                        <select
                          value={selectedEmail.organization_id || ''}
                          onChange={(e) => handleAssignOrganization(selectedEmail.id, e.target.value)}
                          className="metadata-select"
                        >
                          <option value="">-- No Organization --</option>
                          {organizations.map((org) => (
                            <option key={org.id} value={org.id}>
                              {org.name} ({org.type})
                            </option>
                          ))}
                        </select>
                        {selectedEmail.organization_id && (
                          <button
                            onClick={() => handleOrganizationClick(selectedEmail.organization_id)}
                            className="view-org-btn-compact"
                            title="View organization details"
                          >
                            ⓘ
                          </button>
                        )}
                      </div>
                    </div>
                      {(selectedEmail.is_graphic_email || selectedEmail.has_donation_matching || selectedEmail.is_supporter_record || selectedEmail.is_contest) && (
                        <div className="tags-row">
                          <label>Tags:</label>
                          <div className="tags-list">
                            {selectedEmail.is_graphic_email === 1 && (
                              <span className="tag-badge tag-graphic" title="Graphic email (primarily images)">
                                🖼️ Graphic Email
                                {user?.isAdmin && (
                                  <button
                                    className="tag-remove-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveTag(selectedEmail.id, 'is_graphic_email');
                                    }}
                                    title="Remove tag"
                                  >×</button>
                                )}
                              </span>
                            )}
                            {selectedEmail.has_donation_matching === 1 && (
                              <span className="tag-badge tag-matching" title="Has donation matching (2X, 3X, etc.)">
                                🔄 Donation Matching
                                {user?.isAdmin && (
                                  <button
                                    className="tag-remove-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveTag(selectedEmail.id, 'has_donation_matching');
                                    }}
                                    title="Remove tag"
                                  >×</button>
                                )}
                              </span>
                            )}
                            {selectedEmail.is_supporter_record === 1 && (
                              <span className="tag-badge tag-supporter" title="Shows donation history or supporter status">
                                📊 Supporter Record
                                {user?.isAdmin && (
                                  <button
                                    className="tag-remove-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveTag(selectedEmail.id, 'is_supporter_record');
                                    }}
                                    title="Remove tag"
                                  >×</button>
                                )}
                              </span>
                            )}
                            {selectedEmail.is_contest === 1 && (
                              <span className="tag-badge tag-contest" title="Contest or giveaway">
                                🏆 Contest
                                {user?.isAdmin && (
                                  <button
                                    className="tag-remove-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveTag(selectedEmail.id, 'is_contest');
                                    }}
                                    title="Remove tag"
                                  >×</button>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                  </div>
                  <iframe
                    title="Email Content"
                    src={emailsAPI.getEmailHtml(selectedEmail.id)}
                    sandbox="allow-same-origin"
                    style={{ width: '100%', minHeight: '800px', border: 'none' }}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="no-selection">
              <p>Select an email to view its content</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Organization Detail Modal */}
      {selectedOrgId && (
        <OrganizationDetail
          organizationId={selectedOrgId}
          onClose={() => setSelectedOrgId(null)}
          onViewEmails={handleViewOrgEmails}
        />
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />

      {/* Add to Collection Modal */}
      {showAddToCollectionModal && (
        <div className="modal-overlay" onClick={() => setShowAddToCollectionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAddToCollectionModal(false)}>&times;</button>

            <h2>Add to Collection</h2>

            {userCollections.length === 0 ? (
              <div className="no-collections-modal">
                <p>You don't have any collections yet.</p>
                <button
                  onClick={() => {
                    setShowAddToCollectionModal(false);
                    setCurrentView('collections');
                  }}
                  className="create-collection-btn"
                >
                  Create a Collection
                </button>
              </div>
            ) : (
              <div className="collections-list-modal">
                <p className="modal-subtitle">Select a collection to add this email to:</p>
                {userCollections.map((collection) => (
                  <button
                    key={collection.id}
                    onClick={() => handleAddToCollection(collection.id)}
                    className="collection-item-btn"
                  >
                    <span className="collection-name">📚 {collection.name}</span>
                    <span className="collection-count">{collection.email_count || 0} emails</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact Modal */}
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />

      {/* Toast Notification */}
      {toast.show && (
        <div className="toast-notification">
          {toast.message}
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <p>
          Created by <a href="https://michaelroy.ca" target="_blank" rel="noopener noreferrer">Michael Roy</a>, January 2026
        </p>
      </footer>
    </div>
  );
}

export default App;
