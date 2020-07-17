import React from 'react'
import { Filters } from './rumEventsType'

export function EventFilters(filters: Filters, setFilters: React.Dispatch<React.SetStateAction<Filters>>) {
  return (
    <div className="event-filters">
      <label>
        Resources
        <input
          name="resources"
          type="checkbox"
          checked={filters.withResource}
          onChange={() => setFilters({ ...filters, withResource: !filters.withResource })}
        />
      </label>
      <label>
        Errors
        <input
          name="errors"
          type="checkbox"
          checked={filters.withError}
          onChange={() => setFilters({ ...filters, withError: !filters.withError })}
        />
      </label>
      <label>
        Actions
        <input
          name="actions"
          type="checkbox"
          checked={filters.withAction}
          onChange={() => setFilters({ ...filters, withAction: !filters.withAction })}
        />
      </label>
      <label>
        Long tasks
        <input
          name="long_tasks"
          type="checkbox"
          checked={filters.withLongTask}
          onChange={() => setFilters({ ...filters, withLongTask: !filters.withLongTask })}
        />
      </label>
    </div>
  )
}
