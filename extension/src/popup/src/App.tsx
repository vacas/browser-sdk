import React, { useState, useEffect, useCallback } from 'react';
import logo from './bits48.png';
import './App.css';
import Accordion from 'react-bootstrap/Accordion';
import { EventFilters } from './lib/eventFilters'


import { Filters, ViewDetail } from './lib/rumEventsType'
import { ViewDetailCard } from './lib/viewDetailCard'

const backgroundPageConnection = chrome.runtime.connect({ name: 'name' });

export default function App() {
  const [viewDetails, setViewDetail] = useState<ViewDetail[]>([]);

  const listener = useCallback((request) => {
    switch (request.type) {
      case 'viewDetails':
        setViewDetail(request.payload as ViewDetail[])
        break;
      default:
        break;
    }
  }, []);


  useEffect(() => {
    backgroundPageConnection.onMessage.addListener(listener);
    backgroundPageConnection.postMessage({ type: 'init' });

    const autoRefreshInterval = setInterval(() => {
      backgroundPageConnection.postMessage({ type: 'refreshViewDetails' });
    }, 1000)

    return () => {
      clearInterval(autoRefreshInterval)
      backgroundPageConnection.onMessage.removeListener(listener)
    }
  }, [listener])

  const [filters, setFilters] = useState<Filters>({
    withAction: true,
    withError: true,
    withLongTask: true,
    withResource: true,
  })

  const filteredViewDetails = filter(viewDetails, filters)

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        {EventFilters(filters, setFilters)}
        {filteredViewDetails &&
          <Accordion className="App-view-accordion">
            {filteredViewDetails.map((viewDetail: ViewDetail) => {
              return (<ViewDetailCard key={viewDetail.id} viewDetail={viewDetail} />);

            })}
          </Accordion>
        }
        <p>Refreshing every 1s</p>
      </header>
    </div>
  );
}

function filter(viewDetails: ViewDetail[], filters: Filters) {
  const allowedTypes: string[] = []
  filters.withAction && allowedTypes.push('user_action')
  filters.withError && allowedTypes.push('error')
  filters.withLongTask && allowedTypes.push('long_task')
  filters.withResource && allowedTypes.push('resource')
  return viewDetails.map(viewDetail => ({
    ...viewDetail,
    events: viewDetail.events.filter(event => allowedTypes.indexOf(event.event.evt.category) !== -1)
  }))
}
