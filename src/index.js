import React from 'react'
import ReactDOM from 'react-dom'
import Prompt from '@babbage/react-prompt'
import App from './App'

ReactDOM.render(
  <Prompt
    customPrompt
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
