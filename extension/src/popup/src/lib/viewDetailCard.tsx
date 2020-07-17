import React, { useState, useCallback, useContext } from 'react';
import Card from 'react-bootstrap/Card';
import Accordion from 'react-bootstrap/Accordion';
import Table from 'react-bootstrap/Table';

import { ViewDetail } from './rumEventsType'

import AccordionContext from 'react-bootstrap/AccordionContext';

import angleDown from '../angle-down.svg';
import angleRight from '../angle-right.svg';

interface ViewDetailCardProps {
    viewDetail: ViewDetail;
}

const step = 5;
const formatDate = (date: number)  => new Date(date).toLocaleTimeString();

export const ViewDetailCard = ({ viewDetail }: ViewDetailCardProps)  => {
    const currentEventKey = useContext(AccordionContext);

    return (
        <Card className="App-view-card">
            <Accordion.Toggle as={Card.Header} eventKey={viewDetail.id} className="App-view-card-header">
            <img src={!currentEventKey || currentEventKey !== viewDetail.id ? angleRight : angleDown} className="App-view-card-header-icon" alt="logo" /> {viewDetail.description} - {formatDate(viewDetail.date)}
            </Accordion.Toggle>
            <Accordion.Collapse eventKey={viewDetail.id}>
                <Card.Body className="App-view-card-body">
                    <ViewDetailExpanded viewDetail={viewDetail} />
                </Card.Body>
            </Accordion.Collapse>
        </Card>
    )
}

const ViewDetailExpanded = ({ viewDetail }: ViewDetailCardProps) => {
    const [limit, setLimit] = useState(step)
    const displayedEvents  = viewDetail.events ? viewDetail.events.slice(0, limit) : []

    const seeMore = useCallback(() => {
        setLimit(limit + step)
    }, [limit])

    return (
        <>
            <Table striped bordered hover variant="dark">
                <thead>
                    <tr>
                        <th>Child event</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    {displayedEvents.map((event: any) => {
                        return (
                            <tr>
                                <td>
                                    <div style={{ display: "flex"}}>
                                        <p style={{backgroundColor: event.color, minWidth: "5px", width: "5px", borderRadius: "10px", height: "30px", marginRight: "10px"}} />
                                        <p>{event.description.substring(0, 100)}</p>
                                    </div>
                                </td>
                                <td>{formatDate(event.date)}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </Table>

            {viewDetail.events && viewDetail.events.length > limit && <p style={{ display: "flex", justifyContent: "center", fontStyle: "italic", cursor: "pointer" }} onClick={seeMore}>see more</p>}
        </>
    )
}
