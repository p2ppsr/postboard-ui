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
  Button, Fab, LinearProgress, Typography, IconButton, Card, CardContent, CardActions
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
import { getPaymentAddress } from 'sendover'
import PaymentTokenator from 'payment-tokenator'

// This is the namespace prefix for the Postboard protocol
const POSTBOARD_PREFIX = 'postboard'

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
  const [tippingOpen, setTippingOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState({})
  const [tipAmount, setTipAmount] = useState(3301)
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
    
      const identityKey = await getPublicKey({ identityKey: true })

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
          Buffer.from(identityKey, 'hex'),
          Buffer.from(createPost)    // Postboard post
        ],
        // The same "todo list" protocol and key ID can be used to sign and 
        // lock this new Bitcoin PushDrop token.
        protocolID: 'postboard',
        keyID: '1',
        counterparty: 'anyone',
        ownedByCreator: true
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
          post: createPost
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

  const handleTipSubmit = async e => {
    e.preventDefault()
    // Create a new instance of the PaymentTokenator class
    // Optionally configure a custom peerServHost
    const tokenator = new PaymentTokenator({
        peerServHost: 'https://staging-peerserv.babbage.systems'
    })
    // Send a payment using Babbage
    await tokenator.sendPayment({
        recipient: selectedPost.identityKey,
        amount: tipAmount
    })
    toast.success('Tip sent!')
    setTippingOpen(false)
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
            // validate key linkage
            // decoded.fields[1] and decoded.lockingPublicKey
            const expected = getPaymentAddress({
              senderPrivateKey: '0000000000000000000000000000000000000000000000000000000000000001',
              recipientPublicKey: decoded.fields[1].toString('hex'),
              returnType: 'publicKey',
              invoiceNumber: '2-postboard-1'
            })
            if (expected !== decoded.lockingPublicKey) {
              continue
            }

            decodedResults.push({
              post: decoded.fields[2].toString('utf8'),
              identityKey: decoded.fields[1].toString('hex'),
            })
          }
        setPosts(decodedResults)

        const tokenator = new PaymentTokenator({
        peerServHost: 'https://staging-peerserv.babbage.systems'
        })
        const payments = await tokenator.listIncomingPayments()
        for (const payment of payments) {
          console.log('processing', payment)
          await tokenator.acceptPayment(payment)
          toast.success(`Received a ${payment.token.amount} satoshi tip!`)
        }

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
  const openTippingModal = post => () => {
    setSelectedPost(post)
    setTippingOpen(true)
  }

  return (
    <>
      {/* This shows the user success messages and errors */}
      <ToastContainer />

      {/* here's the app title bar */}
      <AppBar>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Postboard — Share thoughts!
          </Typography>
          <IconButton
            size='large'
            color='inherit'
            onClick={() => {
              window.open('https://github.com/p2ppsr/postboard-ui', '_blank')
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
                <Typography variant='h4'>No Posts</Typography>
                <Typography color='textSecondary'>
                  Use the<AddIcon color='primary' />button below to start a post
                </Typography>
              </div>
            )}
            {posts.map((x, i) => (
              <Card
                key={i}
              >
                <CardContent>
                  <Typography>{x.post}</Typography>
                </CardContent>
                <CardActions>
                  <Button onClick={openTippingModal(x)}>Tip</Button>
                </CardActions>
              </Card>
            ))}
          </List>
        )}

      {/* This is the dialog for creating a new task */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth>
        <form onSubmit={handleCreateSubmit}>
          <DialogTitle>
            Create a Post
          </DialogTitle>
          <DialogContent>
            <DialogContentText paragraph>
              Enter the post you'd like to make:
            </DialogContentText>
            <TextField
              multiline rows={5} fullWidth autoFocus
              label='Write a post'
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

      {/* Finally, this is the dialog for sending a tip to a post */}
      <Dialog open={tippingOpen} onClose={() => setTippingOpen(false)}>
        <form onSubmit={handleTipSubmit}>
          <DialogTitle>
            Send a Tip
          </DialogTitle>
          <DialogContent>
            <DialogContentText paragraph>
              Enter the amount of satoshis you'd like to reward the creator with:
            </DialogContentText>
            <TextField
              type='number'
              value={tipAmount}
              onChange={e => setTipAmount(e.target.value)}
              label='Amount (satoshis)'
            />
          </DialogContent>
          {tipLoading
            ? <LinearProgress className={classes.loading_bar} />
            : (
            <DialogActions>
              <Button onClick={() => setTippingOpen(false)}>Cancel</Button>
              <Button type='submit'>Send Tip</Button>
            </DialogActions>
          )}
        </form>
      </Dialog>
    </>
  )
}

export default App
