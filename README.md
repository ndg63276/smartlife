# Smart Life / Tuya web interface

## Instructions to run your own
1. Clone this repository
```shell
git clone https://github.com/ndg63276/smartlife.git
```
2. Enter the project folder
```shell
cd smartlife
```
3. Run the included server by
```shell
python serve.py
```
4. Navigate to http://localhost:8000 in your browser

## Instructions to run your own using docker and docker compose
Of course you will require [docker](https://docs.docker.com/get-docker/ "docker") and docker-compose setup and working first

1. Clone this repository
```shell
git clone https://github.com/ndg63276/smartlife.git
```
2. Enter the project folder
```shell
cd smartlife
```
3. Build a local docker image
```shell
docker build -t ndg63276/smartlife .
```
4. Run Your locally built docker image with docker compose
```shell
docker compose up
```
5. Navigate to http://localhost:8000 in your browser

## Known Bugs
If you use the China region, you will need a CORS-anywhere server, see https://github.com/Rob--W/cors-anywhere for help. Once you have set one up, insert the address at the top of functions.js.

## Website
This tool is available (without the CORS bug) at https://smartathome.co.uk/smartlife/

## SmartAtHome
All the tools from the SmartAtHome website are available at https://github.com/ndg63276/smartathome
