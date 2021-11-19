import { Table } from 'bumbag'
import React from 'react'
import { sendAction } from '../actions'
import { useStore } from '../useStore'

export function LogsConfigTab() {
  const [{ local }] = useStore()
  sendAction('getConfig', 'logs')
  const currentTabStore = local[chrome.devtools.inspectedWindow.tabId]
  return (
    currentTabStore?.logsConfig ? (
      <Table isStriped>
        <Table.Head>
          <Table.Row>
            <Table.HeadCell>Attribute</Table.HeadCell>
            <Table.HeadCell>Value</Table.HeadCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {Object.entries(currentTabStore.logsConfig).map((entry) => (
            <Table.Row>
              <Table.Cell>{entry[0]}</Table.Cell>
              <Table.Cell>{JSON.stringify(entry[1])}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    ) : null
  )
}
