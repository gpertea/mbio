#!/bin/bash
#this script is run through ssh from the web server with the following
#positional parameters:
# $1 : directory path (relative to /scratch0/pathology/) for the next params
# $2 : file name for the fastq(.gz) in directory $1
# $3 : file name for the pair file in directory $1 (optional)
#

base="/scratch0/pathology"
scripts="$base/www-scripts"
pre="$base/fastq-files"
outpre="$base/www-out"
cd $pre
dir="$1"
fname="$2"
if [[ -z $fname ]] || [[ ! -d $dir ]]; then
 echo "Usage: $0 dir fastq_name [pair_fastq_name]"
 echo "  dir is relative to $pre/"
 exit 1
fi

pname="$3"

if [[ ! -f "$dir/$fname" ]]; then
  echo "Error: cannot find file $pre/$dir/$fname"
  exit 1
fi

umask 0002

if [[ ! -d $outpre/$dir ]]; then
  mkdir -p $outpre/$dir
  if [[ $? -ne 0 ]] ; then
    echo "Error: could not make path $outpre/$dir"
    exit 1
  fi
fi

if [[ -n $pname ]]; then
 if [[ ! -f "$dir/$pname" ]]; then
   echo "Error: cannot find file $pre/$dir/$pname"
   exit 1
 fi
fi
## in this example we are running fqtrim on the given fastq files
## this script is currently single-task oriented, so the process ID
## will be written into: $pre/$fname.pid
## (in the future this could be expanded to include the job name, 
## e.g. a fqtrim job could write $pre/$fpath.fqtrim.pid

fparams="$dir/$fname"
if [[ -n $pname ]]; then
 fparams="$dir/$fname,$dir/$pname"
fi
pidFile="$dir/$fname.pid"
logFile="$outpre/$dir/$fname.runlog"

exec > $logFile 2>&1

### job starting, update the status to 'r' (running)
$scripts/update_status.pl $dir $fname r now $pname
if [[ $? -ne 0 ]]; then
 echo "Error updating running status!"
 exit 1
fi
### store the process ID
echo $$ > $pidFile
fqtrim --outdir="$outpre/$dir" -V -o trim.fq.gz -r "$outpre/$dir/$fname.fqtrim.report" $fparams
runstatus=$?
rm $pidFile
rstatus='.'
if [[ $runstatus -ne 0 ]] ; then
 ### problem detected
 rstatus='!'
 ### in this case it could be useful to allow checking the www-out/$logFile 
 ### from the web interface
fi

### job terminated, update the status
$scripts/update_status.pl $dir $fname $rstatus now $pname
if [[ $? -ne 0 ]]; then
 echo "Error updating final status!"
 exit 1
fi

