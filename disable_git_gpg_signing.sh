#!/bin/bash
git config --global commit.gpgsign false
git config --local commit.gpgsign false
echo "Git GPG signing has been disabled globally and for the current repository."
