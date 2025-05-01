import React, { useEffect, useState } from 'react';
import { getNodeHistory } from '../services/api';

const NodeHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const jwt = localStorage.getItem('accessToken');
      if (!jwt) return;

      try {
        const result = await getNodeHistory({ jwt });
        setHistory(result.data || []);
      } catch (err) {
        console.error('Error loading node history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Node Usage History</h2>
      {loading ? (
        <p>Loading...</p>
      ) : history.length === 0 ? (
        <p>No history yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Node</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry, idx) => (
              <tr key={idx}>
                <td>{entry.node}</td>
                <td>{new Date(entry.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default NodeHistory;
