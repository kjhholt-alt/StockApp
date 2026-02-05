#!/bin/bash
python manage.py migrate
gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --log-level info
