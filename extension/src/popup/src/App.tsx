import React, { useState, useEffect, useCallback } from 'react';
import logo from './bits48.png';
import './App.css';
import Accordion from 'react-bootstrap/Accordion';


import { ViewDetail } from './lib/rumEventsType'
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

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />

        {viewDetails &&
          <Accordion className="App-view-accordion">
            {viewDetails.map((viewDetail: ViewDetail) => {
              return (<ViewDetailCard key={viewDetail.id} viewDetail={viewDetail} />);

            })}
          </Accordion>
        }
        <p>Refreshing every 1s</p>
      </header>
    </div>
  );
}
