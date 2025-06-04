import React, { useState } from "react";
import { submitPolicy } from "../services/api";
import "../styles/Policies.css"; // Import your CSS file for styling

const Policies = ({ node }) => {
    const [policyName, setPolicyName] = useState("");
    const [policyData, setPolicyData] = useState({});
    const [key, setKey] = useState("");
    const [value, setValue] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submittedPolicyId, setSubmittedPolicyId] = useState(null);
    const [editingKey, setEditingKey] = useState(null);
    const [editKey, setEditKey] = useState("");
    const [editValue, setEditValue] = useState("");

    // Add a key-value pair to the policy dictionary
    const addKeyValuePair = () => {
        if (key.trim() === "" || value.trim() === "") return;
        setPolicyData({ ...policyData, [key]: value });
        setKey("");
        setValue("");
    };

    // Remove a key from the policy dictionary
    const removeKey = (keyToRemove) => {
        const updatedData = { ...policyData };
        delete updatedData[keyToRemove];
        setPolicyData(updatedData);
    };

    // Start editing a key-value pair
    const startEditing = (key, value) => {
        setEditingKey(key);
        setEditKey(key);
        setEditValue(value);
    };

    // Save edited key-value pair
    const saveEdit = () => {
        if (editKey.trim() === "" || editValue.trim() === "") return;
        
        // Create a new policy data object
        const newPolicyData = {};
        
        // Copy all entries except the one being edited
        Object.entries(policyData).forEach(([k, v]) => {
            if (k !== editingKey) {
                newPolicyData[k] = v;
            }
        });
        
        // Add the edited entry
        newPolicyData[editKey] = editValue;
        
        // Update state
        setPolicyData(newPolicyData);
        cancelEdit();
    };

    // Cancel editing
    const cancelEdit = () => {
        setEditingKey(null);
        setEditKey("");
        setEditValue("");
    };

    const handleSubmitPolicy = async (e) => {
        e.preventDefault();
        setError(null);

        if (!policyName.trim()) {
            alert("Please enter a policy name.");
            return;
        }

        try {
            const policy = { name: policyName, data: policyData };
            const result = await submitPolicy({ connectInfo: node, policy: policy });
            console.log("Policyname:", policyName);
            console.log("Policy ID:", result.data[0][policyName].id);
            setSubmittedPolicyId(result.data[0][policyName].id);
            // alert("Policy submitted successfully!");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <h2>Policy Editor</h2>

            <p>
                <strong>Connected Node:</strong> {node}
            </p>

            {/* Policy Name Input */}
            <input
                type="text"
                placeholder="Enter Policy Name"
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value.toLowerCase())}
                className="policy-name-input"
            />

            {/* Key-Value Pair Inputs */}
            <div className="input-group">
                <input
                    type="text"
                    placeholder="Key"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Value"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                />
                <button onClick={addKeyValuePair}>Add</button>
            </div>

            {/* Display Key-Value Pairs */}
            <h3>Policy Data:</h3>
            <ul className="policy-list">
                {Object.entries(policyData).map(([k, v]) => (
                    <li key={k}>
                        {editingKey === k ? (
                            <div className="edit-group">
                                <input
                                    type="text"
                                    value={editKey}
                                    onChange={(e) => setEditKey(e.target.value)}
                                    className="edit-input"
                                />
                                <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="edit-input"
                                />
                                <button className="save-btn" onClick={saveEdit}>
                                    Save
                                </button>
                                <button className="cancel-btn" onClick={cancelEdit}>
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <>
                                <span>
                                    <strong>{k}:</strong> {v}
                                </span>
                                <div className="action-buttons">
                                    <button className="edit-btn" onClick={() => startEditing(k, v)}>
                                        Edit
                                    </button>
                                    <button className="remove-btn" onClick={() => removeKey(k)}>
                                        ✖
                                    </button>
                                </div>
                            </>
                        )}
                    </li>
                ))}
            </ul>

            {/* Display Full JSON */}
            <h3>Generated JSON Policy:</h3>
            <pre className="json-preview">
                {JSON.stringify({ [policyName]: policyData }, null, 2)}
            </pre>

            {/* Submit Button */}
            <button onClick={handleSubmitPolicy} className="submit-btn">
                Submit Policy
            </button>

            {/* Error Message */}
            {error && <div className="error-message">{error}</div>}
            {loading && <div className="loading-message">Loading...</div>}

            {/* Box showing the policy ID after successful submission */}
            {submittedPolicyId && (
                <div className="policy-id-box">
                    <p>Policy submitted successfully!</p>
                    <p>
                        <strong>Policy ID:</strong> {submittedPolicyId}
                    </p>
                </div>
            )}
        </div>
    );
};export default Policies;