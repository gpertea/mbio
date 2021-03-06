#!/usr/bin/perl
use strict;
use Net::OpenSSH;

my $sd;
BEGIN {
  $sd=$ENV{'SCRIPT_FILENAME'};
  $sd = $sd ? substr($sd, 0, rindex($sd, '/')) : '.';
}
use lib $sd;
use minicgi;

$|=1;

my $mdir='/lion/scratch0/pathology/fastq-files';
my $outdir='/lion/scratch0/pathology/www-out';
my $ssh_scriptdir='/scratch0/pathology/www-scripts';
my $cmd=cgi_param('cmd');

#send responses back as plain text for javascript to parse
cgi_start( ctype => 'text' );
#cgi_start();

if (!$cmd) {
  print "No command has been issued!\n";
  #cgi_end(); #not needed for text output
  exit(0);
}

#### run a script or command on lion through SSH
####   cmd=run  : will start the process on lion in background and exit
####   cmd=rget : will send a command through ssh and wait for it to finish
##                returning stdout content
if ($cmd eq 'run' || $cmd eq 'rget') {
  my $dir=cgi_param('dir');
  my $file=cgi_param('file');
  #this should contain a file path relative to $mdir (dir/file)
  my $pair=cgi_param('pair'); #if set, should be the file
  my $host='gpertea@lion.welch.jhu.edu';

  my $ssh = Net::OpenSSH->new($host);
  $ssh->error and
    die "Couldn't establish SSH connection: ". $ssh->error;
  if ($cmd eq 'rget') { #special SSH execution:
     ## wait for the command to finish, return stdout
     print STDERR "Params=(".join(', ', $dir, $file, $pair).")\n";
     my @ls = $ssh->capture("ls -l /scratch0/pathology");
     $ssh->error and
       die "remote ls command failed: " . $ssh->error;
     #my ($out, $err) = $ssh->capture2("find /root");
     #$ssh->error and
     #  die "remote find command failed: " . $ssh->error;
     print STDOUT join("", @ls)."\n";
     exit(0);
  }
  else { #start running of real job
     #start a job in background and return immediately
     # (using setsid to disconnect the background process)
     # this should also update the .www-status file 
     # in the corresponding directory
     $ssh->system("setsid $ssh_scriptdir/run.sh '$dir' '$file' '$pair' > $ssh_scriptdir/run.sh.log 2>&1 &");
     sleep(3); #give time for status to be updated
     $cmd='flist';
  }
}

if ($cmd eq 'status' || $cmd eq 'flist') {
  #list read files and their status
  opendir(my $dh, $mdir) || die("Error opening directory $mdir\n");
  foreach my $d (sort readdir($dh)) {
    next if $d=~m/^\.+$/ || $d eq 'training';
    next unless -d "$mdir/$d";
    print ">$d\n";
    my %fstatus;
    if (open(STAT, "$mdir/$d/.www-status")) {
       while(<STAT>) {
         chomp;
         my @fs=split(/\t/);
         if (@fs>1) { #status code present ('r', '.' or '!')
            my $finfo=$fs[1];
            $finfo.="\t".$fs[2] if $fs[2]; #append date, if there
            $fstatus{$fs[0]}=$finfo;
            ##TODO: if ($fs[1] eq 'r') we should have a $fs[0].pid file somewhere
            ## and the PID in there *should* be of an actual running process on lion
            ## if not, this code should become '!' (error)
         }
      }
    }
    opendir(my $sdh, "$mdir/$d") || die("Error opening sample dir $mdir/$d");
    
    foreach (sort readdir($sdh)) {
      next if m/^\./ || m/(done|xml|status|kraken)$/; #skip hidden or other non-fastq files
      my $ft=$fstatus{$_};
      print $_;
      print "\t$ft" if $ft; #could be status + date
      print "\n";
    }
    closedir($sdh);
  }
  closedir($dh);
  
  exit(0);
}

if ($cmd eq 'showlog') {
  my $dir=cgi_param('dir');
  my $file=cgi_param('file');
  #this must be the same as in the run.sh file:
  my $logFile="$outdir/$dir/$file.runlog";
  if ($dir && $file && -f $logFile && open(RLOG, $logFile)) {
     while (<RLOG>) {
      print STDOUT $_;
     }
     close(RLOG);
  }
  exit(0);
}

## Display Kraken report 
if ($cmd eq 'showKreport') {
  my $dir=cgi_param('dir');
  my $file=cgi_param('file');
  #this must be the same as in the run.sh file:
  my $KreportFile="$outdir/$dir/$file.kraken_out.report";
  ## maybe print a informative message ( what is the name of the report file and for what samples a fost rulat?
  if ($dir && $file && -f $KreportFile && open(RRPT, $KreportFile)) {
     print STDOUT "kraken-report results:\n\n"; ## for $file (and its pair if any) :\n\n";
     print STDOUT `grep -w -A1 "classified" $outdir/$dir/$file.runlog` , "\n";
     print STDOUT "$dir/$file.kraken_out.report\n\n";
     while (<RRPT>) {
      print STDOUT $_;
     }
     close(RRPT);
  }
  exit(0);
}
