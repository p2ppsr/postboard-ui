import React from 'react'
import ReactDOM from 'react-dom'
import Prompt from '@babbage/react-prompt'
import App from './App'

const ENV = window.location.host.includes('localhost')
  ? 'dev'
  : window.location.host.includes('staging')
    ? 'staging'
    : 'prod'

ReactDOM.render(
  <Prompt
    customPrompt
    supportedMetaNet={ENV === 'prod' ? 'mainnet' : 'testnet'}
    appName='Postboard'
    appIcon='/favicon.ico'
    author='Peer-to-peer Privacy Systems Research, LLC'
    authorUrl='https://projectbabbage.com'
    description='Share posts and tips with one anothe.'
  >
    <App />
  </Prompt>,
  document.getElementById('root')
)
