import React, { useState, useEffect } from 'react'
import { Select, Space } from '@arco-design/web-react'
import { IconCalendar } from '@arco-design/web-react/icon'
import { getAvailableDates } from '../api'

interface DateSelectorProps {
    selectedDate: string | null
    onDateChange: (date: string) => void
}

const DateSelector: React.FC<DateSelectorProps> = ({ selectedDate, onDateChange }) => {
    const [dates, setDates] = useState<string[]>([])

    useEffect(() => {
        loadDates()
    }, [])

    const loadDates = async (): Promise<void> => {
        try {
            const availableDates = await getAvailableDates()
            setDates(availableDates)
        } catch (error) {
            console.error('加载可用日期失败:', error)
        }
    }

    return (
        <div className="date-selector-arco">
            <Space>
                <IconCalendar style={{ color: 'var(--text-muted)' }} />
                <Select
                    placeholder="选择日期"
                    style={{ width: 140 }}
                    value={selectedDate || ''}
                    onChange={(val) => onDateChange(val)}
                    size="small"
                    bordered={false}
                    triggerProps={{
                        autoAlignPopupWidth: false,
                        position: 'bl',
                    }}
                    className="date-select-arco"
                >
                    <Select.Option value="">最新日期</Select.Option>
                    {dates.map(date => (
                        <Select.Option key={date} value={date}>
                            {date}
                        </Select.Option>
                    ))}
                </Select>
            </Space>
        </div>
    )
}

export default DateSelector
