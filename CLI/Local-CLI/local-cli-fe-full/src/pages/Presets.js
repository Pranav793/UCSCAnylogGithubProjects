

// src/pages/Presets.jsx
import React, { useEffect, useState } from "react";
import {
  getPresetGroups,
  addPresetGroup,
  deletePresetGroup,
  getPresetsByGroup,
  addPreset
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
    const { command, type, button } = preset;
    if (!selectedGroupId || !command || !type || !button) {
      setError("All fields + group selection required");
      return;
    }
    setLoading(true);
    try {
      const newpreset = {
        command:  command.trim(),
        type:     type.trim(),
        button:   button.trim(),
        group_id: selectedGroupId,
        group_name: gname
      };
      console.log("New preset:", newpreset);
      const res = await addPreset({ preset: newpreset });
      const created = res.data.preset; // Updated to match new API response format
      setPresets(p => [...p, created]);
      setPreset({ command: "", type: "GET", button: "" });
      setError("");
      setSuccessMsg("Preset added");
    } catch {
      setError("Failed to add preset");
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
              >
                🗑
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
              {presets.map(p => (
                <li key={p.id}>
                  <strong>{p.button}</strong>: {p.command}{" "}
                  <em>({p.type})</em>
                </li>
              ))}
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
