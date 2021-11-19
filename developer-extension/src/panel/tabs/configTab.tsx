import { Table } from 'bumbag'
import React from 'react'
import { useStore } from '../useStore'

export function ConfigTab(props: { product: string }) {
  const [{ local }] = useStore()
  const currentTabStore = local[chrome.devtools.inspectedWindow.tabId]
  const config = props.product === 'rum' ? currentTabStore?.rumConfig : currentTabStore?.logsConfig
  return config ? (
    <Table isStriped>
      <Table.Head>
        <Table.Row>
          <Table.HeadCell>Attribute</Table.HeadCell>
          <Table.HeadCell>Value</Table.HeadCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {Object.entries(config).map((entry) => (
          <Table.Row key={entry[0]}>
            <Table.Cell>{entry[0]}</Table.Cell>
            <Table.Cell>{JSON.stringify(entry[1])}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ) : null
}
