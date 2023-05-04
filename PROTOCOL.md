# Postboard Protocol
Write messages and share them with your friends!

## Goals
* Facilitate a simple demonstration of Confederacy overlays
* Allow people to post messages on a message board
* Allow their friends to see those messages
* Allow everyone to make sure the messages are legitimate (not forged)

## Protocol
Creating a Bitcoin output script that complies with this protocol gives the elements of that script the following meanings:

Script Element | Meaning
---------------|--------------------
0	             | `<pubkey>`
1	             | `OP_CHECKSIG`
2	             | Postboard Protocol prefix (`postboard`)
3	             | identity key of the poster (33-byte DER-encoded X coordinate)
4	             | The message that is being posted
5              | Digital signature over fields 2-4 from the field 0 public key
…              |	`OP_DROP` / `OP_2DROP` — Drop fields 2-5 from the stack
