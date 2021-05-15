"""
start_in_docker.py - Script for starting up Notes'n'Todos server, intended to run from inside the docker

Retrieves configuration from environment variables:

- NOTEBOOKS
- BASE_URL
- NOTEBOOK_NAMES
- PLAYGROUND

The script writes vars.js with links to other notebooks and starts the server.

See 'docker-run.sh' for how to provide parameters to this script.
"""

import os
import json

def makeVarsJs(path, books, booknames, base_url):
    links = []

    if len(books) > 0:
        if len(booknames) == 0:
            booknames = books.upper()
        for col, name in zip(books.split(","), booknames.split(",")):
            links.append([base_url + col + "/", name])

    print("Writing: " + path)
    with open(path, "w") as file:
        file.write("var HEADER_LINKS=%s;\n" % json.dumps(links, separators=(',', ':')))

# Starting from docker, get config from env. variables:
base_url = os.environ.get('BASE_URL', '/')
web_path = "./web"
host_port = ":5000"
notes_root = "/notes"
books = os.environ.get('NOTEBOOKS', '')
booknames = os.environ.get('NOTEBOOK_NAMES', '')
playground = os.environ.get('PLAYGROUND', '0') == '1'

# Set up the header links
makeVarsJs(web_path + "/vars.js", books, booknames, base_url)

# Change user:group if specified
if 'GID' in os.environ:
    print("Setting GID: " + os.environ['GID'])
    os.setgid(int(os.environ['GID']))

if 'UID' in os.environ:
    print("Setting UID: " + os.environ['UID'])
    os.setuid(int(os.environ['UID']))

import notesntodos.server

def startServer():
    notesntodos.server.start(web_path, host_port, notes_root, base_url, books)

if playground:
    print("*** Starting in playground mode ***")
    book_folders = []
    for book in books.split(","):
        path = notes_root + "/" + book if len(book) > 0 else notes_root
        book_folders.append(path)

    from playground import runPlayground
    # 30 minutes clean up time
    runPlayground(book_folders, startServer, 30)
else:
    print("*** Starting in normal mode ***")
    startServer()
