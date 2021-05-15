"""
start_dev.py - Script for starting Note'N'Todos server locally for development purposes

The script implements a couple of scenarios with fixed configuration values:

- serve: Serving just one note book 
- serve2: Serving two note books
- playground: Running Note'N'Todos in playground mode

"""

import os
import json
import sys

import notesntodos.server

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

# Starting from cmd-line, get config from argv:
base_url = "/notes/" 
web_path = sys.argv[1]
scenario = sys.argv[2]
host_port = ":8081"
notes_root = "/tmp/notesntodos"

# Scenarios:
if scenario == "serve":
    books = ""
    booknames = ""
    playground = False
elif scenario == "serve2":
    books = "book1,book2"
    booknames = "BOOK1,BOOK2"
    playground = False
elif scenario == "playground":
    books = "book1,book2"
    booknames = "Notes 1,Notes 2"
    playground = True

# ----

# Make sure folders exist
book_folders = []
for book in books.split(","):
    path = notes_root + "/" + book if len(book) > 0 else notes_root
    book_folders.append(path)
    if not os.path.isdir(path):
        print("Creating folder: " + path)
        os.makedirs(path)

# Set up the header links
makeVarsJs(web_path + "/vars.js", books, booknames, base_url)

def startServer():
    notesntodos.server.start(web_path, host_port, notes_root, base_url, books)

if playground:
    from playground import runPlayground
    # Use just 2 minutes clean up cycle time, for testing
    runPlayground(book_folders, startServer, 2)
else:
    startServer()

