import React, { useState, useEffect } from 'react'
import './App.css'
import { createAction, getPrimarySigningPub } from '@babbage/sdk'
import { TextField, Button, Typography } from '@material-ui/core'
import bsv from 'bsv'
import parapet from 'parapet-js'

const getNameForUserID = async userID => {
  const [result] = await parapet({
    bridge: '1Fc6HY6Ln6UTTTrjuQsk6BbopX1ZtF2XHh',
    request: {
      type: 'json-query',
      query: {
        v: 3,
        q: {
          collection: 'names',
          find: {
            _id: userID
          },
          project: {
            name: 1
          }
        }
      }
    }
  })
  if (result) {
    return result.name
  } else {
    return userID.substr(0, 7)
  }
}

function App () {
  const [postText, setPostText] = useState('')
  const [myName, setMyName] = useState('')
  const [messages, setMessages] = useState([])

  useEffect(() => {
    (async () => {
      const result = await parapet({
        bridge: '1Fc6HY6Ln6UTTTrjuQsk6BbopX1ZtF2XHh',
        request: {
          type: 'json-query',
          query: {
            v: 3,
            q: {
              collection: 'messages',
              find: {}
            }
          }
        }
      })
      setMessages(
        await Promise.all(result
          .reverse()
          .map(async x => {
            return {
              ...x,
              name: await getNameForUserID(x.userID)
            }
          }))
      )
    })()
  }, [])

  useEffect(() => {
    let socket
    (async () => {
      socket = await parapet({
        bridge: '1Fc6HY6Ln6UTTTrjuQsk6BbopX1ZtF2XHh',
        request: {
          type: 'socket',
          query: {
            v: 3,
            q: {
              find: {
                type: 'message'
              }
            }
          }
        }
      })
      socket.onmessage = async e => {
        const data = JSON.parse(e.data)
        if (data.type !== 'message') {
          return
        }
        setMessages(async oldMessages => ([
          {
            ...data.data,
            name: await getNameForUserID(data.data.userID)
          },
          ...oldMessages
        ]))
      }
    })()
    return () => {
      if (socket) {
        socket.close()
      }
    }
  }, [])

  // The function is run when we click the button
  const handleClick = async () => {
    if (!postText) {
      alert('No post text!')
      return
    }
    if (postText.length > 512) {
      alert('Postboard messages cannot exceed 512 characters!')
      return
    }

    // An HWP sender ID is calculated from the public key
    const key = await getPrimarySigningPub({
      path: 'm/1033/10'
    })
    const senderID = bsv.Address.fromPublicKey(
      bsv.HDPublicKey.fromString(key).publicKey
    ).toString()
    console.log(`Sender ID: ${senderID}`)

    const result = await createAction({
      description: 'Send a message with Ty\'s Postboard',
      keyName: 'primarySigning',
      keyPath: 'm/1033/10',
      data: [
        btoa('1Fc6HY6Ln6UTTTrjuQsk6BbopX1ZtF2XHh'),
        btoa(senderID),
        btoa('sendmsg'),
        btoa(postText)
      ],
      bridge: ['1Fc6HY6Ln6UTTTrjuQsk6BbopX1ZtF2XHh'] // TPB
    }, false)

    setPostText('')
    console.log(result)
  }

  // The function is run when we click the button
  const handleSetName = async () => {
    if (!myName) {
      alert('No name!')
      return
    }
    if (myName.length > 30) {
      alert('Postboard names cannot exceed 30 characters!')
      return
    }

    // A postboard sender ID is calculated from the public key
    const key = await getPrimarySigningPub({
      path: 'm/1033/10'
    })
    const senderID = bsv.Address.fromPublicKey(
      bsv.HDPublicKey.fromString(key).publicKey
    ).toString()
    console.log(`Sender ID: ${senderID}`)

    const result = await createAction({
      description: 'Set your name on Ty\'s Postboard',
      keyName: 'primarySigning',
      keyPath: 'm/1033/10',
      data: [
        btoa('1Fc6HY6Ln6UTTTrjuQsk6BbopX1ZtF2XHh'),
        btoa(senderID),
        btoa('setname'),
        btoa(myName)
      ],
      bridge: ['1Fc6HY6Ln6UTTTrjuQsk6BbopX1ZtF2XHh'] // TPB
    }, false)

    setPostText('')
    console.log(result)
  }

  return (
    <div className='App'>
      <header className='App-header'>
        <TextField
          value={myName}
          onChange={e => setMyName(e.target.value)}
          placeholder='Set Your Name'
        />
        <br />
        <br />
        <Button
          variant='contained'
          color='primary'
          onClick={handleSetName}
        >
          Set Your Name
        </Button>
        <br />
        <br />
        <TextField
          value={postText}
          onChange={e => setPostText(e.target.value)}
          placeholder='Write a message'
          multiline
          rows={4}
        />
        <br />
        <br />
        <Button
          variant='contained'
          color='primary'
          size='large'
          onClick={handleClick}
        >
          Send
        </Button>
        <br />
        <br />
        {messages.map((msg, i) => (
          <Typography key={i} paragraph>
            <b>{msg.name}</b>: {msg.message}
          </Typography>
        ))}
      </header>
    </div>
  )
}

export default App
