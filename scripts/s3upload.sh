#!/bin/bash

aws s3 sync . s3://smartathome.co.uk/smartlife/ --exclude ".git*" --exclude "scripts/*" --exclude "images/*"
