"""
dirwatcher.py - layer on top of inotify for watching file changes in a directory

MIT license - see LICENSE file in Notes'n'Todos project root

DirWatcher was made for Notes'n'Todos and features:

- Lazy reporting of file changes. When changes happens to the dir, some time is waited
  before reporting. The intension is to collect multiple simultaneous file operations
  into one report

- The watcher logic runs in a python thread

- A callback is called from the thread with file change reports

- Ignoring changes to certain files is supported, with timeout, such that changes made
  by the main program can be ignored

Copyright 2021 - Lars Ole Pontoppidan <contact@larsee.com>
"""

import inotify.adapters
import inotify.constants
import threading
import queue
import time

class DirWatcher:
    def __init__(self, path, report_wait_s, callback):
        self._inotify = inotify.adapters.Inotify(block_duration_s = 1.0)

        # Only care about events that change files:
        self._inotify.add_watch(path, mask=
            inotify.constants.IN_CLOSE_WRITE |
            inotify.constants.IN_MOVED_FROM |
            inotify.constants.IN_MOVED_TO |
            inotify.constants.IN_DELETE |
            inotify.constants.IN_DELETE_SELF)

        self._reportWait = report_wait_s
        self._path = path
        self._callback = callback
        
        self._stopEvent = threading.Event()
        self._ignoreQueue = queue.Queue()

        self._thread = threading.Thread(target=self._task, daemon=False)
        self._thread.start()

    def stop(self):
        self._stopEvent.set()

    def join(self):
        self._thread.join()

    def isRunning(self):
        return self._thread.is_alive()

    def addIgnore(self, filename, timeout_s):
        self._ignoreQueue.put((filename, time.monotonic() + timeout_s))
    
    # Task Thread 
    # ===========

    # --- Ignore management

    def _ignoresInit(self):
        self._ignores = {} # Map from filename to timeout_seconds

    def _ignoresAdd(self, filename, timeout):
        self._ignores[filename] = timeout

    def _ignoresRemoveTimedOut(self, time_now):
        self._ignores = { filename:timeout for (filename,timeout) in self._ignores.items() 
                                             if time_now < timeout }

    def _ignoresCheck(self, filename):
        return filename in self._ignores

    # --- Registerering operations with lazy dispatch:

    def _operationInit(self):
        # A set is used here to ensure no duplicate operation+filename pairs:
        self._operations = set()
        self._operationTime = None

    def _operationAdd(self, operation, filename, time_now):
        self._operations.add(operation + "," + filename)
        self._operationTime = time_now

    def _operationsGet(self, time_threshold):
        ret = []
        if (not self._operationTime is None and
                 (time_threshold - self._operationTime) > 0):
            for op_file in self._operations:
                ret.append(tuple(op_file.split(",", 1)))
            self._operations.clear()
            self._operationTime = None
        return ret

    # --- Task

    def _task(self):
        print("DirWatcher thread for: %s starts" % self._path)

        self._operationInit()
        self._ignoresInit()

        for event in self._inotify.event_gen():
            time_now = time.monotonic()

            if event is None:
                # Check if operations are ready to be called back
                op_files = self._operationsGet(time_now - self._reportWait)
                if len(op_files) > 0:
                    self._callback(op_files)
            else:
                # Stuff is happening, now we need to make sure ignores are up to date
                while not self._ignoreQueue.empty():
                    (filename, timeout) = self._ignoreQueue.get()
                    self._ignoresAdd(filename, timeout)
                
                self._ignoresRemoveTimedOut(time_now)

                # Look at event
                (header, type_names, watch_path, filename) = event

                # print("type_names: %s filename: %s" % (type_names, filename))

                if len(filename) > 0:
                    if not self._ignoresCheck(filename):
                        for op_name in type_names:
                            self._operationAdd(op_name, filename, time_now)

            if self._stopEvent.is_set():
                break

        print("DirWatcher thread for: %s stops" % self._path)

# ----

def testsRun():
    _testIgnoreTiming()

def _testIgnoreTiming():
    import copy
    import os

    global callback_ops
    global callback_count
    callback_ops = []
    callback_count = 0

    def assert_eq(a, b):
        if a != b:
            raise AssertionError(str(a) + " != " + str(b))

    def testCallback(ops):
        global callback_ops
        global callback_count
        callback_count += 1
        callback_ops = copy.copy(ops)

    os.system("mkdir -p /tmp/dw_test")

    dw = DirWatcher('/tmp/dw_test', 3, testCallback)
    time.sleep(0.5)
    os.system("touch /tmp/dw_test/ignore.not")
    dw.addIgnore("ignore.2", 2)
    os.system("touch /tmp/dw_test/ignore.2")
    dw.addIgnore("ignore.5", 5)
    os.system("touch /tmp/dw_test/ignore.5")

    # Expect no callback after 2 secs, at least 3 seconds must pass
    time.sleep(2)
    assert_eq(callback_count, 0)

    # Now expect the ignore.not to be reported in callback
    time.sleep(2)
    assert_eq(callback_count, 1)
    assert_eq(callback_ops, [('IN_CLOSE_WRITE', 'ignore.not')])

    # Now ignore.2 should be reported
    os.system("touch /tmp/dw_test/ignore.2")
    os.system("touch /tmp/dw_test/ignore.5")
    time.sleep(2)
    assert_eq(callback_count, 1)
    time.sleep(2)
    assert_eq(callback_count, 2)
    assert_eq(callback_ops, [('IN_CLOSE_WRITE', 'ignore.2')])

    # Now ignore.2 and ignore.5 should be reported
    os.system("touch /tmp/dw_test/ignore.2")
    os.system("touch /tmp/dw_test/ignore.5")
    time.sleep(4)
    assert_eq(callback_count, 3)

    try:
        assert_eq(callback_ops, [('IN_CLOSE_WRITE', 'ignore.2'), ('IN_CLOSE_WRITE', 'ignore.5')])
    except AssertionError:
        # The files might have come in in opposite order, which is OK:
        assert_eq(callback_ops, [('IN_CLOSE_WRITE', 'ignore.5'), ('IN_CLOSE_WRITE', 'ignore.2')])

    # Check stopping works
    assert_eq(dw.isRunning(), True)
    dw.stop()
    dw.join()
    assert_eq(dw.isRunning(), False)

    # Clean up
    os.system("rm /tmp/dw_test/ignore*")
    os.system("rmdir /tmp/dw_test")

