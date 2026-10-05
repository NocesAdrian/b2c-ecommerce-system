#!/bin/bash

set -e

cd infra
cp .env.example .env
./scripts/on.sh