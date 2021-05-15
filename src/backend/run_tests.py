"""
run_tests.py - Script for running Notes'n'Todos test cases

"""

print("Testing notesntodos.notes")
import notesntodos.notes
notesntodos.notes.testsRun()

print("Testing notesntodos.server")
import notesntodos.server
notesntodos.server.testsRun()

print("Testing notesntodos.dirwatcher")
import notesntodos.dirwatcher
notesntodos.dirwatcher.testsRun()

print("Testing complete")
