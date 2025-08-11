

// src/pages/Presets.jsx
import React, { useEffect, useState } from "react";
import {
  getPresetGroups,
  addPresetGroup,
  deletePresetGroup,
  getPresetsByGroup,
  addPreset,
  deletePreset
} from "../services/file_auth";
import "../styles/Presets.css";

const Presets = () => {
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [presets, setPresets] = useState([]);

  const [preset, setPreset] = useState({
    command: "",
    type:    "GET",
    button:  "",
    groupName:   groupName
  });
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // load groups once
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const res = await getPresetGroups();
        setGroups(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    loadGroups();
  }, []);

  // when group changes, load its presets
  useEffect(() => {
    if (!selectedGroupId) {
      setPresets([]);
      return;
    }
    const loadPresets = async () => {
      try {
        const res = await getPresetsByGroup({
          groupId: selectedGroupId
        });
        setPresets(res.data);
      } catch (e) {
        console.error("Failed to load presets", e);
      }
    };
    loadPresets();
  }, [selectedGroupId]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError("Group name required");
      return;
    }
    setLoading(true);
    try {
      const res = await addPresetGroup({ name: groupName });
      // Assume new group is returned as an object in res.data
      console.log("Group created:", res.data);
      const newG = res.data.group; // Updated to match new API response format
      setGroups(g => [...g, newG]);
      setGroupName("");
      setError("");
      setSuccessMsg(`Group “${newG.group_name}” created`);
    } catch {
      setError("Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    // stop further actions
    if (!window.confirm("Delete this group and all its presets?")) {
      return;
    }
    setLoading(true);
    try {
      const gname = groups.find(g => parseInt(g.id) === parseInt(groupId))?.group_name;
      console.log("Deleting group:", groupId, gname);
      const res = await deletePresetGroup({ groupId, groupName: gname });
      console.log("Group deleted:", res.data);
      // remove from state
      setGroups(g => g.filter(x => x.id !== groupId));
      // if it was selected, clear selection
      if (selectedGroupId === groupId) {
        setSelectedGroupId("");
        setPresets([]);
      }
      setError("");
      setSuccessMsg("Group deleted");
    } catch {
      setError("Failed to delete group");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePreset = async () => {

    const gname = groups.find(g => parseInt(g.id) === parseInt(selectedGroupId))?.group_name;
    
    if (!preset.command.trim() || !preset.button.trim()) {
      setError("Command and button label required");
      return;
    }
    setLoading(true);
    try {
      const res = await addPreset({ 
        preset: { 
          ...preset, 
          group_id: selectedGroupId,
          group_name: gname
        } 
      });
      console.log("Preset created:", res.data);
      const newP = res.data.preset;
      setPresets(p => [...p, newP]);
      setPreset({ command: "", type: "GET", button: "", groupName: gname });
      setError("");
      setSuccessMsg(`Preset "${newP.button}" created`);
    } catch {
      setError("Failed to create preset");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePreset = async (presetId) => {
    if (!window.confirm("Delete this preset?")) {
      return;
    }
    setLoading(true);
    try {
      const res = await deletePreset({ presetId });
      console.log("Preset deleted:", res.data);
      // remove from state
      setPresets(p => p.filter(x => x.id !== presetId));
      setError("");
      setSuccessMsg("Preset deleted");
    } catch {
      setError("Failed to delete preset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <section className="group-section">
        <h2>📁 Manage Groups</h2>
        <div className="form-row">
          <input
            type="text"
            placeholder="New group name"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
          />
          <button onClick={handleCreateGroup} disabled={loading}>
            Create
          </button>
        </div>
        <ul className="group-list">
          {groups.map(g => (
            <li
              key={g.id}
              className={selectedGroupId === g.id ? "selected" : ""}
            >
              <span
                onClick={() => {
                  setSelectedGroupId(g.id);
                  setSuccessMsg("");
                  setError("");
                }}
              >
                {g.group_name}
              </span>
              <button
                className="delete-btn"
                disabled={loading}
                onClick={() => handleDeleteGroup(g.id)}
                title="Delete group and all its presets"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="preset-section">
        <h2>➕ Add & View Presets</h2>
        <div className="form-row">
          <label htmlFor="group-select">Group:</label>
          <select
            id="group-select"
            value={selectedGroupId}
            onChange={e => setSelectedGroupId(e.target.value)}
          >
            <option value="">– choose –</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>
                {g.group_name}
              </option>
            ))}
          </select>
        </div>

        {selectedGroupId && (
          <>
            <div className="form-row">
              <input
                type="text"
                placeholder="Button Label"
                value={preset.button}
                onChange={e =>
                  setPreset({ ...preset, button: e.target.value })
                }
              />
              <select
                value={preset.type}
                onChange={e =>
                  setPreset({ ...preset, type: e.target.value })
                }
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
              <input
                type="text"
                placeholder="Command"
                value={preset.command}
                onChange={e =>
                  setPreset({ ...preset, command: e.target.value })
                }
              />
              <button onClick={handleCreatePreset} disabled={loading}>
                Add Preset
              </button>
            </div>

            <ul className="preset-list">
              {presets.length === 0 ? (
                <li className="empty-state">
                  <div className="preset-content">
                    <div className="preset-command" style={{ textAlign: 'center', color: '#6c757d', fontStyle: 'italic' }}>
                      No presets in this group yet. Add your first preset above!
                    </div>
                  </div>
                </li>
              ) : (
                presets.map(p => (
                  <li key={p.id}>
                    <div className="preset-content">
                      <div className="preset-header">
                        <span className="preset-button">{p.button}</span>
                        <span className="preset-type">{p.type}</span>
                      </div>
                      <div className="preset-command">{p.command}</div>
                    </div>
                    <button
                      className="delete-btn"
                      disabled={loading}
                      onClick={() => handleDeletePreset(p.id)}
                      title="Delete preset"
                    >
                      🗑️
                    </button>
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </section>

      {error && <div className="error-message">{error}</div>}
      {successMsg && (
        <div className="success-message">{successMsg}</div>
      )}
    </div>
  );
};

export default Presets;
