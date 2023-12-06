This repo is based on the following article [Docker, Postgres, Node, Typescript Setup](https://dev.to/chandrapantachhetri/docker-postgres-node-typescript-setup-47db) article.

Note:

The `.env` file was committed for learning purposes. Do not commit it for a real project!

# PREREQUISITES:
- Initialize docker on WSL Ubuntu use following command: `sudo dockerd`

To run locally in production mode:
 - Run `docker-compose up`
 - Open browser at: `http://localhost:8080/`


For front-end client development mode with live reloading, see client README.md file.

# How to use the app
- Select how many flats should be processed.
- Click "Crawl and process flats" button.
- Wait for downloading and processing to complete,
  flats will be shown automatically when the processing is finished

