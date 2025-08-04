import React, { useState, useEffect } from 'react';
import { getDatabases, getTables, getColumns } from '../services/api';
import '../styles/SqlQueryGenerator.css';

const SqlQueryGenerator = ({ node }) => {
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [whereClause, setWhereClause] = useState('');
  const [groupBy, setGroupBy] = useState('');
  const [orderBy, setOrderBy] = useState('');
  const [limit, setLimit] = useState('');
  const [format, setFormat] = useState('json');
  const [timezone, setTimezone] = useState('utc');
  const [distinct, setDistinct] = useState(false);
  const [aggregations, setAggregations] = useState([]);
  const [joins, setJoins] = useState([]);
  
  // Increments function state
  const [useIncrements, setUseIncrements] = useState(false);
  const [incrementsUnit, setIncrementsUnit] = useState('minute');
  const [incrementsInterval, setIncrementsInterval] = useState(1);
  const [incrementsDateColumn, setIncrementsDateColumn] = useState('');

  // Fetch databases on component mount
  useEffect(() => {
    if (node) {
      fetchDatabases();
    }
  }, [node]);

  // Fetch tables when database changes
  useEffect(() => {
    if (selectedDatabase) {
      fetchTables();
    } else {
      setTables([]);
      setSelectedTable('');
    }
  }, [selectedDatabase]);

  // Fetch columns when table changes
  useEffect(() => {
    if (selectedTable) {
      fetchColumns();
    } else {
      setColumns([]);
      setSelectedColumns([]);
    }
  }, [selectedTable]);

  // Update query when selections change
  useEffect(() => {
    buildQuery();
  }, [selectedColumns, whereClause, groupBy, orderBy, limit, format, timezone, distinct, aggregations, joins, useIncrements, incrementsUnit, incrementsInterval, incrementsDateColumn]);

  const fetchDatabases = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDatabases({ connectInfo: node });
      setDatabases(result.data || []);
    } catch (err) {
      setError('Failed to fetch databases: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTables({ connectInfo: node, database: selectedDatabase });
      setTables(result.data || []);
    } catch (err) {
      setError('Failed to fetch tables: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchColumns = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getColumns({ 
        connectInfo: node, 
        database: selectedDatabase, 
        table: selectedTable 
      });
      setColumns(result.data || []);
    } catch (err) {
      setError('Failed to fetch columns: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const buildQuery = () => {
    if (!selectedDatabase || !selectedTable || selectedColumns.length === 0) {
      setQuery('');
      return;
    }

    // Build AnyLog SQL query: run client () sql [dbms] [query options] [select statement]
    let anylogQuery = 'run client () sql ';
    
    // Add database name
    anylogQuery += selectedDatabase;
    
    // Add query options (format and timezone)
    anylogQuery += ` format = ${format}`;
    if (timezone !== 'utc') {
      anylogQuery += ` timezone = ${timezone}`;
    }
    
    // Start the SELECT statement
    anylogQuery += ' "';
    
    // Add SELECT keyword
    anylogQuery += 'SELECT ';
    
    // Add DISTINCT if selected
    if (distinct) {
      anylogQuery += 'DISTINCT ';
    }
    
    // Add increments function if enabled
    let selectClause = '';
    if (useIncrements && incrementsDateColumn) {
      selectClause += `increments(${incrementsDateColumn}, ${incrementsInterval}, ${incrementsUnit}), `;
    }
    
    // Add selected columns with aggregations
    selectClause += selectedColumns.map(col => {
      const agg = aggregations.find(a => a.column === col);
      if (agg) {
        return `${agg.function}(${col}) as ${agg.alias || col}`;
      }
      return col;
    }).join(', ');
    
    anylogQuery += selectClause;
    
    // Add FROM clause
    anylogQuery += ` FROM ${selectedTable}`;
    
    // Add JOIN clauses
    joins.forEach(join => {
      anylogQuery += ` ${join.type} JOIN ${join.table} ON ${join.condition}`;
    });
    
    // Add WHERE clause
    if (whereClause.trim()) {
      anylogQuery += ` WHERE ${whereClause}`;
    }
    
    // Add GROUP BY clause
    if (groupBy.trim()) {
      anylogQuery += ` GROUP BY ${groupBy}`;
    }
    
    // Add ORDER BY clause
    if (orderBy.trim()) {
      anylogQuery += ` ORDER BY ${orderBy}`;
    }
    
    // Add LIMIT clause
    if (limit.trim()) {
      anylogQuery += ` LIMIT ${limit}`;
    }
    
    // Close the SELECT statement with quotes
    anylogQuery += '"';
    
    setQuery(anylogQuery);
  };

  const handleColumnToggle = (column) => {
    setSelectedColumns(prev => {
      if (prev.includes(column)) {
        return prev.filter(col => col !== column);
      } else {
        return [...prev, column];
      }
    });
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(columns.map(col => col.column_name || col.name));
  };

  const handleClearColumns = () => {
    setSelectedColumns([]);
  };

  const copyQuery = () => {
    if (query.trim()) {
      navigator.clipboard.writeText(query).then(() => {
        // Could add a toast notification here
        console.log('Query copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy query:', err);
      });
    }
  };

  const clearQuery = () => {
    setSelectedDatabase('');
    setSelectedTable('');
    setSelectedColumns([]);
    setQuery('');
    setWhereClause('');
    setGroupBy('');
    setOrderBy('');
    setLimit('');
    setFormat('json');
    setTimezone('utc');
    setDistinct(false);
    setAggregations([]);
    setJoins([]);
    setUseIncrements(false);
    setIncrementsUnit('minute');
    setIncrementsInterval(1);
    setIncrementsDateColumn('');
  };

  const addAggregation = () => {
    const newAgg = {
      id: Date.now(),
      column: selectedColumns[0] || '',
      function: 'COUNT',
      alias: ''
    };
    setAggregations([...aggregations, newAgg]);
  };

  const removeAggregation = (id) => {
    console.log('Removing aggregation with id:', id);
    console.log('Current aggregations:', aggregations);
    setAggregations(aggregations.filter(agg => agg.id !== id));
  };

  const updateAggregation = (id, field, value) => {
    setAggregations(aggregations.map(agg => 
      agg.id === id ? { ...agg, [field]: value } : agg
    ));
  };

  const addJoin = () => {
    const newJoin = {
      id: Date.now(),
      type: 'INNER',
      table: '',
      condition: ''
    };
    setJoins([...joins, newJoin]);
  };

  const removeJoin = (id) => {
    console.log('Removing join with id:', id);
    console.log('Current joins:', joins);
    setJoins(joins.filter(join => join.id !== id));
  };

  const updateJoin = (id, field, value) => {
    setJoins(joins.map(join => 
      join.id === id ? { ...join, [field]: value } : join
    ));
  };

  return (
    <div className="sql-query-generator">
      <h2>AnyLog Query Generator</h2>
      <p><strong>Connected Node:</strong> {node}</p>
      {/* <p className="query-description">
        Build AnyLog SQL queries with the format: <code>run client () sql [dbms] [options] "[SELECT statement]"</code>
      </p> */}

      <div className="query-builder-container">
        {/* Database and Table Selection */}
        <div className="selection-panel">
          <div className="selection-group">
            <label>Database:</label>
            <select 
              value={selectedDatabase} 
              onChange={(e) => setSelectedDatabase(e.target.value)}
              disabled={loading}
            >
              <option value="">Select Database</option>
              {databases.map((db, index) => (
                <option key={index} value={db.database_name || db.name}>
                  {db.database_name || db.name}
                </option>
              ))}
            </select>
          </div>

          <div className="selection-group">
            <label>Table:</label>
            <select 
              value={selectedTable} 
              onChange={(e) => setSelectedTable(e.target.value)}
              disabled={!selectedDatabase || loading}
            >
              <option value="">Select Table</option>
              {tables.map((table, index) => (
                <option key={index} value={table.table_name || table.name}>
                  {table.table_name || table.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Column Selection */}
        {selectedTable && (
          <div className="columns-panel">
            <div className="columns-header">
              <h3>Columns</h3>
              <div className="column-actions">
                <button onClick={handleSelectAllColumns} className="btn-secondary">
                  Select All
                </button>
                <button onClick={handleClearColumns} className="btn-secondary">
                  Clear All
                </button>
              </div>
            </div>
            <div className="columns-grid">
              {columns.map((column, index) => (
                <div 
                  key={index} 
                  className={`column-item ${selectedColumns.includes(column.column_name || column.name) ? 'selected' : ''}`}
                  onClick={() => handleColumnToggle(column.column_name || column.name)}
                >
                  <span className="column-name">{column.column_name || column.name}</span>
                  <span className="column-type">{column.data_type || column.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AnyLog Query Options */}
        <div className="query-options-panel">
          <h3>AnyLog Query Options</h3>
          <div className="options-grid">
            <div className="option-group">
              <label>Format:</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="json">JSON</option>
                <option value="table">Table</option>
                {/* <option value="csv">CSV</option>
                <option value="xml">XML</option> */}
              </select>
            </div>
            
            <div className="option-group">
              <label>Timezone:</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                <option value="utc">UTC</option>
                <option value="local">Local (AnyLog Node)</option>
                <option value="pt">Pacific Time</option>
                <option value="mt">Mountain Time</option>
                <option value="ct">Central Time</option>
                <option value="et">Eastern Time</option>
              </select>
            </div>
            
            {/* <div className="option-group">
              <label>
                <input
                  type="checkbox"
                  checked={distinct}
                  onChange={(e) => setDistinct(e.target.checked)}
                />
                DISTINCT
              </label>
            </div> */}
          </div>
        </div>

        {/* Time-Series Increments Function */}
        <div className="increments-panel">
          <h3>Time-Series Analysis</h3>
          <div className="increments-controls">
            <div className="option-group">
              <label>
                <input
                  type="checkbox"
                  checked={useIncrements}
                  onChange={(e) => setUseIncrements(e.target.checked)}
                />
                Use Increments Function
              </label>
            </div>
            
            {useIncrements && (
              <div className="increments-config">
                <div className="option-group">
                  <label>Date/Time Column:</label>
                  <select 
                    value={incrementsDateColumn} 
                    onChange={(e) => setIncrementsDateColumn(e.target.value)}
                    disabled={!selectedTable}
                  >
                    <option value="">Select Date Column</option>
                    {columns
                      .filter(col => {
                        const type = (col.data_type || col.type || '').toLowerCase();
                        return type.includes('date') || type.includes('time') || type.includes('timestamp');
                      })
                      .map((col, index) => (
                        <option key={index} value={col.column_name || col.name}>
                          {col.column_name || col.name} ({col.data_type || col.type})
                        </option>
                      ))}
                  </select>
                </div>
                
                <div className="option-group">
                  <label>Time Unit:</label>
                  <select value={incrementsUnit} onChange={(e) => setIncrementsUnit(e.target.value)}>
                    <option value="second">Second</option>
                    <option value="minute">Minute</option>
                    <option value="hour">Hour</option>
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>
                
                <div className="option-group">
                  <label>Interval:</label>
                  <input
                    type="number"
                    value={incrementsInterval}
                    onChange={(e) => setIncrementsInterval(parseInt(e.target.value) || 1)}
                    placeholder="e.g., 5"
                    min="1"
                  />
                </div>
                
                <div className="increments-info">
                  <p><strong>Function:</strong> <code>increments({incrementsDateColumn || 'date_column'}, {incrementsInterval}, {incrementsUnit})</code></p>
                  <p><em>Creates time buckets for time-series analysis. Example: increments(timestamp, 10, minute) creates 10-minute intervals.</em></p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Options */}
        <div className="advanced-panel">
          <button 
            className="toggle-advanced"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>
          
          {showAdvanced && (
            <div className="advanced-options">
              {/* <div className="option-group">
                <label>WHERE Clause:</label>
                <input
                  type="text"
                  value={whereClause}
                  onChange={(e) => setWhereClause(e.target.value)}
                  placeholder="e.g., status = 'active' AND created_date > '2024-01-01'"
                />
              </div>
              
              <div className="option-group">
                <label>GROUP BY:</label>
                <input
                  type="text"
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  placeholder="e.g., department, status"
                />
              </div>
              
              <div className="option-group">
                <label>ORDER BY:</label>
                <input
                  type="text"
                  value={orderBy}
                  onChange={(e) => setOrderBy(e.target.value)}
                  placeholder="e.g., created_date DESC"
                />
              </div> */}
              
              <div className="option-group">
                <label>LIMIT:</label>
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder="e.g., 100"
                  min="1"
                />
              </div>

              {/* <div className="aggregations-section">
                <div className="section-header">
                  <h4>Aggregations</h4>
                  <button onClick={addAggregation} className="btn-secondary">Add Aggregation</button>
                </div>
                {aggregations.map(agg => (
                  <div key={agg.id} className="aggregation-item">
                    <select
                      value={agg.function}
                      onChange={(e) => updateAggregation(agg.id, 'function', e.target.value)}
                    >
                      <option value="COUNT">COUNT</option>
                      <option value="SUM">SUM</option>
                      <option value="AVG">AVG</option>
                      <option value="MIN">MIN</option>
                      <option value="MAX">MAX</option>
                    </select>
                    <select
                      value={agg.column}
                      onChange={(e) => updateAggregation(agg.id, 'column', e.target.value)}
                    >
                      {selectedColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={agg.alias}
                      onChange={(e) => updateAggregation(agg.id, 'alias', e.target.value)}
                      placeholder="Alias (optional)"
                    />
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeAggregation(agg.id);
                      }} 
                      className="btn-remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="joins-section">
                <div className="section-header">
                  <h4>JOINs</h4>
                  <button onClick={addJoin} className="btn-secondary">Add JOIN</button>
                </div>
                {joins.map(join => (
                  <div key={join.id} className="join-item">
                    <select
                      value={join.type}
                      onChange={(e) => updateJoin(join.id, 'type', e.target.value)}
                    >
                      <option value="INNER">INNER JOIN</option>
                      <option value="LEFT">LEFT JOIN</option>
                      <option value="RIGHT">RIGHT JOIN</option>
                      <option value="FULL">FULL JOIN</option>
                    </select>
                    <input
                      type="text"
                      value={join.table}
                      onChange={(e) => updateJoin(join.id, 'table', e.target.value)}
                      placeholder="Table name"
                    />
                    <input
                      type="text"
                      value={join.condition}
                      onChange={(e) => updateJoin(join.id, 'condition', e.target.value)}
                      placeholder="ON condition"
                    />
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeJoin(join.id);
                      }} 
                      className="btn-remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div> */}
            </div>
          )}
        </div>

        {/* Generated Query */}
        <div className="query-panel">
          <h3>Generated AnyLog Query</h3>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Select columns and options to generate a query..."
            rows={8}
            className="query-textarea"
            readOnly
          />
          <div className="query-actions">
            <button 
              onClick={copyQuery} 
              disabled={!query.trim()}
              className="btn-primary"
            >
              Copy Query
            </button>
            <button onClick={clearQuery} className="btn-secondary">
              Clear Query
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default SqlQueryGenerator; 