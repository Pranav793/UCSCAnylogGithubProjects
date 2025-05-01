// src/components/NodePicker.js
import React, { useState } from 'react';
import { getConnectedNodes, bookmarkNode } from '../services/api'; // Adjust the import path as necessary
import '../styles/NodePicker.css'; // Optional: create a CSS file for node picker styling
import { isLoggedIn } from '../services/auth';
import { logNodeUsage } from '../services/api';
import { useEffect } from 'react';

const NodePicker = ({ nodes, selectedNode, onAddNode, onSelectNode }) => {
  const [newNode, setNewNode] = useState('');
  const [error, setError] = useState(null);
  const [local, setLocal] = useState(false);
  const [bookmarkMsg, setBookmarkMsg] = useState(null);

  useEffect(() => {
    if (!bookmarkMsg) return;

    const timer = setTimeout(() => {
      setBookmarkMsg(null);
    }, 5000); // 3000ms = 3s

    return () => clearTimeout(timer);
  }, [bookmarkMsg]);


  const handleAdd = async () => {
    if (newNode.trim()) {
      const selected = newNode.trim();
      onAddNode(selected);
      onSelectNode(selected);
  
      const jwt = localStorage.getItem('accessToken');
      if (jwt) {
        try {
          await logNodeUsage({ jwt, node: selected });
        } catch (err) {
          console.error('Failed to log usage:', err);
        }
      }
  
      setNewNode('');
    }
  };
  

  const handleAddConnectedNodes = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      console.log("Selected Node is this:", selectedNode);
      const fetchedNodes = await getConnectedNodes({ selectedNode });
      for (const node of fetchedNodes.data) {
        console.log(node);
        onAddNode(node);
      }

    } catch (err) {
      setError("Failed to test network.");
    }
  };


  const makeLocal = (node, isLocal) => {
    if (!node) return node;  // Return if node is empty
    const parts = node.split(':');
    if (isLocal && parts.length === 2) {  // Check if local is true and node is in "ip:port" format
      console.log("MADE LOCAL")
      return `127.0.0.1:${parts[1]}`;
    }
    return node;
  };

  const handleLocalChange = async (e) => {
    const isLocal = e.target.checked;
    setLocal(isLocal);
  
    const updatedNode = makeLocal(selectedNode, isLocal);
    onSelectNode(updatedNode);
  
    const jwt = localStorage.getItem('accessToken');
    if (jwt) {
      try {
        await logNodeUsage({ jwt, node: updatedNode });
      } catch (err) {
        console.error('Failed to log usage (local toggle):', err);
      }
    }
  };
  

  const handleBookmark = async () => {
    if (!selectedNode) {
      setBookmarkMsg('No node selected to bookmark.');
      return;
    }
    setError(null);
    setBookmarkMsg(null);

    try {
      if (isLoggedIn()) {
        const jwt = localStorage.getItem('accessToken');
        await bookmarkNode({ node: selectedNode, jwt });
        setBookmarkMsg(`Bookmarked ${selectedNode}!`);
      }
    } catch (err) {
      console.error('Bookmark failed:', err);
      setError('Could not bookmark node. Try again.');
    }
  };


  return (
    <div className="node-picker-container">
    <select
      className="node-picker-select"
      value={selectedNode}
      onChange={async (e) => {
        const selected = e.target.value;
        onSelectNode(selected);

        const jwt = localStorage.getItem('accessToken');
        if (jwt) {
          try {
            await logNodeUsage({ jwt, node: selected });
          } catch (err) {
            console.error('Failed to log usage:', err);
          }
        }
      }}
    >

        {nodes.map((node, index) => (
          <option key={index} value={node}>
            {node}
          </option>
        ))}
      </select>
      <input
        className="node-picker-input"
        type="text"
        placeholder="Connection (IP:Port)"
        value={newNode}
        onChange={(e) => setNewNode(e.target.value)}
      />
      <button className="node-picker-btn" onClick={handleAdd}>
        Use
      </button>
      <button className="node-picker-btn" onClick={handleAddConnectedNodes}>
        Add Connected Nodes
      </button>
      <button className="node-picker-btn" onClick={handleBookmark}>
        Bookmark
      </button>
      <label className="local-label">
        <input type="checkbox" checked={local} onChange={handleLocalChange} />
        Local
      </label>
      {bookmarkMsg && (
        <div className="bookmark-msg" style={{ color: 'red', marginTop: '0.5rem', marginBlockStart: '0.5rem' }}>
          {bookmarkMsg}
        </div>
      )}
      {error && (
        <div className="error" style={{ color: 'red', marginTop: '0.5rem' }}>
          {error}
        </div>
      )}
    </div>
  );
};


export default NodePicker;

