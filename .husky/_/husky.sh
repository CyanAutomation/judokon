#!/bin/sh
if [ -z "$husky_skip_init" ]; then
  debug () {
    [ "$HUSKY_DEBUG" = "1" ] && echo "husky > $*"
  }
  readonly husky_skip_init=1
  [ -f ~/.huskyrc ] && . ~/.huskyrc
fi
