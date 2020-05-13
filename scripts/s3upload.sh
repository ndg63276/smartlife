#!/bin/bash

aws s3 sync . s3://smartathome.co.uk/sonoff/ --exclude ".git*" --exclude "scripts/*" --exclude "images/*"
