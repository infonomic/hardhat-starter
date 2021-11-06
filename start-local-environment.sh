#!/usr/bin/env bash

echo "Compiling smart contracts"
npx hardhat compile
if [ $? -ne 0 ]; then
  echo "compilation error"
  exit 1
fi

echo "Running hardhat development node"
# set hostname to 0.0.0.0 so we can relay requests from Windows and network devices
npx hardhat node --hostname 0.0.0.0
