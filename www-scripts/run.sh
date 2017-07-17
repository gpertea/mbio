#!/bin/bash
#this script is run through ssh from the web server with the following
#positional parameters:
# $1 : relative file path (fastq(.gz) file to process)
# $2 : relative file path to the pair file (optional)
#
# input file paths are all relative to /scratch0/pathology/

#--
pre='/scratch0/pathology/fastq-files'
cd $pre
fpath="$1"
ppath="$2"
if [[ -z $fpath ]]; then
 echo "Usage: $0 fastq_path [pair_fastq_path]"
 echo "  File paths are relative to $pre/"
 exit 1
fi

if [[ ! -f $fpath ]]; then
  echo "Error: cannot find file $pre/$fpath"
  exit 1
fi

