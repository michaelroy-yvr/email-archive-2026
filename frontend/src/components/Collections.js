import React, { useState, useEffect } from 'react';
import { collectionsAPI, favoritesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Collections.css';

const Collections = ({ onViewEmails }) => {
    const { isAuthenticated } = useAuth();
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCollection, setEditingCollection] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [likedEmailsCount, setLikedEmailsCount] = useState(0);

    useEffect(() => {
        if (isAuthenticated) {
            fetchCollections();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const fetchCollections = async () => {
        try {
            setLoading(true);
            const [collectionsRes, favoritesRes] = await Promise.all([
                collectionsAPI.getCollections(),
                favoritesAPI.getMyFavorites()
            ]);
            setCollections(collectionsRes.data.collections);
            setLikedEmailsCount(favoritesRes.data.favorites?.length || 0);
        } catch (error) {
            console.error('Error fetching collections:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await collectionsAPI.createCollection(formData);
            setFormData({ name: '', description: '' });
            setShowCreateModal(false);
            fetchCollections();
        } catch (error) {
            console.error('Error creating collection:', error);
            alert('Error creating collection: ' + error.message);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await collectionsAPI.updateCollection(editingCollection.id, formData);
            setFormData({ name: '', description: '' });
            setEditingCollection(null);
            fetchCollections();
        } catch (error) {
            console.error('Error updating collection:', error);
            alert('Error updating collection: ' + error.message);
        }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete "${name}"? This will remove all emails from this collection.`)) {
            try {
                await collectionsAPI.deleteCollection(id);
                fetchCollections();
            } catch (error) {
                console.error('Error deleting collection:', error);
                alert('Error deleting collection: ' + error.message);
            }
        }
    };

    const handleEdit = (collection) => {
        setEditingCollection(collection);
        setFormData({ name: collection.name, description: collection.description || '' });
    };

    if (!isAuthenticated) {
        return (
            <div className="collections-container">
                <div className="collections-header">
                    <h2>📚 My Collections</h2>
                </div>
                <div className="auth-required">
                    <p>Please log in to create and manage your email collections.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="collections-container">
                <div className="loading">Loading collections...</div>
            </div>
        );
    }

    return (
        <div className="collections-container">
            <div className="collections-header">
                <h2>📚 My Collections</h2>
                <button onClick={() => setShowCreateModal(true)} className="create-collection-btn">
                    + Create Collection
                </button>
            </div>

            <div className="collections-grid">
                {/* Liked Emails Collection (automatic) */}
                <div className="collection-card liked-emails-collection">
                    <div className="collection-card-header">
                        <h3>♥ Liked Emails</h3>
                        <div className="auto-badge">Auto</div>
                    </div>
                    <p className="collection-description">All emails you've hearted</p>
                    <div className="collection-stats">
                        <span className="email-count">♥ {likedEmailsCount} {likedEmailsCount === 1 ? 'email' : 'emails'}</span>
                        <span className="collection-date">Automatic collection</span>
                    </div>
                    <button
                        onClick={() => onViewEmails && onViewEmails({ name: 'Liked Emails', id: 'liked' })}
                        className="view-emails-btn"
                        disabled={likedEmailsCount === 0}
                    >
                        View Emails
                    </button>
                </div>

                {/* User's custom collections */}
                {collections.length === 0 ? (
                    <div className="no-custom-collections-hint">
                        <p>Create custom collections to organize your favorite emails!</p>
                        <button onClick={() => setShowCreateModal(true)} className="create-collection-btn">
                            + Create Collection
                        </button>
                    </div>
                ) : (
                    collections.map((collection) => (
                        <div key={collection.id} className="collection-card">
                            <div className="collection-card-header">
                                <h3>{collection.name}</h3>
                                <div className="collection-actions">
                                    <button onClick={() => handleEdit(collection)} className="edit-btn" title="Edit">
                                        ✏️
                                    </button>
                                    <button onClick={() => handleDelete(collection.id, collection.name)} className="delete-btn" title="Delete">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                            {collection.description && (
                                <p className="collection-description">{collection.description}</p>
                            )}
                            <div className="collection-stats">
                                <span className="email-count">📧 {collection.email_count || 0} {collection.email_count === 1 ? 'email' : 'emails'}</span>
                                <span className="collection-date">Created {new Date(collection.created_at).toLocaleDateString()}</span>
                            </div>
                            <button
                                onClick={() => onViewEmails && onViewEmails(collection)}
                                className="view-emails-btn"
                                disabled={!collection.email_count}
                            >
                                View Emails
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Create/Edit Modal */}
            {(showCreateModal || editingCollection) && (
                <div className="modal-overlay" onClick={() => {
                    setShowCreateModal(false);
                    setEditingCollection(null);
                    setFormData({ name: '', description: '' });
                }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => {
                            setShowCreateModal(false);
                            setEditingCollection(null);
                            setFormData({ name: '', description: '' });
                        }}>&times;</button>

                        <h2>{editingCollection ? 'Edit Collection' : 'Create New Collection'}</h2>

                        <form onSubmit={editingCollection ? handleUpdate : handleCreate} className="collection-form">
                            <div className="form-group">
                                <label htmlFor="name">Collection Name *</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Great Year-End Emails"
                                    required
                                    maxLength={100}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="description">Description (optional)</label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="What makes this collection special?"
                                    rows="3"
                                    maxLength={500}
                                />
                            </div>

                            <button type="submit" className="submit-btn">
                                {editingCollection ? 'Update Collection' : 'Create Collection'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Collections;
