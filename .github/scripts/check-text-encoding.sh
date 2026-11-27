#!/bin/sh
# Fail if a file tracked by Git is text that is not UTF-8 (#71). Run from
# the repository root; exit 1 lists every bad file.
#
# Windows PowerShell 5.1 writes UTF-16 with a byte order mark (Out-File, >),
# which holds NUL bytes, so Git stores the file as binary: a UTF-16
# .gitignore matched nothing in uat-automation-framework (uat#26), with no
# error anywhere. Git's own classification (git ls-files --eol: "-text" in
# the index means NUL in the content) splits the two checks:
#   - a file Git sees as text must decode as UTF-8 (iconv);
#   - a file Git sees as binary must not open with a UTF-16 byte order mark.
# Known gap: UTF-16 without a byte order mark passes as binary; telling it
# from a real binary file would take guessing.
#
# POSIX sh, git, iconv and od only: the core names no stack (ADR 0003), and
# Git Bash on Windows has all of them.

for tool in git iconv od; do
  command -v "$tool" > /dev/null || { echo "check-text-encoding: $tool not found on PATH" >&2; exit 2; }
done

# core.quotePath=false prints non-ASCII paths as they are; a path Git still
# quotes (a tab, a newline, a backslash, a double quote) is reported as not
# found below instead of being checked under the wrong name
listing=$(git -c core.quotePath=false ls-files --eol) || {
  echo "check-text-encoding: git ls-files failed; run it from the root of a git repository" >&2
  exit 2
}

status=0
report() {
  echo "$1: $2; save it as UTF-8" >&2
  status=1
}

# A here-document, not a pipe: the loop runs in this shell, so status survives
while IFS= read -r line; do
  [ -n "$line" ] || continue
  index=${line%% *}
  path=${line#*	}
  if [ -d "$path" ]; then
    continue # a submodule: its files are checked in its own repository
  elif [ ! -e "$path" ]; then
    report "$path" "not found in the working tree (a path Git quotes, or a deleted file still staged)"
  elif [ "$index" = "i/-text" ]; then
    bom=$(od -An -tx1 -N2 "$path" | tr -d ' \n')
    case $bom in
      fffe | feff) report "$path" "UTF-16 (byte order mark $bom), which Git stores as binary" ;;
    esac
  elif ! iconv -f UTF-8 -t UTF-8 "$path" > /dev/null 2>&1; then
    report "$path" "not UTF-8"
  fi
done << EOF
$listing
EOF

exit $status
