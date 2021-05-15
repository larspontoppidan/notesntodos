# Dockerfile - Notes'n'Todos dockerfile

FROM python:3.9-slim

WORKDIR /usr/src/app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY build/release ./web/
COPY src/backend/start_in_docker.py src/backend/playground.py ./backend/
COPY src/backend/notesntodos/*.py ./backend/notesntodos/

EXPOSE 5000

CMD [ "python", "-u", "./backend/start_in_docker.py" ]
