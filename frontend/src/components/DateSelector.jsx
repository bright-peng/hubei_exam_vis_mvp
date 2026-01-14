import React, { useState, useEffect } from 'react';
import { getAvailableDates } from '../api';
import './DateSelector.css';

const DateSelector = ({ selectedDate, onDateChange }) => {
  const [dates, setDates] = useState([]);

  useEffect(() => {
    loadDates();
  }, []);

  const loadDates = async () => {
    try {
      const availableDates = await getAvailableDates();
      setDates(availableDates);
      // 如果没有选中日期且有可用日期，默认不自动切换，交由父组件决定
    } catch (error) {
      console.error('加载可用日期失败:', error);
    }
  };

  return (
    <div className="date-selector-container">
      <label htmlFor="date-select">📅 查看日期：</label>
      <select 
        id="date-select"
        className="date-select-dropdown"
        value={selectedDate || ''}
        onChange={(e) => onDateChange(e.target.value)}
      >
        <option value="">最新日期</option>
        {dates.map(date => (
          <option key={date} value={date}>
            {date}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DateSelector;
