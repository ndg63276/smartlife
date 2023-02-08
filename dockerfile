FROM python:3.8-slim-buster
ADD . /app
WORKDIR /app
CMD python serve.py
EXPOSE 8000
