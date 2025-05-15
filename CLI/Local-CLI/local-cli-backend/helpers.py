
from pydantic import BaseModel
from typing import Dict
import requests
from parsers import parse_response
import datetime
import json
import requests

from classes import *

import anylog_api.anylog_connector as anylog_connector


# Connect to AnyLog / EdgeLake connector
conn = '10.0.0.11:32249'
# conn = '127.0.0.1:32149'

auth = ()
timeout = 30
anylog_conn = anylog_connector.AnyLogConnector(conn=conn, auth=auth, timeout=timeout)

class Policy(BaseModel):
    name: str  # Policy name
    data: Dict[str, str]  # Key-value pairs


def monitor_network(conn: str) -> Dict:
    raw_response = make_request(conn, "GET", "get monitored operators")
    structured_data = parse_response(raw_response)
    data = structured_data.get("data", {})
    vals = list(data.values())
    monitored_nodes_filtered = filter_dicts_by_keys(vals, [
        "Node",
        "node name",
        "operational time",
        "elapsed time",
        "new rows",
        "total rows",
        "Free Space Percent",
        "CPU Percent",
        "Packets Recv",
        "Packets Sent",
        "Network Error"
      ])
    return monitored_nodes_filtered

def filter_dicts_by_keys(dict_list, keys_to_keep):
    """
    Filters each dictionary in dict_list to keep only the keys in keys_to_keep.

    Parameters:
        dict_list (list of dict): The list of dictionaries to filter.
        keys_to_keep (list of str): The list of keys to retain in each dictionary.

    Returns:
        list of dict: A new list of dictionaries containing only the specified keys.
    """
    return [
        {key: d[key] for key in keys_to_keep if key in d}
        for d in dict_list
    ]

def grab_network_nodes(conn: str) -> Dict:
    raw_response = make_request(conn, "GET", "test network")
    print(raw_response)

    structured_data = parse_response(raw_response)
    data = structured_data.get("data", {})

    connected_nodes = [node['Address'] for node in data if node['Status'] == "+"]
    connected_nodes = [node[:-1] + "9" for node in connected_nodes]
    return connected_nodes


def make_policy(conn:str, policy: Policy):
    # Construct the policy command
    policy_command = f'{policy.name} = create policy {policy.name} where '
    key_value_pairs = [f"{k} = {v}" for k, v in policy.data.items()]
    policy_command += " and ".join(key_value_pairs)

    # Submit the policy (POST)
    print(f"Submitting Policy: {policy_command}")
    make_request(conn, "POST", policy_command)

    # Retrieve the created policy (GET)
    get_policy_command = f"get !{policy.name}"
    print(f"Fetching Policy: {get_policy_command}")
    policy_response = make_request(conn, "GET", get_policy_command)
    print(f"Policy Response: {policy_response}")

    # Get the master node IP/Port (POST)
    master_node_command = 'mnode = blockchain get master bring.ip_port'
    print(f"Fetching Master Node: {master_node_command}")
    make_request(conn, "POST", master_node_command)

    # Retrieve master node info (GET)
    get_master_command = "get !mnode"
    print(f"Fetching Master Node Info: {get_master_command}")
    master_node_response = make_request(conn, "GET", get_master_command)
    print(f"Master Node Response: {master_node_response}")

    # Insert policy into blockchain (POST)
    blockchain_insert_command = f"blockchain insert where policy = !{policy.name} and local = true and master = !mnode"
    print(f"Inserting Policy into Blockchain: {blockchain_insert_command}")
    make_request(conn, "POST", blockchain_insert_command)

    # Retrieve the policy from the blockchain (POST)
    blockchain_get_command = f"blockchain get {policy.name}"
    print(f"Fetching Policy from Blockchain: {blockchain_get_command}")
    blockchain_response = make_request(conn, "GET", blockchain_get_command)
    print(f"Blockchain Policy Response: {blockchain_response}")

    return blockchain_response



def make_request(conn, method, command, topic=None, destination=None, payload=None):


    auth = ()
    timeout = 30
    anylog_conn = anylog_connector.AnyLogConnector(conn=conn, auth=auth, timeout=timeout)

    blobs = False


    if command.startswith("run client () sql"):
        destination = 'network'
        command = command.replace("run client () ", '')
    elif command.startswith("run client ("):
        end_index = command.find(")")
        if end_index != -1:
            destination = command[len("run client ("):end_index].strip()
            command = command[end_index + 1:].strip()

    if "file using file" in command:
        blobs = True

    

    print("conn", conn)
    print("command", command)
    print("destination", destination)

    # url = f"http://{conn}"
    # # url = "http://127.0.0.1:32049" "23.239.12.151:32349"
    # headers = {
    #     "User-Agent": "AnyLog/1.23",
    #     "command": command,
    # }
    
    try:
        if method.upper() == "GET":
            response = anylog_conn.get(command=command, destination=destination)
            # response = requests.get(url, headers=headers)
        elif method.upper() == "POST":
            response = anylog_conn.post(command=command, topic=topic, destination=destination, payload=payload)
            # response = requests.post(url, headers=headers)
        else:
            raise ValueError("Invalid method. Use 'GET' or 'POST'.")
        
        # response.raise_for_status()  # Raise an error for bad status codes
        print("response", response)

        if blobs:
            return { 'blobs': response }
        return response  # Assuming response is text, change if needed
    except requests.exceptions.RequestException as e:
        print(f"Error making {method.upper()} request: {e}")
        return None

# blockchain delete policy where id = a29bcfd55cef20c6834f29fbb3aaf882 and master = 172.24.0.2:32048






# SENDING DATA TO ANYLOG



def prep_to_add_data(data: list, dbms: str, table: str) -> list:
    """
    Prepare data for adding to the database.
    """
    for record in data:
        record['dbms'] = dbms
        record['table'] = table
    return json.dumps(data)

def infer_schema(data) -> list:
    print("Parsing JSON")
    schema = {}
    for record in data:
        for key, value in record.items():
            if key not in schema:
                schema[key] = type(value).__name__
    print("Schema", schema)
    return schema


def build_msg_client_command(schema: dict) -> str:
    """
    Build a topic string based on the provided parameters.
    """
    column_details = []

    for key, value in schema.items():
        # print(f"Key: {key}, Value: {value}")
        # if key == 'timestamp':
        #     val = f'column.timestamp.timestamp="bring [timestamp]"'
        #     column_details.append(val)
        # else:
        #     val = f'column.{key}=(type={value} and value=bring [{key}])'
        #     column_details.append(val)
        val = f'column.{key}=(type={value} and value=bring [{key}])'
        column_details.append(val)

    column_str = ' and '.join(column_details)
    topic_str = f'run msg client where broker=rest and user-agent=anylog and log=false and topic=(name=new-data and dbms="bring [dbms]" and table="bring [table]" and {column_str})'
    return topic_str

    # base_str = 'run msg client where broker=rest and user-agent=anylog and log=false and topic=(name=new-data and dbms="bring [dbms]" and table="bring [table]" and column.timestamp.timestamp="bring [timestamp]" and column.value=(type=int and value=bring [value]))'

def parse_check_clients(raw: str) -> dict:
    """
    Parse the response from the check clients command.
    """
    lines = raw.strip().splitlines()
    idline = lines[0]
    ret = idline.split(": ")
    ret[1] = ret[1].strip()
    return int(ret[1])


def send_json_data(conn, dbms, table, data):
    
    # infer the schema of the data
    inferred_schema = infer_schema(data)

    # build the msg client command
    msg_client_cmd = build_msg_client_command(inferred_schema)
    print("msg_client_cmd", msg_client_cmd)

    # prep data with dbms and table
    prepped_data = prep_to_add_data(data, dbms, table)

    # check for existing msg client
    check_clients = make_request(conn.conn, "GET", "get msg client where topic = new-data")
    if "No message client subscriptions" in check_clients:
        # create new client
        resp = make_request(conn.conn, "POST", msg_client_cmd)
        print("New Client:", resp)
    else: 
        # get old client id
        old_client_id = parse_check_clients(check_clients)
        print(old_client_id)

        # kill old client
        kill_cmd = f'exit msg client {old_client_id}'
        make_request(conn.conn, "POST", kill_cmd)

        # create new client
        resp = make_request(conn.conn, "POST", msg_client_cmd)
        print("New Client:", resp)

    # send data
    response = make_request(conn=conn.conn, method="POST", command='data', topic='new-data', payload=prepped_data)
    print("Data send resp:", response)

    # get streaming to check if data was sent
    response = make_request(conn.conn, "GET", "get streaming")
    print("Streaming:", response)

    return response 







def get_preset_base_policy(conn: str):
    # Retrieve the created preset policy (GET)
    # NEEDS TO BE CHANGED INTO FROM X BRING Y
    get_policy_command = "get !bookmark_policy"
    print(f"Fetching Preset Policy: {get_policy_command}")
    policy_response = make_request(conn, "GET", get_policy_command)
    print(f"Preset Policy Response: {policy_response}")
    
    return policy_response


def check_preset_basepolicy(conn: str):
    resp = get_preset_base_policy(conn)
    print("check_policycmd", resp)
    if resp is None:
        c1 = "set policy bookmark_policy [bookmark] = {}"
        resp = make_request(conn, "POST", c1)
        print("setnewpolicyresp", resp)

        c2 = "set policy bookmark_policy [bookmark][bookmarks] = {}"
        resp = make_request(conn, "POST", c2)
        print("setbookmarksemptyresp", resp)

    return get_preset_base_policy(conn)


def make_preset_group_policy(conn: str, group_name:str):
    check_preset_basepolicy(conn)

    policy_command = f'set policy bookmark_policy [bookmark][bookmarks][{group_name}] = {{}}'

    # Submit the preset policy (POST)
    print(f"Submitting Preset Group Policy: {policy_command}")
    make_request(conn, "POST", policy_command)

    basepolicy = get_preset_base_policy(conn)

    return basepolicy



def make_preset_policy(conn: str, preset: Preset, group_name: str):
    name = preset.button
    cmd = preset.command
    type = preset.type


    check_preset_basepolicy(conn)


    # Construct the policy command for the preset
    # set policy bookmark_policy [bookmark][bookmarks][event-log] = {"type": "get", "value": "get event log"}
    policy_command = f'set policy bookmark_policy [bookmark][bookmarks][{group_name}][{name}] = {{"type": "{type.lower()}", "command": "{cmd}"}}'
    # policy_command = f'set policy bookmark_policy [bookmark][bookmarks][{group_name}][{name}] = {{"type": "{type.lower()}", "command": "'
    # policy_command += cmd
    # policy_command += '"}}'

    # Submit the preset policy (POST)
    print(f"Submitting Preset Policy: {policy_command}")
    make_request(conn, "POST", policy_command)

    basepolicy = get_preset_base_policy(conn)

    return basepolicy



def delete_preset_group_policy(conn: str, group_name:str):
    check_preset_basepolicy(conn)

    # Construct the policy command for the preset
    # set policy bookmark_policy [bookmark][bookmarks][event-log] = {"type": "get", "value": "get event log"}
    policy_command = f'set policy bookmark_policy [bookmark][bookmarks][{group_name}] = ""'

    # Submit the preset policy (POST)
    print(f"Submitting Preset Policy: {policy_command}")
    make_request(conn, "POST", policy_command)

    basepolicy = get_preset_base_policy(conn)

    return basepolicy