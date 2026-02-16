import React, { useState, useEffect } from 'react';

const FilterInput = ({ filter, value, onChange, style }) => {
    if (filter.type === 'select') {
        return (
            <select
                value={value}
                onChange={(e) => onChange(filter.key, e.target.value)}
                style={style}
            >
                <option value="" disabled>{filter.label}</option>
                {filter.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        );
    }

    if (filter.type === 'date') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>{filter.label}</span>
                <input
                    type="date"
                    value={value}
                    onChange={(e) => onChange(filter.key, e.target.value)}
                    style={style}
                />
            </div>
        );
    }

    return (
        <input
            type={filter.type || 'text'}
            placeholder={filter.label}
            value={value}
            onChange={(e) => onChange(filter.key, e.target.value)}
            style={style}
        />
    );
};

const FilterBar = ({
    filters = [],
    activeFilters = {},
    onApply,
    onClear
}) => {
    const [localFilters, setLocalFilters] = useState(activeFilters);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        setLocalFilters(activeFilters);
    }, [activeFilters]);

    const handleChange = (key, value) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleApply = () => {
        onApply(localFilters);
    };

    const handleReset = () => {
        setLocalFilters({});
        if (onClear) onClear();
    };

    const primaryFilters = filters.filter(f => !f.group || f.group === 'primary');
    const advancedFilters = filters.filter(f => f.group === 'advanced');

    const inputStyle = {
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px',
        minWidth: '200px'
    };

    return (
        <div style={{
            padding: '15px',
            background: '#ffffff',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #e0e0e0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'end' }}>
                {primaryFilters.map(filter => (
                    <FilterInput
                        key={filter.key}
                        filter={filter}
                        value={localFilters[filter.key] || ''}
                        onChange={handleChange}
                        style={inputStyle}
                    />
                ))}

                <button
                    onClick={handleApply}
                    style={{
                        padding: '8px 20px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        height: '35px'
                    }}
                >
                    Apply
                </button>

                <button
                    onClick={handleReset}
                    style={{
                        padding: '8px 16px',
                        background: 'white',
                        color: '#666',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        height: '35px'
                    }}
                >
                    Reset
                </button>

                {advancedFilters.length > 0 && (
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#007bff',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            marginLeft: 'auto',
                            fontSize: '14px'
                        }}
                    >
                        {showAdvanced ? 'Hide Advanced' : 'Show Advanced Filters'}
                    </button>
                )}
            </div>

            {showAdvanced && advancedFilters.length > 0 && (
                <div style={{
                    marginTop: '15px',
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap',
                    paddingTop: '15px',
                    borderTop: '1px solid #f0f0f0',
                    alignItems: 'end'
                }}>
                    {advancedFilters.map(filter => (
                        <FilterInput
                            key={filter.key}
                            filter={filter}
                            value={localFilters[filter.key] || ''}
                            onChange={handleChange}
                            style={inputStyle}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default FilterBar;
