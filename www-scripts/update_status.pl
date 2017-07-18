#!/usr/bin/perl
use Fcntl ':flock';
use strict;
my $pre='/scratch0/pathology/fastq-files';

my $statfile='.www-status';
my $usage = q{ Update the .www-status file in the given directory.
Usage:
  update_status.pl <dir> <fname>[ <status> <run_date> <fpair>]
  
  <dir> is relative to $pre
  <status> can be 'r', '!' or '.'
  <run_date> should be 'MM/DD/YYYY HH:MM' format, or 'now'
  
};

umask 0002;
my $dir=shift(@ARGV); #relative to $pre
die("$usage Error: no target directory specified") unless $dir;

my $file=shift(@ARGV);
die("$usage Error: no target file specified") unless $file;
my $fstatus=shift(@ARGV);
die("$usage Error: no status update specified") unless $fstatus;
my $fdate=shift(@ARGV);
#this could be missing or 'now' if this script should write the current date
#or empty, '-' or '.' to ignore it (not store in .www-status either)
my $fpair=shift(@ARGV); 

die("Error: file $pre/$dir/$file not found!\n") unless -f "$pre/$dir/$file";

#the pair file used for the run (status 'r' and '.')
my @flist; #file entries already in the status file
my %fdata; #existing file data
my $isUpdate; #if the file already in status file, this is an update
my $updateExisting=(-f "$pre/$dir/$statfile");
if ($updateExisting) {
  open(my $fh, "$pre/$dir/$statfile") 
    || die("Error opening $pre/$dir/$statfile for reading!\n");
  flock($fh, LOCK_SH);
  while(<$fh>) {
    chomp;
    my @fd=split(/\t/);
    my $fn=shift(@fd);
    if (@fd) { #status code present ('r', '.' or '!')
       my $fstat=shift(@fd);
       my $fdta=$fstat;
       $fdta.="\t".join("\t",@fd) if @fd;
       $fdata{$fn}=$fdta;
       push(@flist, $fn);
       $isUpdate=1 if $fn eq $file;
       ##TODO: if ($fs[1] eq 'r') we should have a $fs[0].pid file somewhere
       ## and the PID in there *should* be of an actual running process on lion
       ## if not, this code should become '!' (error)
    }
  }
 close($fh);
}

push (@flist, $file) unless $isUpdate;

$fdate=getNow() if ($fdate eq 'now');

my @wd=($fstatus);
$fdate='-' if $fpair && !$fdate;
push(@wd, $fdate) if $fdate || $fpair;
push(@wd, $fpair) if $fpair;
$fdata{$file}=join("\t", @wd);
## file locking so we don't have 2 processes writing at the same time
my $wh;
if ($updateExisting) {
  open($wh, "+<$pre/$dir/$statfile") || die ("Error opening for write: $pre/$dir/$statfile\n");
}
else {
  open($wh, ">$pre/$dir/$statfile") || die ("Error creating: $pre/$dir/$statfile\n");
}
flock($wh, LOCK_EX);
if ($updateExisting) {
  #lock acquired, now we can finally truncate/rewrite the whole file
  seek($wh, 0, 0); truncate($wh, 0);
}
foreach my $fname (@flist) {
  my $fd=$fdata{$fname};
  print $wh "$fname\t$fd\n";
}
close($wh);
#-------------

sub getNow {
 my ($ss, $mm, $hh, $mday, $mon, $year, $wday, $yday, $isdst)=localtime();
 return sprintf( "%02d/%02d/%d %02d:%02d",
   $mon+1, $mday, $year+1900, $hh, $mm );
}
