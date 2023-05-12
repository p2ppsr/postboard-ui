# Postboard — Share thoughts!

Postboard UI - Interact with a simple overlay networks demo!

A Stageline ("testnet") deployment of the master branch of this repository is at [staging-postboard.babbage.systems](https://staging-postboard.babbage.systems)

## Overview

This postboard app is a simple demo for interacting with a Confederacy overlay network.
- [Topic Manager](https://github.com/p2ppsr/postboard-topic-manager)
- [Lookup Service](https://github.com/p2ppsr/postboard-topic-manager)

## Development Instructions

Clone the repo, then run `npm i` to install packages.

To start the live development server on `localhost:8088`, run `npm run start`.

Start [Babbage Stageline](https://projectbabbage.com/docs/dev-downloads) to interact with this application.

Your changes should be reflected on-screen whenever you save in your editor, or reload.

## Postboard Protocol Document

You can find the Postboard Protocol in [PROTOCOL.md](PROTOCOL.md)

## Tools Used

This Postboard application uses various Bitcoin and web-related tools for different things:

- [**React**](https://reactjs.org) We use React to render the webpage UI for this application, and track the state of the page.
- [**MUI**](https://mui.com) We use a UI framework within React called MUI to help with page styling, text fields, buttons and dialog boxes.
- [**Bitcoin SV**](https://bitcoinsv.com) We use the Bitcoin SV blockchain to timestamp and register our posts, and we rely on *satoshis* (a measurement of Bitcoin), so that the post tokens are valuable.
- [**Babbage SDK**](https://github.com/p2ppsr/babbage-sdk) We use the Babbage SDK so that users are able to have a Bitcoin-native identity, and can create and redeem Bitcoin tokens. The SDK also allows us to easily encrypt task data for added user privacy.
- [**PushDrop**](https://github.com/p2ppsr/pushdrop) We use PushDrop to create Bitcoin tokens that follow the Postboard protocol. PushDrop makes it easier to add data payloads to tokens, while still being able to give them value and spend them.
- Confederacy
- Payment Tokenator

## License

The license for the code in this repository is the Open BSV License.
