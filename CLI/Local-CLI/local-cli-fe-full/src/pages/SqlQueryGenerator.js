import React, { useState, useEffect } from 'react';
import { getDatabases, getTables, getColumns, sendCommand } from '../services/api';
import DataTable from '../components/DataTable';
import '../styles/SqlQueryGenerator.css';

// run client () sql opcua_demo format = table "SELECT min(value), max(value), avg(value) FROM t11 WHERE period(hour, 3, now(), timestamp)"
// implement:
// periods
// increments
// better where clause (where columns >=/==/<= value)
// better aggregators
// make exceptions for timestamps


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
  const [whereConditions, setWhereConditions] = useState([]);
  const [periods, setPeriods] = useState([]);
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

  // Execution state
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [executionError, setExecutionError] = useState(null);
  const [executionTime, setExecutionTime] = useState(null);

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
  }, [selectedColumns, whereConditions, periods, groupBy, orderBy, limit, format, timezone, distinct, aggregations, joins, useIncrements, incrementsUnit, incrementsInterval, incrementsDateColumn]);

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
    // Check if we have any content to build a query with
    const hasRegularColumns = selectedColumns.length > 0;
    const hasAggregations = aggregations.length > 0 && aggregations.some(agg => {
      if (!agg.column || !agg.function) return false;
      // For date/time columns, only MIN and MAX are valid
      if (isDateColumn(agg.column) && agg.function !== 'MIN' && agg.function !== 'MAX') return false;
      return true;
    });
    const hasPeriods = periods.length > 0 && periods.some(period => period.timeScale && period.amount && period.startValue && period.column);
    const hasIncrements = useIncrements && incrementsDateColumn;
    
    // If no columns and no aggregations, don't build a query
    if (!hasRegularColumns && !hasAggregations) {
      setQuery('');
      return;
    }

    // Check for conflicts between periods and increments
    if (hasPeriods && hasIncrements) {
      setQuery('');
      return;
    }

    // Check if increments requires aggregations
    if (hasIncrements && !hasAggregations) {
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
    
    // Build the SELECT clause with columns and aggregations
    let selectClause = '';
    
    // Add increments function if enabled
    if (hasIncrements) {
      selectClause += `increments(${incrementsUnit}, ${incrementsInterval}, ${incrementsDateColumn}), `;
      // Add min and max of the date column automatically
      selectClause += `min(${incrementsDateColumn}), max(${incrementsDateColumn})`;
    }
    
    // Add selected columns (without aggregations)
    const regularColumns = selectedColumns.filter(col => {
      // Check if this column has any aggregations
      const hasAggregation = aggregations.some(agg => agg.column === col);
      return !hasAggregation;
    });
    
    if (regularColumns.length > 0) {
      if (selectClause.length > 0) {
        selectClause += ', ';
      }
      selectClause += regularColumns.join(', ');
    }
    
    // Add aggregations as separate columns
    aggregations.forEach((agg, index) => {
      if (agg.column && agg.function) {
        // Validate that date/time columns only use MIN or MAX
        if (isDateColumn(agg.column) && agg.function !== 'MIN' && agg.function !== 'MAX') {
          return; // Skip invalid aggregations
        }
        
        // Add comma if there are previous columns
        if (selectClause.length > 0) {
          selectClause += ', ';
        }
        
        const alias = agg.alias || `${agg.function.toLowerCase()}_${agg.column}`;
        selectClause += `${agg.function}(${agg.column}) as ${alias}`;
      }
    });
    
    anylogQuery += selectClause;
    
    // Add FROM clause
    anylogQuery += ` FROM ${selectedTable}`;
    
    // Add JOIN clauses
    joins.forEach(join => {
      anylogQuery += ` ${join.type} JOIN ${join.table} ON ${join.condition}`;
    });
    
    // Add WHERE clause
    if (whereConditions.length > 0 || periods.length > 0) {
      const validConditions = whereConditions.filter(condition => 
        condition.column && condition.operator && condition.value !== undefined && condition.value !== ''
      );
      
      const validPeriods = periods.filter(period => 
        period.timeScale && period.amount && period.startValue !== undefined && period.startValue !== '' && period.column
      );
      
      const whereParts = [];
      
      // Add regular WHERE conditions
      if (validConditions.length > 0) {
        const conditionStrings = validConditions.map(condition => {
          // Handle different value types
          let value = condition.value;
          if (condition.value === 'NOW()') {
            value = 'NOW()';
          } else if (typeof condition.value === 'string' && !condition.value.startsWith('NOW()')) {
            // Quote string values unless they're functions
            value = `'${condition.value}'`;
          }
          return `${condition.column} ${condition.operator} ${value}`;
        });
        whereParts.push(...conditionStrings);
      }
      
      // Add period conditions
      if (validPeriods.length > 0) {
        const periodStrings = validPeriods.map(period => {
          let startValue = period.startValue;
          if (period.startValue === 'NOW()') {
            startValue = 'NOW()';
          } else if (typeof period.startValue === 'string' && !period.startValue.startsWith('NOW()')) {
            // Quote string values unless they're functions
            startValue = `'${period.startValue}'`;
          }
          return `period(${period.timeScale}, ${period.amount}, ${startValue}, ${period.column})`;
        });
        whereParts.push(...periodStrings);
      }
      
      if (whereParts.length > 0) {
        anylogQuery += ` WHERE ${whereParts.join(' AND ')}`;
      }
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

  const executeQuery = async () => {
    if (!query.trim()) {
      setExecutionError('No query to execute. Please build a query first.');
      return;
    }

    if (!node) {
      setExecutionError('No node connected. Please connect to a node first.');
      return;
    }

    // Basic validation for AnyLog SQL query format
    if (!query.startsWith('run client () sql')) {
      setExecutionError('Invalid query format. Query should start with "run client () sql"');
      return;
    }

    setExecuting(true);
    setExecutionError(null);
    setExecutionResult(null);
    setExecutionTime(null);

    try {
      console.log('Executing query:', query);
      const startTime = Date.now();
      
      const result = await sendCommand({
        connectInfo: node,
        method: 'GET',
        command: query
      });

      const endTime = Date.now();
      const executionTimeMs = endTime - startTime;
      
      console.log('Query execution result:', result);
      setExecutionResult(result);
      setExecutionError(null);
      setExecutionTime(executionTimeMs);
    } catch (err) {
      console.error('Query execution error:', err);
      setExecutionError(`Execution failed: ${err.message}`);
      setExecutionResult(null);
      setExecutionTime(null);
    } finally {
      setExecuting(false);
    }
  };

  const clearQuery = () => {
    setSelectedDatabase('');
    setSelectedTable('');
    setSelectedColumns([]);
    setQuery('');
    setWhereClause('');
    setWhereConditions([]);
    setPeriods([]);
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
    setExecutionResult(null);
    setExecutionError(null);
  };

  const clearResults = () => {
    setExecutionResult(null);
    setExecutionError(null);
    setExecutionTime(null);
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
    setAggregations(aggregations.map(agg => {
      if (agg.id === id) {
        const updatedAgg = { ...agg, [field]: value };
        
        // If updating the column and it's a date/time column, ensure function is valid
        if (field === 'column' && isDateColumn(value)) {
          if (updatedAgg.function !== 'MIN' && updatedAgg.function !== 'MAX') {
            updatedAgg.function = 'MIN'; // Default to MIN for date/time columns
          }
        }
        
        return updatedAgg;
      }
      return agg;
    }));
  };

  const getAggregationPreview = (agg) => {
    if (!agg.column || !agg.function) return '';
    const alias = agg.alias || `${agg.function.toLowerCase()}_${agg.column}`;
    return `${agg.function}(${agg.column}) as ${alias}`;
  };

  const addWhereCondition = () => {
    const newCondition = {
      id: Date.now(),
      column: '',
      operator: '=',
      value: ''
    };
    setWhereConditions([...whereConditions, newCondition]);
  };

  const removeWhereCondition = (id) => {
    setWhereConditions(whereConditions.filter(condition => condition.id !== id));
  };

  const updateWhereCondition = (id, field, value) => {
    setWhereConditions(whereConditions.map(condition => 
      condition.id === id ? { ...condition, [field]: value } : condition
    ));
  };

  const setNowValue = (id) => {
    updateWhereCondition(id, 'value', 'NOW()');
  };

  const isDateColumn = (columnName) => {
    const column = columns.find(col => (col.column_name || col.name) === columnName);
    if (!column) return false;
    const type = (column.data_type || column.type || '').toLowerCase();
    return type.includes('date') || type.includes('time') || type.includes('timestamp');
  };

  const addPeriod = () => {
    const newPeriod = {
      id: Date.now(),
      timeScale: 'hour',
      amount: 1,
      startValue: 'NOW()',
      column: ''
    };
    setPeriods([...periods, newPeriod]);
  };

  const removePeriod = (id) => {
    setPeriods(periods.filter(period => period.id !== id));
  };

  const updatePeriod = (id, field, value) => {
    setPeriods(periods.map(period => 
      period.id === id ? { ...period, [field]: value } : period
    ));
  };

  const setPeriodNowValue = (id) => {
    updatePeriod(id, 'startValue', 'NOW()');
  };

  const getPeriodPreview = (period) => {
    if (!period.timeScale || !period.amount || !period.startValue || !period.column) return '';
    let startValue = period.startValue;
    if (period.startValue === 'NOW()') {
      startValue = 'NOW()';
    } else if (typeof period.startValue === 'string' && !period.startValue.startsWith('NOW()')) {
      startValue = `'${period.startValue}'`;
    }
    return `period(${period.timeScale}, ${period.amount}, ${startValue}, ${period.column})`;
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
                  disabled={periods.length > 0}
                />
                Use Increments Function
                {periods.length > 0 && (
                  <span className="conflict-warning"> (Cannot use with periods)</span>
                )}
              </label>
            </div>
            
            {useIncrements && (
              <div className="increments-config">
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
                
                <div className="increments-info">
                  <p><strong>Function:</strong> <code>increments({incrementsUnit || 'minute'}, {incrementsInterval}, {incrementsDateColumn || 'date_column'})</code></p>
                  <p><em>Creates time buckets for time-series analysis. Automatically adds min() and max() of the selected date column.</em></p>
                  {useIncrements && aggregations.length === 0 && (
                    <p className="warning-message">
                      <strong>⚠️ Warning:</strong> Increments requires at least one aggregated column. Please add an aggregation above.
                    </p>
                  )}
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
              <div className="where-section">
                <div className="section-header">
                  <h4>WHERE Conditions</h4>
                  <button onClick={addWhereCondition} className="btn-secondary">Add Condition</button>
                </div>
                <p className="section-description">
                  Add filtering conditions to your query. Multiple conditions are combined with AND.
                </p>
                {whereConditions.map(condition => (
                  <div key={condition.id} className="where-condition-item">
                    <div className="controls-row">
                      <select
                        value={condition.column}
                        onChange={(e) => updateWhereCondition(condition.id, 'column', e.target.value)}
                      >
                        <option value="">Select Column</option>
                        {columns.map(col => (
                          <option key={col.column_name || col.name} value={col.column_name || col.name}>
                            {col.column_name || col.name} ({col.data_type || col.type})
                          </option>
                        ))}
                      </select>
                      <select
                        value={condition.operator}
                        onChange={(e) => updateWhereCondition(condition.id, 'operator', e.target.value)}
                      >
                        <option value="=">=</option>
                        <option value="!=">!=</option>
                        <option value=">">{'>'}</option>
                        <option value=">=">{'>='}</option>
                        <option value="<">{'<'}</option>
                        <option value="<=">{'<='}</option>
                        <option value="LIKE">LIKE</option>
                        <option value="IN">IN</option>
                      </select>
                      <div className="value-input-group">
                        <input
                          type="text"
                          value={condition.value}
                          onChange={(e) => updateWhereCondition(condition.id, 'value', e.target.value)}
                          placeholder="Enter value"
                        />
                        {isDateColumn(condition.column) && (
                          <button
                            type="button"
                            onClick={() => setNowValue(condition.id)}
                            className="btn-now"
                            title="Set to NOW()"
                          >
                            NOW()
                          </button>
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeWhereCondition(condition.id);
                        }} 
                        className="btn-remove"
                      >
                        ×
                      </button>
                    </div>
                    {condition.column && condition.operator && condition.value && (
                      <div className="where-preview">
                        <code>{condition.column} {condition.operator} {condition.value === 'NOW()' ? 'NOW()' : `'${condition.value}'`}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="periods-section">
                <div className="section-header">
                  <h4>Period Conditions</h4>
                  <button onClick={addPeriod} className="btn-secondary" disabled={useIncrements}>Add Period</button>
                </div>
                <p className="section-description">
                  Add period conditions for time-based filtering. Periods are combined with WHERE conditions using AND.
                  {useIncrements && (
                    <span className="conflict-warning"> Cannot use with increments function.</span>
                  )}
                </p>
                {periods.map(period => (
                  <div key={period.id} className="period-item">
                    <div className="controls-row">
                      <select
                        value={period.timeScale}
                        onChange={(e) => updatePeriod(period.id, 'timeScale', e.target.value)}
                      >
                        <option value="second">Second</option>
                        <option value="minute">Minute</option>
                        <option value="hour">Hour</option>
                        <option value="day">Day</option>
                        <option value="week">Week</option>
                        <option value="month">Month</option>
                        <option value="year">Year</option>
                      </select>
                      <input
                        type="number"
                        value={period.amount}
                        onChange={(e) => updatePeriod(period.id, 'amount', parseInt(e.target.value) || 1)}
                        placeholder="Amount"
                        min="1"
                        style={{ maxWidth: '100px' }}
                      />
                      <div className="value-input-group">
                        <input
                          type="text"
                          value={period.startValue}
                          onChange={(e) => updatePeriod(period.id, 'startValue', e.target.value)}
                          placeholder="Start value (e.g., NOW(), '2024-01-01')"
                        />
                        <button
                          type="button"
                          onClick={() => setPeriodNowValue(period.id)}
                          className="btn-now"
                          title="Set to NOW()"
                        >
                          NOW()
                        </button>
                      </div>
                      <select
                        value={period.column}
                        onChange={(e) => updatePeriod(period.id, 'column', e.target.value)}
                      >
                        <option value="">Select Date Column</option>
                        {columns
                          .filter(col => isDateColumn(col.column_name || col.name))
                          .map(col => (
                            <option key={col.column_name || col.name} value={col.column_name || col.name}>
                              {col.column_name || col.name} ({col.data_type || col.type})
                            </option>
                          ))}
                      </select>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removePeriod(period.id);
                        }} 
                        className="btn-remove"
                      >
                        ×
                      </button>
                    </div>
                    {period.timeScale && period.amount && period.startValue && period.column && (
                      <div className="period-preview">
                        <code>{getPeriodPreview(period)}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
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

              <div className="aggregations-section">
                <div className="section-header">
                  <h4>Aggregations (Additional Columns)</h4>
                  <button onClick={addAggregation} className="btn-secondary">Add Aggregation</button>
                </div>
                <p className="section-description">
                  Add aggregation functions as separate columns. You can have multiple aggregations on the same column (e.g., min(timestamp), max(timestamp)).
                </p>
                {aggregations.map(agg => (
                  <div key={agg.id} className="aggregation-item">
                    <div className="controls-row">
                      <select
                        value={agg.function}
                        onChange={(e) => updateAggregation(agg.id, 'function', e.target.value)}
                      >
                        {isDateColumn(agg.column) ? (
                          <>
                            <option value="MIN">MIN (Date/Time)</option>
                            <option value="MAX">MAX (Date/Time)</option>
                          </>
                        ) : (
                          <>
                            <option value="COUNT">COUNT</option>
                            <option value="SUM">SUM</option>
                            <option value="AVG">AVG</option>
                            <option value="MIN">MIN</option>
                            <option value="MAX">MAX</option>
                          </>
                        )}
                      </select>
                      <select
                        value={agg.column}
                        onChange={(e) => updateAggregation(agg.id, 'column', e.target.value)}
                      >
                        <option value="">Select Column</option>
                        {columns.map(col => (
                          <option key={col.column_name || col.name} value={col.column_name || col.name}>
                            {col.column_name || col.name} ({col.data_type || col.type})
                          </option>
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
                    {agg.column && agg.function && (
                      <div className="aggregation-preview">
                        <code>{getAggregationPreview(agg)}</code>
                        {isDateColumn(agg.column) && agg.function !== 'MIN' && agg.function !== 'MAX' && (
                          <div className="warning-message">
                            <strong>⚠️ Warning:</strong> Date/time columns only support MIN and MAX functions.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* <div className="joins-section">
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
            <button 
              onClick={executeQuery} 
              disabled={!query.trim() || executing}
              className="btn-execute"
            >
              {executing ? (
                <>
                  <span className="spinner">⏳</span> Executing...
                </>
              ) : (
                'Execute Query'
              )}
            </button>
            <button onClick={clearQuery} className="btn-secondary">
              Clear Query
            </button>
          </div>
        </div>

        {/* Execution Results */}
        {executionError && (
          <div className="execution-error">
            <h3>Execution Error</h3>
            <div className="error-content">
              <strong>Error:</strong> {executionError}
            </div>
          </div>
        )}

        {executionResult && (
          <div className="execution-results">
            <h3>Query Results</h3>
            {executionTime && (
              <p className="execution-time">
                <strong>Execution Time:</strong> {executionTime}ms
              </p>
            )}
            <div className="results-content">
              {executionResult.type === 'table' && (
                <div className="table-results">
                  <p><strong>Type:</strong> Table Data</p>
                  <p><strong>Rows:</strong> {executionResult.data ? executionResult.data.length : 0}</p>
                  {executionResult.data && executionResult.data.length > 0 && executionResult.data[0] && (
                    <p><strong>Columns:</strong> {Object.keys(executionResult.data[0]).length}</p>
                  )}
                  {executionResult.data && executionResult.data.length > 0 && executionResult.data[0] ? (
                    <div className="table-container">
                      <DataTable data={executionResult.data} />
                    </div>
                  ) : (
                    <div className="no-data-message">
                      <p>No data returned from query.</p>
                    </div>
                  )}
                </div>
              )}
              {executionResult.type === 'json' && (
                <div className="json-results">
                  <p><strong>Type:</strong> JSON Response</p>
                  <pre className="results-json">
                    {JSON.stringify(executionResult.data, null, 2)}
                  </pre>
                </div>
              )}
              {executionResult.type === 'blobs' && (
                <div className="blob-results">
                  <p><strong>Type:</strong> Blob Data</p>
                  <p><strong>Blobs:</strong> {executionResult.data ? executionResult.data.length : 0}</p>
                  <pre className="results-json">
                    {JSON.stringify(executionResult.data, null, 2)}
                  </pre>
                </div>
              )}
              {!executionResult.type && (
                <div className="string-results">
                  <p><strong>Type:</strong> String Response</p>
                  <pre className="results-text">
                    {executionResult.data}
                  </pre>
                </div>
              )}
            </div>
            <div className="results-actions">
              <button onClick={clearResults} className="btn-secondary">
                Clear Results
              </button>
            </div>
          </div>
        )}

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