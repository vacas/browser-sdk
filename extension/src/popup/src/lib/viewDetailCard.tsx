import React from 'react';
import Card from 'react-bootstrap/Card';
import Accordion from 'react-bootstrap/Accordion';
import Table from 'react-bootstrap/Table';

import { ViewDetail } from './rumEventsType'

interface ViewDetailCardProps {
    viewDetail: ViewDetail;
}

const formatDate = (date: number)  => new Date(date).toLocaleTimeString()

export const ViewDetailCard = ({ viewDetail }: ViewDetailCardProps)  => {
    return (
        <Card className="App-view-card">
            <Accordion.Toggle as={Card.Header} eventKey={viewDetail.id} className="App-view-card-header">
                {viewDetail.description} - {formatDate(viewDetail.date)}
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
    return (
        <Table striped bordered hover variant="dark">
            <thead>
                <tr>
                    <th>Child event</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                {viewDetail && viewDetail.events && viewDetail.events.map((event: any) => {
                    return (
                        <tr>
                            <td style={{color: event.color}}>{event.description.substring(0, 100)}</td>
                            <td>{formatDate(event.date)}</td>
                        </tr>
                    )
                })}
            </tbody>
        </Table>
    )
}
