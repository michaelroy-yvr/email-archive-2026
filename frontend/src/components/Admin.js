import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Admin.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const Admin = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('authToken');
            const response = await axios.get(`${API_URL}/users/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data.users);
        } catch (error) {
            console.error('Error fetching users:', error);
            alert('Error fetching users: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleAdmin = async (userId, currentStatus) => {
        try {
            const token = localStorage.getItem('authToken');
            await axios.put(`${API_URL}/users/${userId}/admin`,
                { isAdmin: !currentStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchUsers();
        } catch (error) {
            console.error('Error updating admin status:', error);
            alert('Error updating admin status: ' + error.message);
        }
    };

    const deleteUser = async (userId, userEmail) => {
        if (window.confirm(`Are you sure you want to delete ${userEmail}?`)) {
            try {
                const token = localStorage.getItem('authToken');
                await axios.delete(`${API_URL}/users/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                fetchUsers();
            } catch (error) {
                console.error('Error deleting user:', error);
                alert('Error deleting user: ' + error.message);
            }
        }
    };

    if (loading) {
        return (
            <div className="admin-container">
                <div className="loading">Loading users...</div>
            </div>
        );
    }

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h2>👑 Admin Panel</h2>
                <p className="admin-subtitle">Manage users and permissions</p>
            </div>

            <div className="users-table">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Admin</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td>{user.id}</td>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>
                                    <span className={`admin-badge ${user.is_admin ? 'is-admin' : ''}`}>
                                        {user.is_admin ? '👑 Admin' : '👤 User'}
                                    </span>
                                </td>
                                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                <td className="actions-cell">
                                    <button
                                        onClick={() => toggleAdmin(user.id, user.is_admin)}
                                        className="toggle-admin-btn"
                                        title={user.is_admin ? 'Remove admin' : 'Make admin'}
                                    >
                                        {user.is_admin ? '⬇️ Demote' : '⬆️ Promote'}
                                    </button>
                                    <button
                                        onClick={() => deleteUser(user.id, user.email)}
                                        className="delete-user-btn"
                                        title="Delete user"
                                    >
                                        🗑️ Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {users.length === 0 && (
                <div className="no-users">
                    <p>No users found.</p>
                </div>
            )}
        </div>
    );
};

export default Admin;
