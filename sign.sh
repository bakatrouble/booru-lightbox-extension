#!/bin/bash

source .env

set -xe

pnpm sign \
    -k $AMO_KEY \
    -s $AMO_SECRET
pnpm manifest \
    -k $AMO_KEY \
    -s $AMO_SECRET
