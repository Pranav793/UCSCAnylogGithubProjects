import React, { useState, useEffect } from 'react';
import { getUser, logout } from '../services/auth';
import { getBookmarks, deleteBookmarkedNode } from '../services/api';
import { updateBookmarkDescription } from '../services/api';
import BookmarkTable from '../components/BookmarkTable';

import '../styles/UserProfile.css'; 

const UserProfile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [bookmarks, setBookmarks] = useState([]);
    const [loadingBookmarks, setLoadingBookmarks] = useState(true);
    const [bookmarksError, setBookmarksError] = useState(null);


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
        return <div className="userprofile-container"><div className="loading-indicator">Loading...</div></div>;
    }

    if (error) {
        console.log("Error: ", error);
        return (
            <div className="userprofile-container">
                <div className="error">{error}</div>
                <div className="logout-container">
                    <button onClick={handleLogout} className="logout-button">
                        Logout
                    </button>
                </div>
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
                <h2 className="section-header">User Information</h2>
                <ul className="user-info-list">
                    <li className="user-info-item">
                        <span className="user-info-label">First Name:</span>
                        <span className="user-info-value">{user.first_name}</span>
                    </li>
                    <li className="user-info-item">
                        <span className="user-info-label">Last Name:</span>
                        <span className="user-info-value">{user.last_name}</span>
                    </li>
                    <li className="user-info-item">
                        <span className="user-info-label">Email:</span>
                        <span className="user-info-value">{user.email}</span>
                    </li>
                </ul>
                {/* Removed logout button from here */}
            </div>
            
            <div className="bookmarks-section">
                <h2 className="section-header">Your Bookmarked Nodes</h2>

                {loadingBookmarks ? (
                    <div className="loading-indicator">Loading bookmarks…</div>
                ) : bookmarksError ? (
                    <div className="error">{bookmarksError}</div>
                ) : bookmarks.length === 0 ? (
                    <div className="no-bookmarks">No bookmarks yet.</div>
                ) : (
                    <BookmarkTable
                        data={bookmarks}
                        onDelete={handleDeleteBookmark}
                        onUpdateDescription={handleUpdateDescription}/>


                )}
            </div>
            
            {/* Logout button at the end of the entire page */}
            <div className="logout-container">
                <button
                    onClick={handleLogout}
                    className="logout-button"
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

export default UserProfile;