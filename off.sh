#!/bin/bash

set -e

cd infra
podman compose down
cd ..
