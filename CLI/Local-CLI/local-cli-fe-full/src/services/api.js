// src/services/api.js

// Example: "sendCommand" function that POSTs a command to your server
export async function sendCommand({ connectInfo, method, command }) {
  if (!connectInfo || !command || !method) {
    alert('Missing required fields');
    return;
  }

  try {
    // Construct your request body
    const requestBody = {
      command: { type: method, cmd: command },
      conn: { conn: connectInfo },
    };

    // Example: a POST request using fetch
    // The URL here might be constructed using connectInfo or some known base URL
    const response = await fetch(`http://127.0.0.1:8000/send-command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Possibly include auth headers or other tokens here
      },
      body: JSON.stringify(requestBody),
    });

    // Check if response is okay (2xx)
    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    // Parse JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    // Optionally handle errors
    console.error('Error sending command:', error);
    throw error; // re-throw so the component knows there was an error
  }
}

export async function getConnectedNodes({ selectedNode }) {
  const connectInfo = selectedNode;
  console.log("getConnectedNodes called with connectInfo:", connectInfo);
  if (!connectInfo) {
    alert('Missing required fields');
    return;
  }

  try {
    const requestBody = { conn: connectInfo };

    const response = await fetch(`http://127.0.0.1:8000/get-network-nodes/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Possibly include auth headers or other tokens here
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Response: ", response);

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status},  ${response}`);
    }

    // Parse JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    // Optionally handle errors
    console.error('Error getting nodes:', error);
    throw error; // re-throw so the component knows there was an error
  }
}



export async function monitor({ node }) {
  const connectInfo = node;
  console.log("getConnectedNodes called with connectInfo:", connectInfo);
  if (!connectInfo) {
    alert('Missing required fields');
    return;
  }

  try {
    const requestBody = { conn: connectInfo };

    const response = await fetch(`http://127.0.0.1:8000/monitor/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Possibly include auth headers or other tokens here
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Response: ", response);

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status},  ${response}`);
    }

    // Parse JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    // Optionally handle errors
    console.error('Error getting nodes:', error);
    throw error; // re-throw so the component knows there was an error
  }
}


export async function submitPolicy({ connectInfo, policy }) {
  if (!connectInfo || !policy) {
    alert('Missing required fields');
    return;
  }

  try {

    const requestBody = { conn: { conn: connectInfo }, policy: policy };

    const response = await fetch(`http://127.0.0.1:8000/submit-policy/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Possibly include auth headers or other tokens here
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Response: ", response);

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status},  ${response}`);
    }

    // Parse JSON response
    const respData = await response.json();
    return respData;
  } catch (error) {
    // Optionally handle errors
    console.error('Error getting nodes:', error);
    throw error; // re-throw so the component knows there was an error
  }
}




export async function addData({ connectInfo, db, table, data }) {
  if (!connectInfo || !db || !table || !data) {
    alert('Missing required fields');
    return;
  }

  try {

    const requestBody = { conn: { conn: connectInfo }, dbconn: { dbms: db, table: table }, data: data };

    const response = await fetch(`http://127.0.0.1:8000/add-data/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Possibly include auth headers or other tokens here
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Response: ", response);

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status},  ${response}`);
    }

    // Parse JSON response
    const respData = await response.json();
    return respData;
  } catch (error) {
    // Optionally handle errors
    console.error('Error getting nodes:', error);
    throw error; // re-throw so the component knows there was an error
  }
}




export async function bookmarkNode({ jwt, node }) {
  if (!jwt || !node) {
    alert('Missing required fields');
    return;
  }

  console.log("bookmarkNode called with jwt:", jwt, "and node:", node);

  try {

    const requestBody = { conn: { conn: node }, token: { jwt: jwt } };

    const response = await fetch(`http://127.0.0.1:8000/bookmark-node/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Possibly include auth headers or other tokens here
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Response: ", response);

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status},  ${response}`);
    }

    // Parse JSON response
    const respData = await response.json();
    return respData;
  } catch (error) {
    // Optionally handle errors
    console.error('Error getting nodes:', error);
    throw error; // re-throw so the component knows there was an error
  }
}



export async function getBookmarks({ jwt }) {
  if (!jwt) {
    alert('Missing required fields');
    return;
  }


  console.log("getBookmarks called with jwt:", jwt);


  try {

    const requestBody = { jwt: jwt } ;

    const response = await fetch(`http://127.0.0.1:8000/get-bookmarked-nodes/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Possibly include auth headers or other tokens here
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Response: ", response);

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status},  ${response}`);
    }

    // Parse JSON response
    const respData = await response.json();
    return respData;
  } catch (error) {
    // Optionally handle errors
    console.error('Error getting nodes:', error);
    throw error; // re-throw so the component knows there was an error
  }
}

export async function deleteBookmarkedNode({ jwt, node }) {
  if (!jwt || !node) {
    alert('Missing required fields');
    return;
  }

  console.log("deleteBookmarkedNode called with jwt:", jwt, "and node:", node);

  try {
    const requestBody = {
      conn: { conn: node },
      token: { jwt: jwt },
    };

    const response = await fetch(`http://127.0.0.1:8000/delete-bookmarked-node/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const respData = await response.json();
    return respData;
  } catch (error) {
    console.error('Error deleting bookmarked node:', error);
    throw error;
  }
}

export async function updateBookmarkDescription({ jwt, node, description }) {
  if (!jwt || !node) {
    alert('Missing required fields');
    return;
  }

  console.log("updateBookmarkDescription called with:", { jwt, node, description });

  try {
    const requestBody = {
      token: { jwt },
      node,
      description,
    };

    const response = await fetch(`http://127.0.0.1:8000/update-bookmark-description/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const respData = await response.json();
    return respData;
  } catch (error) {
    console.error('Error updating description:', error);
    throw error;
  }
}

export async function logNodeUsage({ jwt, node }) {
  if (!jwt || !node) return;

  try {
    const requestBody = {
      token: { jwt },
      conn: { conn: node },
    };

    const response = await fetch(`http://127.0.0.1:8000/log-node/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Failed to log node usage`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error logging node usage:', error);
  }
}


export async function getNodeHistory({ jwt }) {
  if (!jwt) return;

  try {
    const response = await fetch(`http://127.0.0.1:8000/get-node-history/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: { jwt } }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get node history`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting node history:', error);
    return [];
  }
}

