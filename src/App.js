/**
 * src/App.js
 * 
 * This file contains the primary business logic and UI code for the Postboard 
 * application.
 */
import React, { useState, useEffect } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import {
  AppBar, Toolbar, List, ListItem, ListItemText, ListItemIcon, Checkbox, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions, TextField,
  Button, Fab, LinearProgress, Typography, IconButton
} from '@mui/material'
import { makeStyles } from '@mui/styles'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import GitHubIcon from '@mui/icons-material/GitHub'
import pushdrop from 'pushdrop'
import {
  decrypt, encrypt, createAction, getTransactionOutputs, getPublicKey
} from '@babbage/sdk'
import { Authrite } from 'authrite-js'
import PacketPay from '@packetpay/js'

// This is the namespace address for the ToDo protocol
// You can create your own Bitcoin address to use, and customize this protocol
// for your own needs.
const POSTBOARD_PREFIX = 'postboard'

const POST = {
  protocol: 0,
  post: 1
}

// These are some basic styling rules for the React application.
// This app uses React (https://reactjs.org) for its user interface.
// We are also using MUI (https://mui.com) for buttons and dialogs.
// This stylesheet uses a language called JSS.
const useStyles = makeStyles({
  app_bar_placeholder: {
    height: '4em'
  },
  add_fab: {
    position: 'fixed',
    right: '1em',
    bottom: '1em',
    zIndex: 10
  },
  loading_bar: {
    margin: '1em'
  },
  github_icon: {
    color: '#ffffff'
  },
  app_bar_grid: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gridGap: '1em'
  },
  no_items: {
    margin: 'auto',
    textAlign: 'center',
    marginTop: '5em'
  }
}, { name: 'App' })

const App = () => {
  // These are some state variables that control the app's interface.
  const [createOpen, setCreateOpen] = useState(false)
  const [createPost, setCreatePost] = useState('')
  const [createAmount, setCreateAmount] = useState(1000)
  const [createLoading, setCreateLoading] = useState(false)
  const [postsLoading, setPostsLoading] = useState(true)
  const [posts, setPosts] = useState([])
  const [completeOpen, setCompleteOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState({})
  const [tipLoading, setTipLoading] = useState(false)
  const classes = useStyles()

  // Creates a new Postboard token.
  // This function will run when the user clicks "OK" in the creation dialog.
  const handleCreateSubmit = async e => {
    e.preventDefault() // Stop the HTML form from reloading the page.
    try {
      // Here, we handle some basic mistakes the user might have made.
      if (!createPost) {
        toast.error('Enter a task to complete!')
        return
      }
      // Now, we start a loading bar before the encryption and heavy lifting.
      setCreateLoading(true)
    
      // Here's the part where we create the new Bitcoin token.
      // This uses a library called PushDrop, which lets you attach data 
      // payloads to Bitcoin token outputs. Then, you can redeem / unlock the 
      // tokens later.
      const bitcoinOutputScript = await pushdrop.create({
        fields: [ // The "fields" are the data payload to attach to the token.
          // For more info on these fields, look at the ToDo protocol document 
          // (PROTOCOL.md). Note that the PushDrop library handles the public 
          // key, signature, and OP_DROP fields automatically.
          Buffer.from(POSTBOARD_PREFIX), // Postboard protocol namespace address
          Buffer.from(createPost)    // Postboard post
        ],
        // The same "todo list" protocol and key ID can be used to sign and 
        // lock this new Bitcoin PushDrop token.
        protocolID: 'postboard',
        keyID: '1'
      })

      // Now that we have the output script for our ToDo Bitcoin token, we can 
      // add it to a Bitcoin transaction (a.k.a. "Action"), and register the 
      // new token with the blockchain. On the MetaNet, Actions are anything 
      // that a user does, and all Actions take the form of Bitcoin 
      // transactions.
      const newPostboardToken = await createAction({
        // This Bitcoin transaction ("Action" with a capital A) has one output, 
        // because it has led to the creation of a new Bitcoin token. The token 
        // that gets created represents our new ToDo list item.
        outputs: [{
          // The output amount is how much Bitcoin (measured in "satoshis") 
          // this token is worth. We use the value that the user entered in the 
          // dialog box.
          satoshis: Number(createAmount),
          // The output script for this token was created by PushDrop library, 
          // which you can see above.
          script: bitcoinOutputScript,
          // Lastly, we should describe this output for the user.
          description: 'New Postboard post'
        }],
        // Describe the Actions that your app facilitates, in the present 
        // tense, for the user's future reference.
        description: `Create a TODO task: ${createPost}`
      })

      // Notify overlay about transaction
      await new Authrite().request(
        `http://localhost:3103/submit`,
        {
          method: 'POST',
          body: {
            ...newPostboardToken,
            topics: ['Postboard']
          }
        }
      )

      // Now, we just let the user know the good news! Their token has been 
      // created, and added to the list.
      toast.dark('Post successfully created!')
      setPosts(originalPosts => ([
        {
          post: createPost,
          sats: Number(createAmount),
          token: {
            ...newPostboardToken,
            lockingScript: bitcoinOutputScript,
            outputIndex: 0
          }
        },
        ...originalPosts
      ]))
      setCreatePost('')
      setCreateAmount(1000)
      setCreateOpen(false)
    } catch (e) {
      // Any errors are shown on the screen and printed in the developer console
      toast.error(e.message)
      console.error(e)
    } finally {
      setCreateLoading(false)
    }
  }

  // Redeems the ToDo toeken, marking the selected task as completed.
  // This function runs when the user clicks the "complete" button on the 
  // completion dialog.
  const handleCompleteSubmit = async e => {
    e.preventDefault() // Stop the HTML form from reloading the page.
    try {
      // Start a loading bar to let the user know we're working on it.
      setTipLoading(true)

      // Here, we're using the PushDrop library to unlcok / redeem the PushDrop 
      // token that was previously created. By providing this information, 
      // PushDrop can "unlock" and spend the token. When the token gets spent, 
      // the user gets their bitcoins back, and the ToDo token is removed from 
      // the list.
      const unlockingScript = await pushdrop.redeem({
        // To unlock the token, we need to use the same "todo list" protocolID 
        // and keyID as when we created the ToDo token before. Otherwise, the 
        // key won't fit the lock and the Bitcoins won't come out.
        protocolID: 'todo list',
        keyID: '1',
        // We're telling PushDrop which previous transaction and output we want 
        // to unlock, so that the correct unlocking puzzle can be prepared.
        prevTxId: selectedPost.token.txid,
        outputIndex: selectedPost.token.outputIndex,
        // We also give PushDrop a copy of the locking puzzle ("script") that 
        // we want to open, which is helpful in preparing to unlock it.
        lockingScript: selectedPost.token.lockingScript,
        // Finally, the amount of Bitcoins we are expecting to unlock when the 
        // puzzle gets solved.
        outputAmount: selectedPost.sats
      })

      // Now, we're going to use the unlocking puzle that PushDrop has prepared 
      // for us, so that the user can get their Bitcoins back.This is another 
      // "Action", which is just a Bitcoin transaction.
      await createAction({
        // Let the user know what's going on, and why they're getting some 
        // Bitcoins back.
        description: `Complete a TODO task: "${selectedPost.task}"`,
        inputs: { // These are inputs, which unlock Bitcoin tokens.
          // The input comes from the previous ToDo token, which we're now 
          // completing, redeeming and spending.
          [selectedPost.token.txid]: {
            ...selectedPost.token,
            // The output we want to redeem is specified here, and we also give 
            // the unlocking puzzle ("script") from PushDrop.
            outputsToRedeem: [{
              index: selectedPost.token.outputIndex,
              unlockingScript,
              // Spending descriptions tell the user why this input was redeemed
              spendingDescription: 'Complete a ToDo list item'
            }]
          }
        }
      })
      // Finally, we let the user know about the good news, and that their  
      // completed ToDo token has been removed from their list! The satoshis 
      // have now been unlocked, and are back in their posession.
      toast.dark('Congrats! Task complete🎉')
      setPosts(oldTasks => {
        oldTasks.splice(oldTasks.findIndex(x => x === selectedPost), 1)
        return oldTasks
      })
      setSelectedPost({})
      setCompleteOpen(false)
    } catch (e) {
      toast.error(`Error completing task: ${e.message}`)
      console.error(e)
    } finally {
      setTipLoading(false)
    }
  }

  // This loads a user's existing ToDo tokens from their token basket 
  // whenever the page loads. This populates their ToDo list.
  // A basket is just a way to keep track of different kinds of Bitcoin tokens.
  useEffect(() => {
    (async () => {
      try {
        // Use Confederacy UHRP lookup service
        const response = await PacketPay(`http://localhost:3103/lookup`, {
          method: 'POST',
          body: {
            provider: 'Postboard',
            query: {}
          }
        })
        const lookupResult = JSON.parse(Buffer.from(response.body).toString('utf8'))

        // Check for any errors returned and create error to notify bugsnag.
        if (lookupResult.status && lookupResult.status === 'error') {
          const e = new Error(lookupResult.description)
          e.code = lookupResult.code || 'ERR_UNKNOWN'
          throw e
        }

        const decodedResults = []

        // Decode the Postboard token fields
          for (let i = 0; i < lookupResult.length; i++) {
            const decoded = pushdrop.decode({
                  // eslint-disable-next-line no-undef
                  script: lookupResult[i].outputScript,
                  fieldFormat: 'buffer'
                })
            decodedResults.push({
              post: decoded.fields[1].toString('utf8'),
              identityKey: decoded.lockingPublicKey,
              ...lookupResult[i]
            })
          }
        setPosts(decodedResults)
      } catch (e) {
        // Any larger errors are also handled. If these steps fail, maybe the 
        // useer didn't give our app the right permissions, and we couldn't use 
        // the "todo list" protocol.
        toast.error(`Failed to load ToDo tasks! Does the app have permission? Error: ${e.message}`)
        console.error(e)
      } finally {
        setPostsLoading(false)
      }
    })()
  }, [])

  // The rest of this file just contains some UI code. All the juicy 
  // Bitcoin - related stuff is above.

  // ----------

  // Opens the completion dialog for the selected task
  const openCompleteModal = task => () => {
    setSelectedPost(task)
    setCompleteOpen(true)
  }

  return (
    <>
      {/* This shows the user success messages and errors */}
      <ToastContainer />

      {/* here's the app title bar */}
      <AppBar>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ToDo List — Get Rewarded!
          </Typography>
          <IconButton
            size='large'
            color='inherit'
            onClick={() => {
              window.open('https://github.com/p2ppsr/todo-react', '_blank')
            }}
          >
            <GitHubIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <div className={classes.app_bar_placeholder} />

      {/* Here's the plus button that hangs out at the bottom-right */}
      <div className={classes.add_fab}>
        <Fab color='secondary' onClick={() => setCreateOpen(true)}>
          <AddIcon />
        </Fab>
      </div>

      {/* This bit shows a loading bar, or the list of tasks */}
      {postsLoading
        ? <LinearProgress className={classes.loading_bar} />
        : (
          <List>
            {posts.length === 0 && (
              <div className={classes.no_items}>
                <Typography variant='h4'>No ToDo Items</Typography>
                <Typography color='textSecondary'>
                  Use the<AddIcon color='primary' />button below to start a task
                </Typography>
              </div>
            )}
            {posts.map((x, i) => (
              <ListItem
                key={i}
                button
                onClick={openCompleteModal(x)}
              >
                <ListItemIcon><Checkbox checked={false} /></ListItemIcon>
                <ListItemText
                  primary={x.post}
                  secondary={`${x.sats} satoshis`}
                />
              </ListItem>
            ))}
          </List>
        )}

      {/* This is the dialog for creating a new task */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreateSubmit}>
          <DialogTitle>
            Create a Post
          </DialogTitle>
          <DialogContent>
            <DialogContentText paragraph>
              Enter the post you'd like to make:
            </DialogContentText>
            <TextField
              multiline rows={3} fullWidth autoFocus
              label='Task to complete'
              onChange={e => setCreatePost(e.target.value)}
              value={createPost}
            />
          </DialogContent>
          {createLoading
            ? <LinearProgress className={classes.loading_bar} />
            : (
            <DialogActions>
              <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type='submit'>OK</Button>
            </DialogActions>
          )}
        </form>
      </Dialog>

      {/* Finally, this is the dialog for completing a ToDo task */}
      <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)}>
        <form onSubmit={handleCompleteSubmit}>
          <DialogTitle>
            Complete "{selectedPost.task}"?
          </DialogTitle>
          <DialogContent>
            <DialogContentText paragraph>
              By marking this task as complete, you'll receive back your {selectedPost.sats} satoshis.
            </DialogContentText>
          </DialogContent>
          {tipLoading
            ? <LinearProgress className={classes.loading_bar} />
            : (
            <DialogActions>
              <Button onClick={() => setCompleteOpen(false)}>Cancel</Button>
              <Button type='submit'>Complete Task</Button>
            </DialogActions>
          )}
        </form>
      </Dialog>
    </>
  )
}

export default App
