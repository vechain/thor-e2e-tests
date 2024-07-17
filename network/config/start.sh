#!/bin/sh

if [ -z "$MASTER_KEY" ]; then
  echo "MASTER_KEY is not set"
  exit 1
fi

echo "$MASTER_KEY" > /tmp/master.key
echo "$MASTER_KEY" > /tmp/p2p.key

AUTHORITY_NODE_1=$(ping -c 1 authority-node-1 | awk -F'[()]' '/PING/{print $2}')
#AUTHORITY_NODE_2=$(ping -c 1 authority-node-2 | awk -F'[()]' '/PING/{print $2}')
#AUTHORITY_NODE_3=$(ping -c 1 authority-node-3 | awk -F'[()]' '/PING/{print $2}')

#thor \
#  --config-dir=/tmp \
#  --network /node/config/genesis.json \
#  --api-addr="0.0.0.0:8669" \
#  --api-cors="*" \
#  --bootnode "enode://e32e5960781ce0b43d8c2952eeea4b95e286b1bb5f8c1f0c9f09983ba7141d2fdd7dfbec798aefb30dcd8c3b9b7cda8e9a94396a0192bfa54ab285c2cec515ab@$BOOTNODE_IP:55555"


thor \
  --config-dir=/tmp \
  --network /node/config/genesis.json \
  --api-addr="0.0.0.0:8669" \
  --api-cors="*" \
  --allowed-peers=enode://cc5319f0300ce776d6995be7b19be25cd81b0bcd42e64ca9fc77345d2d0e7e682a66556e942d6d1244f0c5e78ce77bbd509010f263680c66503285416a9759db@$AUTHORITY_NODE_1:11235
