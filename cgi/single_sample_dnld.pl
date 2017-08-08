#!/usr/bin/env perl


use CGI;

my $q = CGI->new;

# Read the one param and split it in the two elements (path and file)

=begin

print $q->header(
	-type => 'application/octet-stream',
	-attachment => 'my_awesome_file'
	);


print("resultate loklenonn");

=end

=cut


# Binary files require something like this:

my $buf_size = 4096;
my $file_root = '/lion/scratch0/pathology/www-out/032217/7MMcDNA032217_S11_L001_R1_001.trim.fq.gz'; 

open( my $fh, '<', "$file_root" )
    or die("open failed: $!");
binmode($fh);

print $q->header(
    -type    => 'application/x-gzip',
    -expires => '-1d',
    -attachment => 'my_awesome_file.gz'
);

binmode(STDOUT);

my $buf;
while ( read($fh, $buf, $buf_size) ) { 
	print $buf; 
}
