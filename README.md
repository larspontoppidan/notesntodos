
# Notes'n'Todos

Note'n'Todos is an open source web app for managing personal notes and todos. The notes are written in markdown and have time stamps, tags and embedded todos. The back end stores the notes as plain text files on the server.

Try the playground here:

- https://lpss.dk/nnt-playground

## How to compile and run locally

Install dependencies

```text
sudo apt install python3.9-venv python3.9-dev
```

If python3.9 is not available you may add the PPA deadsnakes: `sudo add-apt-repository ppa:deadsnakes/ppa`

Pull the repository

```text
git clone https://github.com/larspontoppidan/notesntodos
cd notesntodos
```

Install, build and serve the app: (for development purposes)

```text
npm install
npm run build
npm run serve
```

Now, Notes'n'Todos should be available locally at: http://localhost:8081/notes/

If `npm` is not available, consider following installation instructions such as these: https://github.com/nodesource/distributions and the suggestions here: https://stackoverflow.com/a/55274930 - to avoid version and permission issues.

### Hints for using vscode + pylance

To make pylance understand the python imports an extra path must be added to `.vscode/settings.json`:

```json
{
    "python.analysis.extraPaths": [
        "src/backend"
    ]
}
```

## Installing the docker on a Linux based server

Pull the latest docker image:

```text
sudo docker pull larspontoppidan/notesntodos:latest
```

Create a script for starting the docker

```text
sudo nano /usr/bin/start_notesntodos
```

Now paste the contents of `docker-run.sh` from this repository into the start script. Edit the `setup()` function and set the desired configuration values.

Test that the script can start up successfully:

```text
sudo chmod +x /usr/bin/start_notesntodos
sudo /usr/bin/start_notesntodos
```

At this point the Notes'n'Todos app should be available according to the configuration. Press `Ctrl-c` to stop it.

### Nginx reverse proxy with http authentication

Note'n'Todos doesn't currently have login management, but http authentication can be used to restrict access.

Running the following will shift user to root, ask for username and password and store the digest as `/etc/notesntodos.htpasswd`

```text
sudo su
printf "`read -p Username:\ ; echo $REPLY`:`openssl passwd -apr1`\n" >> /etc/notesntodos.htpasswd
exit
```

Example server block for nginx for serving Notes'n'Todos. Adjust `server_name` and enter the correct port in the `proxy_pass` statement:

```text
server {
  server_name example.com;

  location /notes/ {
    proxy_pass http://localhost:5000;
    auth_basic            "Login";
    auth_basic_user_file  /etc/notesntodos.htpasswd;
  }

  # OBS! please enable HTTPS using your favorite method and remove the following listen 80:
  listen 80
}
```

### Automatic start using systemd

Using sudo edit the file: `/etc/systemd/system/notesntodos.service` and enter contents:

```text
[Unit]
After=network.target

[Service]
User=root
Group=root
ExecStart=/usr/bin/start_notesntodos

[Install]
WantedBy=multi-user.target
```

Check that starting, stopping and status for the service work without errors:

```text
sudo service notesntodos start
sudo service notesntodos status
sudo service notesntodos stop
sudo service notesntodos status
```

Then enable it for automatic start at boot:

```text
sudo systemctl enable notesntodos
```

## Links

- Blog post: https://larsee.com/blog/2021/05/introducing-notesntodos/
- Docker: https://hub.docker.com/repository/docker/larspontoppidan/notesntodos
