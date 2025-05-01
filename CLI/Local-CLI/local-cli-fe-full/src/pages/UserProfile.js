import React, { useState, useEffect } from 'react';
import { getUser, logout } from '../services/auth'; // Adjust path as needed
import { getBookmarks, deleteBookmarkedNode } from '../services/api';
import { updateBookmarkDescription } from '../services/api';
import { getNodeHistory } from '../services/api';
import BookmarkTable from '../components/BookmarkTable';

// import '../styles/UserProfile.css';

const UserProfile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [bookmarks, setBookmarks] = useState([]);
    const [loadingBookmarks, setLoadingBookmarks] = useState(true);
    const [bookmarksError, setBookmarksError] = useState(null);

    const [nodeHistory, setNodeHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [historyError, setHistoryError] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            setUser({ name: "name", email: "email" });
            setLoading(false);
            setError(null);

            try {
                const result = await getUser();
                setUser(result.data.user.user_metadata);
                console.log(result);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    useEffect(() => {
        const fetchBookmarks = async () => {
            setLoadingBookmarks(true);
            setBookmarksError(null);
            try {
                const jwt = localStorage.getItem('accessToken');
                const result = await getBookmarks({ jwt });
                // result.data might be an array of objects like { id, node, ... }
                // if it's just an array of strings: convert into [{ node }]
                const data = Array.isArray(result.data)
                    ? result.data.map(item =>
                        typeof item === 'string' ? { node: item } : item
                    )
                    : [];
                setBookmarks(data);
            } catch (err) {
                setBookmarksError(err.message || 'Failed to load bookmarks');
            } finally {
                setLoadingBookmarks(false);
            }
        };
        fetchBookmarks();
    }, []);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoadingHistory(true);
            setHistoryError(null);
            try {
                const jwt = localStorage.getItem('accessToken');
                const result = await getNodeHistory({ jwt });
                setNodeHistory(result.data || []);
            } catch (err) {
                setHistoryError('Failed to load node history');
            } finally {
                setLoadingHistory(false);
            }
        };
    
        fetchHistory();
    }, []);
    
    const handleLogout = async () => {
        try {
            await logout();
            // Option A: reload the app
            window.location.reload();
            // Option B: navigate to login page
            // navigate('/login');
        } catch (err) {
            console.error('Logout failed:', err);
            alert('Could not log out. Please try again.');
        }
    };


    if (loading) {
        return <div className="userprofile-container">Loading...</div>;
    }

    if (error) {
        console.log("Error: ", error);
        return (
            <div className="userprofile-container">
                <div className="userprofile-container error">{error}</div>
                <button onClick={handleLogout} className="logout-button">
                    Logout
                </button>
            </div>
        );
    }
    const handleDeleteBookmark = async (node) => {
        const jwt = localStorage.getItem('accessToken');
        try {
            await deleteBookmarkedNode({ jwt, node });
            setBookmarks((prev) => prev.filter((b) => b.node !== node));
        } catch (err) {
            console.error('Error deleting bookmark:', err);
            alert('Failed to delete bookmark');
        }
    };
    const handleUpdateDescription = async (node, description) => {
        const jwt = localStorage.getItem('accessToken');
        try {
          await updateBookmarkDescription({ jwt, node, description });
          setBookmarks((prev) =>
            prev.map((b) => (b.node === node ? { ...b, description } : b))
          );
        } catch (err) {
          console.error('Failed to update description:', err);
          alert('Error updating description');
        }
    };
    
    

    return (
        <div className="userprofile-container">
            <div className="profile-card">
                {/* <img
                    src={user.avatarUrl || '/assets/default-avatar.png'}
                    alt="Profile"
                    className="profile-avatar"
                /> */}
                <h1 className="profile-name">{user.first_name} {user.last_name}</h1>
                <p className="profile-email">{user.email}</p>
                {/* Add more fields as needed */}
                {/* Logout button */}
                <button
                    onClick={handleLogout}
                    className="logout-button"
                    style={{
                        marginTop: '1rem',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.25rem',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Logout
                </button>
            </div>
            <div className="bookmarks-section" style={{ marginTop: '2rem' }}>
                <h2>Your Bookmarked Nodes</h2>

                {loadingBookmarks ? (
                    <div>Loading bookmarks…</div>
                ) : bookmarksError ? (
                    <div className="error">{bookmarksError}</div>
                ) : bookmarks.length === 0 ? (
                    <div>No bookmarks yet.</div>
                ) : (
                    <BookmarkTable
                        data={bookmarks}
                        onDelete={handleDeleteBookmark}
                        onUpdateDescription={handleUpdateDescription}/>


                )}
            </div>
            <div className="history-section" style={{ marginTop: '2rem' }}>
    <h2>Your Node Usage History</h2>

    {loadingHistory ? (
        <div>Loading history…</div>
        ) : historyError ? (
        <div className="error">{historyError}</div>
        ) : nodeHistory.length === 0 ? (
        <div>No node usage history yet.</div>
        ) : (
        <table className="data-table">
            <thead>
                <tr>
                    <th>Node</th>
                    <th>Last Used</th>
                </tr>
            </thead>
            <tbody>
                {nodeHistory.map((entry, idx) => (
                    <tr key={idx}>
                        <td>{entry.node}</td>
                        <td>{new Date(entry.created_at).toLocaleString()}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        )}
    </div>

        </div>
    );
};

export default UserProfile;
