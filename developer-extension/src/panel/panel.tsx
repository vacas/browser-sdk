import { Tabs } from 'bumbag'
import React from 'react'
import { ActionsTab } from './tabs/actionsTab'
import { RumConfigTab } from './tabs/rumConfigTab'
import { LogsConfigTab } from './tabs/logsConfigTab'

export function Panel() {
  return (
    <Tabs>
      <Tabs.List>
        <Tabs.Tab tabId="tab1">Actions</Tabs.Tab>
        <Tabs.Tab tabId="tab2">RUM Config</Tabs.Tab>
        <Tabs.Tab tabId="tab3">Logs Config</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel tabId="tab1" padding="major-2">
        <ActionsTab/>
      </Tabs.Panel>
      <Tabs.Panel tabId="tab2" padding="major-2">
        <RumConfigTab/>
      </Tabs.Panel>
      <Tabs.Panel tabId="tab3" padding="major-2">
        <LogsConfigTab />
      </Tabs.Panel>
    </Tabs>
  )
}
