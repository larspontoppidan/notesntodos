#!/bin/bash

echo This script cleans, builds release and builds docker
echo
if [ "$#" -ne 1 ]; then
    echo "Usage $0 <image-name>"
    exit
fi

npm run clean

npm run build-release

sudo docker build --rm -t $1 .

