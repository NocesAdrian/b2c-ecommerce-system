#!/bin/bash

set -e

cd infra
podman compose up -d
cd ..
