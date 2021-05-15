"""
server.py - Serving Notes'n'Todos frontend and web API using gunicorn and bottle

MIT license - see LICENSE file in Notes'n'Todos project root

Gunicorn is used in a slightly unusual way here because of the NoteCollection 
object which must stay alive and represent the state of the notebook, thus:

- Exactly one instance of NoteCollection must exist for each notebook

- When the gunicorn worker eventually restarts (it will happen at some point!), 
the NoteCollection must be able to gracefully stop and correctly reload.

To achieve this, gunicorn is run with just one worker and callback hooks for 
creation and exit of workers. The single worker does use multiple gthreads, thus
a lock is used to make sure NoteCollection is only called single threaded.

Inotify, through DirWatcher, is used for monitoring the files in the notes folder,
making the NoteCollection automatically reload in case of direct changes to the 
files.

Copyright (c) 2021 - Lars Ole Pontoppidan <contact@larsee.com>
"""

import threading
from bottle import Bottle, request, response, redirect, static_file
from .notes import Note, NoteCollection
from .dirwatcher import DirWatcher

def serveRootRedirect(app, base_prefix, redirect_to):
    # base_prefix must be "/" or "/base/"
    @app.route(base_prefix)
    @app.route(base_prefix[:-1])
    def redirectTo():
        redirect(redirect_to)
    
def serveNoteCollection(app, prefix, frontend_path, note_col, note_col_lock):
    # prefix must be "/" or "/notebook/" or "/base/notebook/"
    if prefix != "/":
        # If  URL requests not /, and with
        @app.route(prefix[:-1])
        def redirectNoSlash():
            redirect(prefix)

    @app.route(prefix)
    def getIndex():
        return static_file("index.html", root=frontend_path)

    @app.route(prefix + '<filename>')
    def getFile(filename):
        return static_file(filename, root=frontend_path)

    @app.get(prefix + "api/gettags")
    def getNotes():
        with note_col_lock:
            tags = note_col.getAllTags()
        return {"tags" : tags}

    @app.get(prefix + "api/getnotes")
    def getNotes():
        if len(request.query.tags) > 0:
            tagsSet = set(request.query.tags.split(","))
        else:
            tagsSet = None
        src = request.query.src == '1'
        html = request.query.html == '1'
        todos = request.query.todos == '1'
        notes_list = []
        with note_col_lock:
            notes = note_col.getNotes(tagsSet)
            for note in notes:
                notes_list.append(note.getNoteObj(src=src, html=html, todos=todos))
        return {"notes" : notes_list}

    @app.get(prefix + "api/getnote")
    def getNote():
        src = request.query.src == '1'
        html = request.query.html == '1'
        todos = request.query.todos == '1'
        with note_col_lock:
            note = note_col.findFromFullname(request.query.fullname)
            if note:
                ret = {"note" : note.getNoteObj(src=src, html=html, todos=todos)}
            else:
                ret = None
        if ret:
            return ret
        else:
            response.status = 404
            return "Note not found"

    @app.post(prefix + "api/savenotes")
    def saveNotes():
        try:
            notes = request.json
            add_list = []
            # Start by parsing all the notes to add, so we catch an error early
            for n in notes:
                note = Note.Parse(n.get("src"))
                replace = n.get("replace")
                add_list.append((note, replace))
            
            with note_col_lock:
                for note, replace in add_list:
                    note_col.addNote(note, replace)

            return {"status":"ok"}
            
        except Exception as e:
            response.status = 400
            return str(e)

    @app.post(prefix + "api/previewnote")
    def previewNote():
        try:
            note = request.json
            # Just parsing the note does not affect the state of the note collection,
            # no need to take the lock:
            n = Note.Parse(note.get("src"))
            if n is None:
                raise ValueError("Note is empty. Saving an empty note will delete it.")
            return {"status":"ok", "note" : n.getNoteObj(html=True,todos=True)}
        except Exception as e:
            response.status = 400
            return str(e)

def setupDirWatcher(notes_path, note_col, note_col_lock):
    # Setup a dir watcher to reload note collection when files in notes_path change
    def dirChanged(changes):
        # We don't really care about what changed, just reload everything
        # (while holding the note collection lock!)
        with note_col_lock:
            notes = note_col.loadAll()
        print("Notes dir: %s changed, reloaded: %d notes" % (notes_path, notes))
        
    dw = DirWatcher(notes_path[:-1], 3, dirChanged)

    # Ignore changes to files the note collection is about to change itself
    def ignoreFileChange(filename):
        dw.addIgnore(filename, 3)

    note_col.setPreFileChangeCallback(ignoreFileChange)

    return dw

# --- Custom Gunicorn app ---

import gunicorn.app.base

class CustomUnicornApp(gunicorn.app.base.BaseApplication):
    """ 
    This gunicorn app class provides create and exit callbacks for worker exit
    and creation, and runs gunicorn with a single worker and multiple gthreads
    """
    def __init__(self, create_app_callback, exit_app_callback, host_port):
        self._configBind = host_port
        self._createAppCallback = create_app_callback
        self._exitAppCallback = exit_app_callback
        super().__init__()

    @staticmethod
    def exitWorker(arbiter, worker):
        # worker.app provides us with a reference to "self", and we can call the 
        # exit callback with the object created by the createAppCallback:
        self = worker.app
        self._exitAppCallback(self._createdApp)

    def load_config(self):
        self.cfg.set("bind", self._configBind)
        self.cfg.set("worker_class", "gthread")
        self.cfg.set("workers", 1)
        self.cfg.set("threads", 4)
        self.cfg.set("worker_exit", CustomUnicornApp.exitWorker)
        # self.cfg.set("max_requests", 30) # Try this to test correct reloading of workers
        
    def load(self):
        # This function is invoked when a worker is booted
        self._createdApp = self._createAppCallback()
        return self._createdApp

# ---

def ensureNoSlash(s):
    if s.endswith("/"):
        raise ValueError("Path: '%s' must not end with /" % s)
    return s

def start(frontend_path, host_port, notes_root, base_prefix = "/", books = ""):
    """Start the notes'n'todos server, hosting both frontend and API

    frontend_path   Specifies path of frontend files
    host_port       Example: "127.0.0.1:8001" to serve on local host port 8001
    notes_root      Root path of note files
    base_prefix     URL base prefix
    books           Comma seperated names of notebooks or "" if serving only one notebook

    If serving multiple notebooks, multiple note collections are started where the 
    notebook name is added to the notes_root file path and to the URL
    """

    frontend_path = ensureNoSlash(frontend_path) + "/"
    notes_root = ensureNoSlash(notes_root)
    if not ":" in host_port:
        raise ValueError("host_port must include :")

    def createApp():
        bottle_app = Bottle()
        bottle_app.dirWatchers = []
        first = True
        for prefix in books.split(","):
            # In case of a single notebook, we will get here once with prefix=""
            full_prefix = base_prefix if prefix == "" else base_prefix + prefix + "/"

            if first and len(prefix) > 0:
                print("Making redirect from %s to %s" % (base_prefix, full_prefix))
                serveRootRedirect(bottle_app, base_prefix, full_prefix)
                first = False

            notes_path = notes_root + "/" if prefix == "" else notes_root + "/" + prefix + "/"
            print("Starting note collection in path: %s with URL prefix: %s" % (notes_path, full_prefix))
            note_col = NoteCollection(notes_path)
            print("Loaded: %d notes" % note_col.loadAll())
            lock = threading.Lock()
            dw = setupDirWatcher(notes_path, note_col, lock)
            bottle_app.dirWatchers.append(dw)
            serveNoteCollection(bottle_app, full_prefix, frontend_path, note_col, lock)
            
        return bottle_app

    def exitApp(bottle_app):
        # Stopping first, then joining is a lot faster in case of many note collections
        for dw in bottle_app.dirWatchers:
            dw.stop()
        for dw in bottle_app.dirWatchers:
            dw.join()

    CustomUnicornApp(createApp, exitApp, host_port).run()



def _testCustomUnicornApp():
    import time
    import multiprocessing

    def testProcess():
        global context
        context = {}

        def create():
            global context
            context['create_called'] = True
            my_app = Bottle()
            my_app.specialValue = 123
            return my_app

        def exit(my_app):
            global context
            assert(my_app.specialValue == 123)
            context['exit_called'] = True

        CustomUnicornApp(create, exit, ":8765").run()
        
        assert(context['create_called'])
        assert(context['exit_called'])

    process = multiprocessing.Process(target=testProcess)
    process.start()

    # Kill the test process after a few seconds
    time.sleep(2)
    process.terminate()
    process.join()

    # Assert errors in the sub process will not abort parent process, 
    # user must check output to make sure test passed
    
    print("Test passed if gunicorn started and shut down without errors")
    
    
def testsRun():
    _testCustomUnicornApp()
