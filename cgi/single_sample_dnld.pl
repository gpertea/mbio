#!/usr/bin/env perl


use CGI;

my $q = CGI->new;
my $outdir='/lion/scratch0/pathology/www-out';

my $fileinfo = $q->param('raportKpath');
  print STDERR "fileINFO=$fileinfo\n" ;
 
 $fileinfo =~ s/\R//g;
 $fileinfo =~ s/\xc2//g;
 $fileinfo =~ s/\xa0//g;
 $fileinfo =~ s/^\s+//g;$fileinfo =~ s/\s+$//g;
 
 my ($dir,$file) = split(/\s+/, $fileinfo); 
 print STDERR "dir=$dir file=$file\n" ;
 
 my $Koutfile= "${outdir}/${dir}/${file}.kraken_out";
 print STDERR "$Koutfile\n";
 
 
my $buf_size = 4096;

# What if the tar.gz exists but is still open for write ? 

if (! -e "${Koutfile}.tar.gz") {
   system("tar -czf ${Koutfile}.tar.gz ${Koutfile} ${Koutfile}.report");
   die ("tar command failed: $!\n") if ( $? == -1 );
}

open( my $fh, '<', "${Koutfile}.tar.gz" )
    or die("open failed: $!");
binmode($fh);

print $q->header(
    -type    => 'application/x-gzip',
    -expires => '-1d',
    -attachment => ${file}.".kraken_out.tar.gz"
);

binmode(STDOUT);

my $buf;
while ( read($fh, $buf, $buf_size) ) { 
	print $buf; 
}

