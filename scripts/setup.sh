#!/bin/bash

set -e

cd "$(dirname "$0")/.."
cp -n infra/.env.example infra/.env
scripts/on.sh