#!/usr/bin/perl
use strict;

my $sd;
BEGIN {
  $sd=$ENV{'SCRIPT_FILENAME'};
  $sd = $sd ? substr($sd, 0, rindex($sd, '/')) : '.';
}
use lib $sd;
use minicgi;

$|=1;

my $mdir='/lion/scratch0/pathology/fastq-files';
my $cmd=cgi_param('cmd');

#send responses back as plain text for javascript to parse
cgi_start( ctype => 'text' );
#cgi_start();

if (!$cmd) {
  print "No command has been issued!\n";
  #cgi_end(); #not needed for text output
  exit(0);
}

if ($cmd eq 'status' || $cmd eq 'flist') {
  #list read files and their status
  opendir(my $dh, $mdir) || die("Error opening directory $mdir\n");
  foreach my $d (sort readdir($dh)) {
    next if $d=~m/^\.+$/ || $d eq 'training';
    next unless -d "$mdir/$d";
    print ">$d\n";
    my %fstatus;
    if (open(STAT, "$mdir/$d/.status")) {
       while(<STAT>) {
         chomp;
         my @fs=split(/\t/);
         if (@fs>1) {
            $fstatus{$fs[0]}=$fs[1];
         }
      }
    }
    opendir(my $sdh, "$mdir/$d") || die("Error opening sample dir $mdir/$d");
    
    foreach (sort readdir($sdh)) {
      next if m/^\./ || m/\.(done|xml|status)$/; #skip hidden or other non-fastq files
      my $ft=$fstatus{$_};
      print $_;
      print "\t$ft" if $ft;
      print "\n";
    }
    closedir($sdh);
  }
  closedir($dh);
  
  exit(0);
}
# run a script on lion (kraken, etc.)
# scripts on lion should update the .status file in that directory
if ($cmd eq 'run') {
  my $ftarget=cgi_param('ftarget');
  #this should contain a file path relative to $mdir (dir/file)
  my $fpair=cgi_param('fpair'); #if set, should be the file
     #name of the paired file (no path at all, same path with ftarget assumed
  
  exit(0);
}