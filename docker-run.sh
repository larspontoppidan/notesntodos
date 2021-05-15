#!/bin/bash

# docker-run.sh

# This script starts the notesntodos docker on a Linux platform according to the 
# configuration provided in the setup() function:

function setup() {

  # Enter the desired username here that should be used for accessing the note files
  # In this example user and group "lars" is used, please change:
  USER_UID=`id -u lars`
  USER_GID=`id -g lars`

  # NOTE: that this script must still be run with sudo in order to start the docker and
  # set up things.
  
  # Local port to serve on and base URL prefix:
  PORT=5000
  BASE_URL=/notes/

  # NOTE: a reverse proxy such as nginx MUST be put in front of this docker, for https and
  # a login digest
  
  # Name of docker image:
  IMAGE=larspontoppidan/notesntodos:latest

  # Notebook configuration

  # To setup multiple notebooks, use:
  #    setupMultiNoteBook <name for presentation> <name for URL> <path of notes>
  #    preparefolder <path of notes>
  #
  # To setup a single notebook without name, use instead: 
  #    setupSingleNoteBook <path of notes>
  #    preparefolder <path of notes>
  #
  # Preparefolder creates the folder if missing and ensures it's owned by USER_UID:USER_GID.
  # Consider skipping preparefolder in a real usage scenario.
  #
  
  # This example sets up two notebooks:
  setupMultiNoteBook "First book" "first" "/tmp/book1"
  setupMultiNoteBook "Second book" "second" "/tmp/book2"
  prepareFolder "/tmp/book1"
  prepareFolder "/tmp/book2"

  # Enable playground mode with: OTHER_ENV='-e PLAYGROUND=1'
  # Carefull! This will periodically delete files in the notebook folders
  OTHER_ENV=
}

# --- Do not change below here

SEPERATOR=""
function setupMultiNoteBook() {
  echo Setting up notebook: $1, short name: $2, mount to local folder: $3
  NOTEBOOKS="${NOTEBOOKS}${SEPERATOR}$2"
  NOTEBOOK_NAMES="${NOTEBOOK_NAMES}${SEPERATOR}$1"
  MOUNTS="${MOUNTS} -v $3:/notes/$2"
  SEPERATOR=","
}

function setupSingleNoteBook() {
  echo Setting up single notebook in folder: $1
  NOTEBOOKS=""
  NOTEBOOK_NAMES=""
  MOUNTS="-v $1:/notes"
}

function prepareFolder() {
  echo Preparing folder: $1
  mkdir -p "$1"
  chown $USER_UID:$USER_GID "$1"
}

# ----

setup

echo Starting $IMAGE serving on $HOST:$PORT$BASE_URL
echo Notebook files will be accessed with user: $USER_UID, group: $USER_GID
echo

# The host should be 127.0.0.1 to avoid exposing the port outside the local machine. 
# A reverse proxy such as nginx should be used for exposing the app.
HOST=127.0.0.1

# This is the port used internally in the docker
INTERNALPORT=5000

echo Command line:
echo docker run ${OTHER_ENV} -e "BASE_URL=${BASE_URL}" -e "NOTEBOOKS=${NOTEBOOKS}" -e "NOTEBOOK_NAMES=${NOTEBOOK_NAMES}" $MOUNTS -e UID=$USER_UID -e GID=$USER_GID -p $HOST:$PORT:$INTERNALPORT $IMAGE
echo
docker run ${OTHER_ENV} -e "BASE_URL=${BASE_URL}" -e "NOTEBOOKS=${NOTEBOOKS}" -e "NOTEBOOK_NAMES=${NOTEBOOK_NAMES}" $MOUNTS -e UID=$USER_UID -e GID=$USER_GID -p $HOST:$PORT:$INTERNALPORT $IMAGE

